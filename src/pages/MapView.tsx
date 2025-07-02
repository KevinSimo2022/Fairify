import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Map, Layers, Filter, Download, ZoomIn, ZoomOut, RotateCcw, RefreshCw, BarChart3, ChevronDown } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { functions, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import InteractiveMap from '@/components/InteractiveMap';
import AIAnalysis from '@/components/AIAnalysis';
import { assignDataPointsToRegions, calculateRegionalStats, annotateDataPointsWithCoverageBias, getBoundariesForCountry, detectCountryFromCoordinates, getRegionNameFromProperties } from '@/utils/spatialAnalysis';
import type { DataPoint as BaseDataPoint } from '@/utils/spatialAnalysis';

// Patch DataPoint type locally to include coverageBias for debug logging
type DataPoint = BaseDataPoint & { coverageBias?: number };

interface MapData {
  id: string;
  name: string;
  dataPoints: number;
  coverage: number;
  biasScore: number;
  giniCoefficient: number;
  context?: string[]; // Add context field
  realDataPoints?: DataPoint[]; // Add real coordinate data
  analysisResults?: {
    bias?: {
      giniCoefficient: number;
      biasScore: number;
      geographicalBias: number;
    };
    coverage?: {
      totalArea: number;
      coveredArea: number;
      coveragePercentage: number;
    };
  };
}

interface LayerState {
  dataDensity: boolean;
  coverageGaps: boolean;
  biasIndicators: boolean;
  dataPoints: boolean;
  clusterMarkers: boolean;
  outliers: boolean;
}

const MapView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();  const [mapData, setMapData] = useState<MapData[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMapData, setLoadingMapData] = useState(false);  const [layers, setLayers] = useState<LayerState>({
    dataDensity: true,
    coverageGaps: true,
    biasIndicators: false,
    dataPoints: false, // Start with heatmap mode, not individual points
    clusterMarkers: false,
    outliers: false,
  });// State for annotated data points
  const [annotatedDataPoints, setAnnotatedDataPoints] = useState<DataPoint[]>([]);// Fetch real map data for selected dataset
  const fetchMapDataForDataset = async (datasetId: string) => {
    if (!datasetId) return;
    
    setLoadingMapData(true);
    try {
      const getMapData = httpsCallable(functions, 'getMapDataForDataset');
      const result = await getMapData({ datasetId });
      const { dataPoints } = result.data as { dataPoints: any[] };
      
      // Update the selected dataset with real data points
      setSelectedDataset(prev => prev ? {
        ...prev,
        realDataPoints: dataPoints.map((point: any, index: number) => ({
          id: point.id || `point-${index}`,
          lat: point.lat,
          lng: point.lng,
          value: point.value || point.properties?.value || Math.random() * 100,
          bias: point.bias || point.properties?.bias || Math.random(),
          category: point.category || point.properties?.category || point.region || 'unknown'
        }))
      } : null);
      
      console.log('Fetched real map data:', dataPoints.length, 'points');
      
      // Log some sample data for debugging
      if (dataPoints.length > 0) {
        console.log('Sample data point:', dataPoints[0]);
        console.log('Data point structure:', {
          lat: dataPoints[0].lat,
          lng: dataPoints[0].lng,
          value: dataPoints[0].value,
          bias: dataPoints[0].bias,
          category: dataPoints[0].category
        });
      }
    } catch (error) {
      console.error('Error fetching map data for dataset:', error);
      toast({
        title: 'Error',
        description: 'Failed to load map data for selected dataset',
        variant: 'destructive',
      });
    } finally {
      setLoadingMapData(false);
    }
  };

  // Generate mock data points based on selected dataset
  const generateMockDataPoints = (dataset: MapData): DataPoint[] => {
    // First check if we have real dataPoints from the dataset
    if (dataset.realDataPoints && dataset.realDataPoints.length > 0) {
      return dataset.realDataPoints.map((point: any, index: number) => ({
        id: `${dataset.id}-point-${index}`,
        lat: point.lat,
        lng: point.lng,
        value: point.properties?.value || Math.random() * 100,
        bias: point.properties?.bias || Math.random() * dataset.biasScore,
        category: point.properties?.category || point.region || 'unknown'
      }));
    }

    // Fallback to mock data if no real coordinates available
    console.warn('No real data points available for dataset:', dataset.name);
    return [];
  };
  // Use real data points if available, otherwise generate mock data
  const currentDataPoints = useMemo(() => {
    if (selectedDataset?.realDataPoints && selectedDataset.realDataPoints.length > 0) {
      return selectedDataset.realDataPoints;
    }
    return selectedDataset ? generateMockDataPoints(selectedDataset) : [];
  }, [selectedDataset]);
  // Calculate real-time statistics from actual data points
  const calculateLiveStats = (dataPoints: DataPoint[]) => {
    if (dataPoints.length === 0) {
      return {
        avgValue: 0,
        avgBias: 0,
        giniCoefficient: 0,
        highBiasCount: 0,
        coverageScore: 0
      };
    }

    // Calculate average value and bias
    const avgValue = dataPoints.reduce((sum, p) => sum + (p.value || 0), 0) / dataPoints.length;
    const avgBias = dataPoints.reduce((sum, p) => sum + (p.bias || 0), 0) / dataPoints.length;

    // Calculate Gini coefficient based on bias values
    const biasValues = dataPoints.map(p => p.bias || 0).sort((a, b) => a - b);
    let giniSum = 0;
    const n = biasValues.length;
    const mean = avgBias;

    if (mean > 0) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          giniSum += Math.abs(biasValues[i] - biasValues[j]);
        }
      }
    }
    const giniCoefficient = mean > 0 ? giniSum / (2 * n * n * mean) : 0;

    // Count high bias points (bias > 0.6)
    const highBiasCount = dataPoints.filter(p => (p.bias || 0) > 0.6).length;

    // Improved geographical coverage calculation
    // Based on how well distributed the data points are across regions
    const lats = dataPoints.map(p => p.lat);
    const lngs = dataPoints.map(p => p.lng);
    
    if (lats.length === 0) return { avgValue, avgBias, giniCoefficient, highBiasCount, coverageScore: 0 };
    
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const lngMin = Math.min(...lngs);
    const lngMax = Math.max(...lngs);
    
    // Create a grid system to check distribution
    const gridSize = 10; // 10x10 grid
    const latStep = (latMax - latMin) / gridSize;
    const lngStep = (lngMax - lngMin) / gridSize;
    
    const occupiedCells = new Set<string>();
    
    dataPoints.forEach(point => {
      if (latStep > 0 && lngStep > 0) {
        const gridLat = Math.floor((point.lat - latMin) / latStep);
        const gridLng = Math.floor((point.lng - lngMin) / lngStep);
        occupiedCells.add(`${gridLat}-${gridLng}`);
      }
    });
    
    // Coverage score: percentage of grid cells that have data points
    const totalCells = gridSize * gridSize;
    const coverageScore = (occupiedCells.size / totalCells) * 100;

    return {
      avgValue,
      avgBias,
      giniCoefficient: Math.min(1, giniCoefficient), // Cap at 1
      highBiasCount,
      coverageScore: Math.min(100, coverageScore) // Cap at 100%
    };
  };

  const liveStats = calculateLiveStats(currentDataPoints);
  
  // Debug logging for live stats
  if (currentDataPoints.length > 0) {
    console.log('Live stats calculated:', liveStats);
    console.log('Current data points count:', currentDataPoints.length);
    console.log('Sample bias values:', currentDataPoints.slice(0, 5).map(p => p.bias));
  }

  const handlePointClick = (point: DataPoint) => {
    toast({
      title: 'Data Point Selected',
      description: `Point ${point.id} - Value: ${point.value?.toFixed(1)}, Bias: ${point.bias?.toFixed(2)}`,
    });
  };// Fetch map data from Firebase
  useEffect(() => {
    console.log('MapView useEffect - User:', user);
    if (!user || !user.id) {
      console.log('MapView useEffect - No user or user.id, user:', user);
      setLoading(false);
      return;
    }

    console.log('MapView useEffect - Setting up query for userId:', user.id);
    setLoading(true);
    
    const q = query(
      collection(db, 'datasets'),
      where('userId', '==', user.id),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('MapView onSnapshot - Query snapshot received, size:', querySnapshot.size);
      const datasets: MapData[] = [];      querySnapshot.forEach((doc) => {        console.log('MapView onSnapshot - Document data:', doc.id, doc.data());
        const data = doc.data();        const dataset = {          id: doc.id,
          name: data.fileName || data.name || 'Untitled Dataset',
          dataPoints: data.totalRows || 0,
          coverage: data.analysisResults?.coverage?.coveragePercentage || 0,
          biasScore: data.analysisResults?.bias?.biasScore || 0,
          giniCoefficient: data.analysisResults?.bias?.giniCoefficient || 0,
          context: data.context || undefined, // Add context from Firestore
          analysisResults: data.analysisResults,
          realDataPoints: [], // Will be loaded separately when dataset is selected
        };
        console.log('MapView - Processed dataset:', dataset);
        datasets.push(dataset);
      });      console.log('MapView onSnapshot - Final datasets array:', datasets);
      setMapData(datasets);
      if (datasets.length > 0 && !selectedDataset) {
        console.log('MapView onSnapshot - Setting first dataset as selected:', datasets[0]);
        setSelectedDataset(datasets[0]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching map data:', error);
      toast({
        title: 'Error',
        description: `Failed to load map data: ${error.message}`,
        variant: 'destructive',
      });
      setLoading(false);
    });    return () => unsubscribe();
  }, [user, toast]);

  // Fetch map data when dataset is selected
  useEffect(() => {
    if (selectedDataset && selectedDataset.id) {
      console.log('Fetching map data for selected dataset:', selectedDataset.id);
      fetchMapDataForDataset(selectedDataset.id);
    }  }, [selectedDataset?.id]);

  const handleDatasetSelect = (dataset: MapData) => {
    console.log('Selecting dataset:', dataset.name);
    setSelectedDataset(dataset);
  };
  const handleLayerToggle = (layer: keyof LayerState) => {
    setLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  const handleTabChange = (value: string) => {
    if (value === "heatmap") {
      // Switch to heatmap mode: enable heatmap, disable individual points
      setLayers(prev => ({
        ...prev,
        dataDensity: true,
        dataPoints: false
      }));
    } else if (value === "points") {
      // Switch to points mode: disable heatmap, enable individual points
      setLayers(prev => ({
        ...prev,
        dataDensity: false,
        dataPoints: true
      }));
    }
  };  const handleExportMap = async (format: 'json' | 'csv' | 'image' = 'json') => {
    if (!selectedDataset) {
      toast({
        title: 'No Dataset Selected',
        description: 'Please select a dataset to export',
        variant: 'destructive',
      });
      return;
    }

    if (format === 'image') {
      // Export map as image
      handleExportMapImage();
      return;
    }

    try {
      toast({
        title: 'Preparing Export',
        description: 'Generating export file...',
      });

      // Use current data points instead of calling Firebase function
      const exportData = {
        dataset: {
          id: selectedDataset.id,
          name: selectedDataset.name,
          dataPoints: selectedDataset.dataPoints,
          coverage: selectedDataset.coverage,
          biasScore: selectedDataset.biasScore,
          giniCoefficient: selectedDataset.giniCoefficient
        },
        coordinates: currentDataPoints.map(point => ({
          latitude: point.lat,
          longitude: point.lng,
          value: point.value || 0,
          bias: point.bias || 0,
          category: point.category || 'unknown'
        })),
        statistics: liveStats,
        exportedAt: new Date().toISOString(),
        exportFormat: format
      };
      
      let blob: Blob;
      let fileName: string;
      
      if (format === 'csv') {
        // Convert to CSV format
        const csvData = convertToCSV(exportData);
        blob = new Blob([csvData], { type: 'text/csv' });
        fileName = `${selectedDataset.name}_map_data.csv`;
      } else {
        // JSON format
        blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        fileName = `${selectedDataset.name}_map_data.json`;
      }
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Map data has been exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export map data',
        variant: 'destructive',
      });
    }
  };
  const handleExportMapImage = async () => {
    try {
      // Get the map container
      const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
      if (!mapContainer) {
        throw new Error('Map container not found');
      }

      toast({
        title: 'Generating Map Image',
        description: 'Please wait while we capture the map...',
      });

      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;      // Capture the map with supported settings
      const canvas = await html2canvas(mapContainer, {
        useCORS: true,
        allowTaint: true,
        background: '#ffffff',
        width: mapContainer.offsetWidth,
        height: mapContainer.offsetHeight
      });

      // Add metadata overlay to the image
      const ctx = canvas.getContext('2d');
      if (ctx && selectedDataset) {
        // Add title and metadata
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(10, 10, 300, 80);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`${selectedDataset.name}`, 20, 30);
        
        ctx.font = '12px Arial';
        ctx.fillText(`Data Points: ${selectedDataset.dataPoints}`, 20, 50);
        ctx.fillText(`Coverage: ${selectedDataset.coverage.toFixed(1)}%`, 20, 65);
        ctx.fillText(`Bias Score: ${selectedDataset.biasScore.toFixed(2)}`, 20, 80);
      }

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${selectedDataset?.name || 'map'}_visualization.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast({
            title: 'Export Successful',
            description: 'Map image has been downloaded successfully',
          });
        }
      }, 'image/png', 0.95);
    } catch (error) {
      console.error('Image export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export map image. Please try again.',
        variant: 'destructive',
      });
    }
  };
  const convertToCSV = (data: any) => {
    if (!data.coordinates || !Array.isArray(data.coordinates)) {
      return 'No coordinate data available';
    }

    // Create comprehensive CSV with dataset metadata and coordinates
    const csvLines = [];
    
    // Add metadata header
    csvLines.push('# Dataset Information');
    csvLines.push(`# Name: ${data.dataset.name}`);
    csvLines.push(`# Total Data Points: ${data.dataset.dataPoints}`);
    csvLines.push(`# Coverage: ${data.dataset.coverage.toFixed(2)}%`);
    csvLines.push(`# Bias Score: ${data.dataset.biasScore.toFixed(3)}`);
    csvLines.push(`# Gini Coefficient: ${data.dataset.giniCoefficient.toFixed(3)}`);
    csvLines.push(`# Exported: ${new Date(data.exportedAt).toLocaleString()}`);
    csvLines.push('');
    
    // Add statistics header
    csvLines.push('# Statistics');
    csvLines.push(`# Average Value: ${data.statistics.avgValue.toFixed(2)}`);
    csvLines.push(`# Average Bias: ${data.statistics.avgBias.toFixed(3)}`);
    csvLines.push(`# High Bias Count: ${data.statistics.highBiasCount}`);
    csvLines.push(`# Coverage Score: ${data.statistics.coverageScore.toFixed(1)}%`);
    csvLines.push('');
    
    // Add coordinate data header
    const headers = ['latitude', 'longitude', 'value', 'bias', 'category'];
    csvLines.push(headers.join(','));

    // Add coordinate data
    data.coordinates.forEach((point: any) => {
      const row = [
        point.latitude || '',
        point.longitude || '',
        point.value || '',
        point.bias || '',
        point.category || ''
      ];
      csvLines.push(row.join(','));
    });

    return csvLines.join('\n');
  };

  const refreshData = () => {
    setLoading(true);
    // The onSnapshot listener will automatically refresh the data
  };

  // Example: Annotate data points with coverage bias for map coloring
  useEffect(() => {
    async function annotatePoints() {
      if (!currentDataPoints.length) {
        setAnnotatedDataPoints([]);
        return;
      }
      // Detect country from coordinates
      const country = detectCountryFromCoordinates(currentDataPoints);
      console.log('Detected country for boundaries:', country);
      const boundaries = await getBoundariesForCountry(country as any);
      // Log all region names in boundaries using robust extraction
      const allRegionNames = boundaries.features.map(f => {
        // Use the same helper as region assignment
        return getRegionNameFromProperties(f.properties);
      });
      // Log the first boundary feature's properties for debugging
      if (boundaries.features.length > 0) {
        console.log('Sample boundary properties:', boundaries.features[0].properties);
      }
      console.log('All region names in boundaries:', allRegionNames);
      const pointsWithRegion = assignDataPointsToRegions(currentDataPoints, boundaries);
      // Ensure category always matches assigned region
      const pointsWithRegionAndCategory = pointsWithRegion.map(p => ({ ...p, category: p.region || 'unknown' }));
      // Debug: Log region assignment for first 10 points
      console.log('Region assignment for first 10 points:', pointsWithRegionAndCategory.slice(0, 10).map(p => ({ id: p.id, lat: p.lat, lng: p.lng, region: p.region, category: p.category })));
      // Log points with undefined region
      const undefinedRegionPoints = pointsWithRegionAndCategory.filter(p => !p.region);
      if (undefinedRegionPoints.length > 0) {
        console.warn('Points with undefined region:', undefinedRegionPoints.map(p => ({ id: p.id, lat: p.lat, lng: p.lng })));
      }
      const regionalStats = calculateRegionalStats(pointsWithRegionAndCategory, boundaries);
      // Debug: Log regional stats and populations
      console.log('Regional stats:', regionalStats.map(r => ({ region: r.regionName, pointCount: r.pointCount, population: r.population })));
      // Warn if any region has missing or zero population
      regionalStats.forEach(r => {
        if (!r.population || r.population === 0) {
          console.warn(`Region '${r.regionName}' has missing or zero population!`);
        }
      });
      // Optionally assign a fallback region or skip undefined
      // For now, just log and proceed
      const pointsWithCoverageBias = annotateDataPointsWithCoverageBias(pointsWithRegionAndCategory, regionalStats);
      // Debug: Log coverage bias for first 10 points
      console.log('Coverage bias for first 10 points:', (pointsWithCoverageBias.slice(0, 10) as any[]).map(p => ({ id: p.id, region: p.region, coverageBias: p.coverageBias })));
      setAnnotatedDataPoints(pointsWithCoverageBias);
    }
    annotatePoints();
    // Only rerun when currentDataPoints changes
  }, [currentDataPoints]);

  // --- New state for region analysis ---
  const [allRegionNames, setAllRegionNames] = useState<string[]>([]);
  const [regionsWithNoData, setRegionsWithNoData] = useState<string[]>([]);
  const [highImportanceRegions, setHighImportanceRegions] = useState<string[]>([]);

  // --- Update region analysis after boundaries/stats are loaded ---
  useEffect(() => {
    async function analyzeRegions() {
      if (!currentDataPoints.length) {
        setAllRegionNames([]);
        setRegionsWithNoData([]);
        setHighImportanceRegions([]);
        return;
      }
      const country = detectCountryFromCoordinates(currentDataPoints);
      const boundaries = await getBoundariesForCountry(country as any);
      // Extract all region names
      const allNames = boundaries.features.map(f => getRegionNameFromProperties(f.properties)).filter(Boolean) as string[];
      setAllRegionNames(allNames);
      // Calculate stats
      const regionalStats = calculateRegionalStats(assignDataPointsToRegions(currentDataPoints, boundaries), boundaries);
      // Regions with no data
      const noDataRegions = regionalStats.filter(r => r.pointCount === 0).map(r => r.regionName);
      setRegionsWithNoData(noDataRegions);
      // High research importance regions (hardcoded for now)
      let important: string[] = [];
      if (country === 'cameroon') {
        important = ['Centre', 'Littoral', 'West', 'North West', 'South West'];
      } else if (country === 'rwanda') {
        important = ['City of Kigali', 'Eastern Province', 'Southern Province', 'Northern Province', 'Western Province'];
      } else if (country === 'kenya') {
        important = ['Nairobi', 'Central', 'Rift Valley', 'Eastern', 'Coast'];
      }
      setHighImportanceRegions(important);
    }
    analyzeRegions();
  }, [currentDataPoints]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please sign in to view the map</p>
      </div>
    );
  }
  return (
    <div className="space-y-6 animate-fade-in pt-16">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-roboto font-bold text-gray-900 mb-2">Interactive Map</h1>
          <p className="text-gray-600 font-open-sans">
            Visualize data density, coverage gaps, and bias indicators
          </p>
        </div>        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!selectedDataset}>
                <Download className="h-4 w-4 mr-2" />
                Export Map
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExportMap('image')}>
                <Download className="h-4 w-4 mr-2" />
                Export Map as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportMap('json')}>
                <Download className="h-4 w-4 mr-2" />
                Export Data as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportMap('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export Data as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="bg-maphera-blue hover:bg-blue-600" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Dataset Selection */}
      {mapData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-roboto">Dataset Selection</CardTitle>
            <CardDescription className="font-open-sans">
              Choose a dataset to visualize on the map
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">              {mapData.map((dataset) => (
                <Button
                  key={dataset.id}
                  variant={selectedDataset?.id === dataset.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDatasetSelect(dataset)}
                  disabled={loadingMapData}
                  className={selectedDataset?.id === dataset.id ? "bg-maphera-blue" : ""}
                >
                  {selectedDataset?.id === dataset.id && loadingMapData ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {dataset.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="h-[600px] relative z-0">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="font-roboto">
                  {selectedDataset ? selectedDataset.name : 'Geospatial Data Visualization'}
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>            <CardContent className="h-[500px] relative overflow-hidden">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 text-maphera-blue mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600 font-open-sans">Loading map data...</p>
                  </div>
                </div>
              ) : !selectedDataset ? (
                <div className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div className="text-center">
                    <Map className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-roboto font-medium text-gray-700 mb-2">
                      No Dataset Selected
                    </h3>
                    <p className="text-gray-500 font-open-sans max-w-md">
                      Please upload a dataset or select an existing one to view the interactive map visualization.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {loadingMapData && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                      <div className="text-center">
                        <RefreshCw className="h-6 w-6 text-maphera-blue mx-auto mb-2 animate-spin" />
                        <p className="text-sm text-gray-600 font-open-sans">Loading coordinate data...</p>
                      </div>
                    </div>
                  )}
                  <InteractiveMap
                    dataPoints={annotatedDataPoints}
                    layers={layers}
                    selectedDataset={selectedDataset}
                    onPointClick={handlePointClick}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-roboto">Map Layers</CardTitle>
              <CardDescription className="font-open-sans">
                Toggle different visualization layers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="heatmap" onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                  <TabsTrigger value="points">Points</TabsTrigger>
                </TabsList>
                
                <TabsContent value="heatmap" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-open-sans">Data Density</span>
                    <input 
                      type="checkbox" 
                      checked={layers.dataDensity}
                      onChange={() => handleLayerToggle('dataDensity')}
                      className="rounded" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-open-sans">Coverage Gaps</span>
                    <input 
                      type="checkbox" 
                      checked={layers.coverageGaps}
                      onChange={() => handleLayerToggle('coverageGaps')}
                      className="rounded" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-open-sans">Bias Indicators</span>
                    <input 
                      type="checkbox" 
                      checked={layers.biasIndicators}
                      onChange={() => handleLayerToggle('biasIndicators')}
                      className="rounded" 
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="points" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-open-sans">Data Points</span>
                    <input 
                      type="checkbox" 
                      checked={layers.dataPoints}
                      onChange={() => handleLayerToggle('dataPoints')}
                      className="rounded" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-open-sans">Cluster Markers</span>
                    <input 
                      type="checkbox" 
                      checked={layers.clusterMarkers}
                      onChange={() => handleLayerToggle('clusterMarkers')}
                      className="rounded" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-open-sans">Outliers</span>
                    <input 
                      type="checkbox" 
                      checked={layers.outliers}
                      onChange={() => handleLayerToggle('outliers')}
                      className="rounded" 
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-roboto">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm font-open-sans">High Bias Areas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-open-sans">Medium Bias Areas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm font-open-sans">Low Bias Areas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-open-sans">Adequate Coverage</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                <span className="text-sm font-open-sans">Coverage Gaps</span>
              </div>
            </CardContent>
          </Card>
        </div>      </div>

      {/* Stats and AI Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">
        {/* Quick Stats */}
        <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-merriweather text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-maphera-green" />
              Quick Stats
            </CardTitle>
            <CardDescription className="font-open-sans">
              {selectedDataset ? selectedDataset.name : 'No dataset selected'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDataset ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-open-sans">Data Points</span>
                  <Badge variant="secondary" className="bg-maphera-green/10 text-maphera-green hover:bg-maphera-green/20">
                    {currentDataPoints.length > 0 ? currentDataPoints.length : selectedDataset.dataPoints}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-open-sans">Coverage</span>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                    {currentDataPoints.length > 0 
                      ? `${liveStats.coverageScore.toFixed(1)}%`
                      : selectedDataset.coverage > 0 ? `${selectedDataset.coverage.toFixed(1)}%` : 'N/A'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-open-sans">Avg Bias Score</span>
                  <Badge className={
                    (currentDataPoints.length > 0 ? liveStats.avgBias : selectedDataset.biasScore) > 0.6 
                      ? "bg-red-500" 
                      : (currentDataPoints.length > 0 ? liveStats.avgBias : selectedDataset.biasScore) > 0.4 
                      ? "bg-yellow-500" 
                      : "bg-maphera-green"
                  }>
                    {currentDataPoints.length > 0 
                      ? liveStats.avgBias.toFixed(2)
                      : selectedDataset.biasScore > 0 
                      ? selectedDataset.biasScore.toFixed(2) 
                      : 'N/A'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-open-sans">Gini Coefficient</span>
                  <Badge className={
                    (currentDataPoints.length > 0 ? liveStats.giniCoefficient : selectedDataset.giniCoefficient) > 0.5 
                      ? "bg-red-500" 
                      : (currentDataPoints.length > 0 ? liveStats.giniCoefficient : selectedDataset.giniCoefficient) > 0.3 
                      ? "bg-yellow-500" 
                      : "bg-maphera-green"
                  }>
                    {currentDataPoints.length > 0 
                      ? liveStats.giniCoefficient.toFixed(2)
                      : selectedDataset.giniCoefficient > 0 
                      ? selectedDataset.giniCoefficient.toFixed(2) 
                      : 'N/A'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-open-sans">High Bias Points</span>
                  <Badge className={
                    (currentDataPoints.length > 0 ? liveStats.highBiasCount : 0) > 0 
                      ? "bg-red-500" 
                      : "bg-maphera-green"
                  }>
                    {currentDataPoints.length > 0 
                      ? `${liveStats.highBiasCount} (${((liveStats.highBiasCount / currentDataPoints.length) * 100).toFixed(1)}%)`
                      : selectedDataset?.dataPoints 
                      ? `${Math.floor(selectedDataset.dataPoints * 0.2)} (${(20).toFixed(1)}%)`
                      : 'N/A'}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Map className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-open-sans">Select a dataset to view statistics</p>
              </div>
            )}
          </CardContent>
        </Card>        {/* AI Analysis */}
        <AIAnalysis 
          dataPoints={currentDataPoints}
          datasetName={selectedDataset?.name || 'No Dataset Selected'}
          userContext={selectedDataset?.context}
          liveStats={liveStats}
          className="lg:col-span-2"
          allRegionNames={allRegionNames}
          regionsWithNoData={regionsWithNoData}
          highImportanceRegions={highImportanceRegions}
        /></div>
    </div>
  );
};

export default MapView;
