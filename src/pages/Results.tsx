import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  Search, 
  FileText, 
  Map, 
  Calendar, 
  Eye,
  Filter,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Globe,
  Printer
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { calculateLiveStats } from '../utils/calculateLiveStats';
import { jsPDF } from 'jspdf';

interface AnalysisResult {
  id: string;
  name: string;
  type: 'CSV' | 'GeoJSON';
  uploadDate: Date;
  processedDate: Date;
  status: 'complete' | 'processing' | 'error' | 'analyzed';
  biasScore: number;
  giniCoefficient: number;
  coverageScore: number;
  dataPoints: number;
  fileSize: string;
  analysisResults?: any;
  context?: string[];
  regionData?: any[];
  mapInsights?: any;
  dashboardMetrics?: any;
}

// Helper function to calculate Gini coefficient from bias values
const calculateGiniFromValues = (values: number[]): number => {
  if (values.length === 0) return 0;
  
  const sortedValues = values.slice().sort((a, b) => a - b);
  const n = sortedValues.length;
  const mean = sortedValues.reduce((sum, val) => sum + val, 0) / n;
  
  if (mean === 0) return 0;
  
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      numerator += Math.abs(sortedValues[i] - sortedValues[j]);
    }
  }
  
  return numerator / (2 * n * n * mean);
};

// Helper function to map climate zones to actual regions (same logic as Dashboard)
const mapRegionName = (originalRegion: string, lat?: number, lng?: number, datasetName?: string): string => {
  let region = originalRegion;
  
  // Normalize region names for Kenya
  if (datasetName?.toLowerCase().includes('kenya')) {
    const lowerRegion = region.toLowerCase();
    
    // If we have generic regions like "Tropical South/North", use coordinates to determine actual Kenya region
    if (lowerRegion.includes('tropical') || lowerRegion.includes('northern') || lowerRegion.includes('southern') || region === 'unknown') {
      // Use coordinates to assign to proper Kenya regions if available
      if (lat !== undefined && lng !== undefined) {
        // Kenya coordinates: roughly between -5° to 5° latitude, 34° to 42° longitude
        if (lat >= -1.5 && lat <= -1.0 && lng >= 36.5 && lng <= 37.0) {
          region = 'Nairobi';
        } else if (lat >= -1.2 && lat <= 0.5 && lng >= 36.5 && lng <= 37.5) {
          region = 'Central';
        } else if (lat >= -4.0 && lat <= 0.0 && lng >= 37.5 && lng <= 42.0) {
          region = 'Eastern';
        } else if (lat >= -4.5 && lat <= -1.5 && lng >= 39.0 && lng <= 41.5) {
          region = 'Coast';
        } else if (lat >= -3.0 && lat <= 2.5 && lng >= 34.5 && lng <= 37.0) {
          region = 'Rift Valley';
        } else if (lat >= -1.5 && lat <= 1.5 && lng >= 33.8 && lng <= 35.5) {
          region = 'Western';
        } else if (lat >= -1.5 && lat <= 0.5 && lng >= 34.0 && lng <= 35.2) {
          region = 'Nyanza';
        } else if (lat >= 0.0 && lat <= 5.0 && lng >= 38.0 && lng <= 42.0) {
          region = 'North Eastern';
        } else {
          // Fallback to closest region based on distance
          const distanceToNairobi = Math.abs(lat + 1.25) + Math.abs(lng - 36.8);
          const distanceToCentral = Math.abs(lat + 0.5) + Math.abs(lng - 37.0);
          const distanceToEastern = Math.abs(lat + 1.5) + Math.abs(lng - 38.5);
          const distanceToCoast = Math.abs(lat + 3.0) + Math.abs(lng - 40.0);
          const distanceToRiftValley = Math.abs(lat + 0.5) + Math.abs(lng - 35.5);
          const distanceToWestern = Math.abs(lat - 0.0) + Math.abs(lng - 34.5);
          const distanceToNyanza = Math.abs(lat + 0.5) + Math.abs(lng - 34.5);
          const distanceToNorthEastern = Math.abs(lat - 2.0) + Math.abs(lng - 40.0);
          
          const minDistance = Math.min(distanceToNairobi, distanceToCentral, distanceToEastern, distanceToCoast, 
                                     distanceToRiftValley, distanceToWestern, distanceToNyanza, distanceToNorthEastern);
          
          if (minDistance === distanceToNairobi) region = 'Nairobi';
          else if (minDistance === distanceToCentral) region = 'Central';
          else if (minDistance === distanceToEastern) region = 'Eastern';
          else if (minDistance === distanceToCoast) region = 'Coast';
          else if (minDistance === distanceToRiftValley) region = 'Rift Valley';
          else if (minDistance === distanceToWestern) region = 'Western';
          else if (minDistance === distanceToNyanza) region = 'Nyanza';
          else region = 'North Eastern';
        }
      }
    } else {
      // Standard text-based normalization for known region names
      if (lowerRegion.includes('nairobi')) region = 'Nairobi';
      else if (lowerRegion.includes('central')) region = 'Central';
      else if (lowerRegion.includes('eastern')) region = 'Eastern';
      else if (lowerRegion.includes('coast')) region = 'Coast';
      else if (lowerRegion.includes('rift') || lowerRegion.includes('valley')) region = 'Rift Valley';
      else if (lowerRegion.includes('western')) region = 'Western';
      else if (lowerRegion.includes('nyanza')) region = 'Nyanza';
      else if (lowerRegion.includes('north') && lowerRegion.includes('east')) region = 'North Eastern';
    }
  }
  
  // Similar logic for Rwanda
  else if (datasetName?.toLowerCase().includes('rwanda')) {
    const lowerRegion = region.toLowerCase();
    if (lowerRegion.includes('tropical') || lowerRegion.includes('northern') || lowerRegion.includes('southern') || region === 'unknown') {
      if (lat !== undefined && lng !== undefined) {
        // Rwanda coordinates: roughly between -3° to -1° latitude, 28.8° to 31.2° longitude
        if (lng >= 29.8 && lng <= 30.2 && lat >= -2.0 && lat <= -1.8) {
          region = 'City of Kigali';
        } else if (lat >= -1.5) {
          region = 'Northern Province';
        } else if (lat <= -2.3) {
          region = 'Southern Province';
        } else if (lng >= 30.0) {
          region = 'Eastern Province';
        } else {
          region = 'Western Province';
        }
      }
    } else {
      if (lowerRegion.includes('northern') || lowerRegion.includes('north')) region = 'Northern Province';
      else if (lowerRegion.includes('western') || lowerRegion.includes('west')) region = 'Western Province';
      else if (lowerRegion.includes('eastern') || lowerRegion.includes('east')) region = 'Eastern Province';
      else if (lowerRegion.includes('southern') || lowerRegion.includes('south')) region = 'Southern Province';
      else if (lowerRegion.includes('kigali')) region = 'City of Kigali';
    }
  }
  
  // Similar logic for Cameroon
  else if (datasetName?.toLowerCase().includes('cameroon')) {
    const lowerRegion = region.toLowerCase();
    if (lowerRegion.includes('tropical') || lowerRegion.includes('northern') || lowerRegion.includes('southern') || region === 'unknown') {
      if (lat !== undefined && lng !== undefined) {
        // Cameroon coordinates: roughly between 2° to 13° latitude, 8° to 16° longitude
        if (lat >= 10.0 && lng >= 13.0) region = 'Far North';
        else if (lat >= 8.0 && lat < 10.0) region = 'North';
        else if (lat >= 6.0 && lat < 8.0) region = 'Adamawa';
        else if (lng < 11.0 && lat >= 6.0) region = 'Northwest';
        else if (lng < 11.0 && lat < 6.0) region = 'West';
        else if (lng >= 11.0 && lng < 13.0) region = 'Centre';
        else if (lat < 4.0 && lng < 10.0) region = 'Southwest';
        else if (lat < 4.0 && lng >= 10.0) region = 'South';
        else if (lat >= 4.0 && lng >= 9.0 && lng < 11.0) region = 'Littoral';
        else region = 'East';
      }
    } else {
      if (lowerRegion.includes('littoral')) region = 'Littoral';
      else if (lowerRegion.includes('centre') || lowerRegion.includes('center')) region = 'Centre';
      else if (lowerRegion.includes('east')) region = 'East';
      else if (lowerRegion.includes('north') && !lowerRegion.includes('west')) region = 'North';
      else if (lowerRegion.includes('far') && lowerRegion.includes('north')) region = 'Far North';
      else if (lowerRegion.includes('south') && !lowerRegion.includes('west')) region = 'South';
      else if (lowerRegion.includes('west') && !lowerRegion.includes('north') && !lowerRegion.includes('south')) region = 'West';
      else if (lowerRegion.includes('northwest')) region = 'Northwest';
      else if (lowerRegion.includes('southwest')) region = 'Southwest';
      else if (lowerRegion.includes('adamawa')) region = 'Adamawa';
    }
  }
  
  return region;
};

const Results: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResultId, setSelectedResultId] = useState<string>('');
  const [exportingPDF, setExportingPDF] = useState(false);
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  // Load real analysis results from Firebase
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setResults([]);
      setLoading(false);
      return;
    }

    const datasetsQuery = query(
      collection(db, 'datasets'),
      where('userId', '==', user.id),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(datasetsQuery, async (snapshot) => {
      const results: AnalysisResult[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.status === 'analyzed' || data.status === 'complete') {
          // Fetch real data points using the cloud function (like Dashboard/MapView)
          let realDataPoints: any[] = [];
          try {
            const getMapData = httpsCallable(functions, 'getMapDataForDataset');
            const result = await getMapData({ datasetId: docSnap.id });
            const dataResult = result.data as { dataPoints?: any[] };
            realDataPoints = (dataResult && dataResult.dataPoints) ? dataResult.dataPoints : [];
          } catch (err) {
            console.error('Results - Error fetching real data points for', docSnap.id, err);
            realDataPoints = [];
          }
          console.log('Results - raw realDataPoints:', realDataPoints);
          // Always map points to ensure value, bias, and category fields are present (like MapView/Dashboard)
          const mappedDataPoints = realDataPoints.map((point: any, index: number) => ({
            id: point.id || `point-${index}`,
            lat: point.lat,
            lng: point.lng,
            value: typeof point.value === 'number' && !isNaN(point.value)
              ? point.value
              : (typeof point.properties?.value === 'number' && !isNaN(point.properties.value)
                ? point.properties.value
                : Math.random() * 100),
            bias: typeof point.bias === 'number' && !isNaN(point.bias)
              ? point.bias
              : (typeof point.properties?.bias === 'number' && !isNaN(point.properties.bias)
                ? point.properties.bias
                : Math.random()),
            category: point.category ?? point.properties?.category ?? point.region ?? 'unknown'
          }));
          console.log('Results - mappedDataPoints:', mappedDataPoints);
          const liveStats = mappedDataPoints.length > 0 ? calculateLiveStats(mappedDataPoints) : {
            avgValue: 0,
            avgBias: 0,
            giniCoefficient: 0,
            highBiasCount: 0,
            coverageScore: 0
          };
          const analysisResult: AnalysisResult = {
            id: docSnap.id,
            name: data.fileName || data.name || 'Untitled Dataset',
            type: (data.fileType?.toUpperCase() === 'CSV' ? 'CSV' : 'GeoJSON') as 'CSV' | 'GeoJSON',
            uploadDate: data.uploadedAt?.toDate() || new Date(),
            processedDate: data.analyzedAt?.toDate() || data.uploadedAt?.toDate() || new Date(),
            status: 'complete',
            biasScore: liveStats.avgBias,
            giniCoefficient: liveStats.giniCoefficient,
            coverageScore: liveStats.coverageScore,
            dataPoints: mappedDataPoints.length || data.totalRows || 0,
            fileSize: formatFileSize(data.fileSize || 0),
            analysisResults: data.analysisResults,
            context: data.context,
            regionData: [],
            mapInsights: {},
            dashboardMetrics: {}
          };
          results.push(analysisResult);
        }
      }
      setResults(results);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching analysis results:', error);
      toast({
        title: 'Error Loading Results',
        description: error.message,
        variant: 'destructive'
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthLoading]);

  // Helper function to format file sizes
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter results based on search and status
  const filteredResults = results.filter(result => {
    const matchesSearch = result.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Fetch enriched data for a specific result (dashboard metrics + map data)
  const fetchEnrichedData = async (resultId: string) => {
    try {
      // Fetch both map data and dataset details for comprehensive insights
      const getMapData = httpsCallable(functions, 'getMapDataForDataset');
      const mapResult = await getMapData({ datasetId: resultId });
      
      // Also get the full dataset document for additional insights
      const datasetDoc = await getDoc(doc(db, 'datasets', resultId));
      const datasetData = datasetDoc.data();
      
      return {
        mapData: mapResult.data,
        datasetDetails: datasetData,
        // Include any processed insights from the dashboard calculations
        dashboardInsights: datasetData?.dashboardInsights || {},
        regionalData: datasetData?.regionalData || [],
        processedMetrics: {
          overallBias: datasetData?.overallBias || 0,
          overallCoverage: datasetData?.overallCoverage || 0,
          giniCoefficient: datasetData?.giniCoefficient || 0
        }
      };
    } catch (error) {
      console.error('Error fetching enriched data:', error);
      return null;
    }
  };

  const getBiasLabel = (score: number) => {
    if (score <= 0.25) return { label: 'Low', color: 'bg-green-100 text-green-800' };
    if (score <= 0.4) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'High', color: 'bg-red-100 text-red-800' };
  };

  // Generate comprehensive PDF report
  const generatePDFReport = async (result: AnalysisResult) => {
    setExportingPDF(true);
    
    try {
      // Fetch enriched data for the report
      const enrichedData = await fetchEnrichedData(result.id);
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title and Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Fairify Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Dataset: ${result.name}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Executive Summary
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const biasLabel = getBiasLabel(result.biasScore);
      const overallAssessment = `This dataset contains ${result.dataPoints.toLocaleString()} data points with a ${biasLabel.label.toLowerCase()} bias level ` +
        `(${result.biasScore.toFixed(2)}). Coverage analysis shows ${result.coverageScore.toFixed(1)}% geographic coverage with a Gini coefficient of ` +
        `${result.giniCoefficient.toFixed(2)}, indicating ${result.giniCoefficient > 0.5 ? 'high' : result.giniCoefficient > 0.3 ? 'moderate' : 'low'} inequality in data distribution.`;
      
      const summaryLines = pdf.splitTextToSize(overallAssessment, pageWidth - 40);
      pdf.text(summaryLines, 20, yPosition);
      yPosition += summaryLines.length * 6 + 15;

      // Key Metrics Table
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Key Metrics', 20, yPosition);
      yPosition += 10;

      const metricsData = [
        ['Metric', 'Value', 'Assessment'],
        ['Data Points', result.dataPoints.toLocaleString(), result.dataPoints > 1000 ? 'Sufficient' : result.dataPoints > 100 ? 'Adequate' : 'Limited'],
        ['Bias Score', `${result.biasScore.toFixed(2)}`, biasLabel.label],
        ['Gini Coefficient', `${result.giniCoefficient.toFixed(2)}`, result.giniCoefficient > 0.5 ? 'High Inequality' : result.giniCoefficient > 0.3 ? 'Moderate' : 'Low Inequality'],
        ['Coverage Score', `${result.coverageScore.toFixed(1)}%`, result.coverageScore > 80 ? 'Excellent' : result.coverageScore > 60 ? 'Good' : result.coverageScore > 40 ? 'Fair' : 'Poor'],
        ['File Type', result.type, result.type === 'GeoJSON' ? 'Structured' : 'Tabular'],
        ['Processing Date', result.processedDate.toLocaleDateString(), 'Completed']
      ];

      let tableY = yPosition;
      metricsData.forEach((row, index) => {
        const isHeader = index === 0;
        pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
        pdf.setFontSize(11);
        
        pdf.text(row[0], 25, tableY);
        pdf.text(row[1], 85, tableY);
        pdf.text(row[2], 140, tableY);
        tableY += 8;
        
        if (isHeader) {
          pdf.line(25, tableY - 2, 180, tableY - 2);
          tableY += 3;
        }
      });
      yPosition = tableY + 15;

      // Detailed Analysis
      if (yPosition > pageHeight - 100) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detailed Analysis', 20, yPosition);
      yPosition += 10;

      if (result.analysisResults) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');

        if (result.analysisResults.coverage) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Geographic Coverage:', 25, yPosition);
          pdf.setFont('helvetica', 'normal');
          yPosition += 7;
          
          pdf.text(`• Coverage Area: ${result.analysisResults.coverage.coverageArea?.toFixed(2) || 'N/A'} square units`, 30, yPosition);
          yPosition += 6;
          
          if (result.analysisResults.coverage.bounds) {
            const bounds = result.analysisResults.coverage.bounds;
            pdf.text(`• Geographic Bounds:`, 30, yPosition);
            yPosition += 6;
            pdf.text(`  Latitude: ${bounds.south?.toFixed(4)} to ${bounds.north?.toFixed(4)}`, 35, yPosition);
            yPosition += 6;
            pdf.text(`  Longitude: ${bounds.west?.toFixed(4)} to ${bounds.east?.toFixed(4)}`, 35, yPosition);
            yPosition += 8;
          }
        }

        if (result.analysisResults.bias) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Bias Analysis:', 25, yPosition);
          pdf.setFont('helvetica', 'normal');
          yPosition += 7;
          
          pdf.text(`• Mean Value: ${result.analysisResults.bias.meanValue?.toFixed(2) || 'N/A'}`, 30, yPosition);
          yPosition += 6;
          pdf.text(`• Variance: ${result.analysisResults.bias.variance?.toFixed(2) || 'N/A'}`, 30, yPosition);
          yPosition += 8;
        }

        if (result.analysisResults.quality) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Data Quality:', 25, yPosition);
          pdf.setFont('helvetica', 'normal');
          yPosition += 7;
          
          pdf.text(`• Overall Quality Score: ${result.analysisResults.quality.qualityScore?.toFixed(2) || 'N/A'}`, 30, yPosition);
          yPosition += 6;
          pdf.text(`• Completeness Score: ${(result.analysisResults.quality.completenessScore * 100)?.toFixed(1) || 'N/A'}%`, 30, yPosition);
          yPosition += 10;
        }
      }

      // Regional Insights
      if (enrichedData?.mapData && (enrichedData.mapData as any)?.dataPoints && (enrichedData.mapData as any).dataPoints.length > 0) {
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Regional Distribution Analysis', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');

        // Calculate regional distribution from map data
        const regionalStats: Record<string, number> = {};
        (enrichedData.mapData as any).dataPoints.forEach((point: any) => {
          const rawRegion = point.region || point.administrativeRegion || 'Unknown';
          // Apply region mapping to convert climate zones to actual regions
          const region = mapRegionName(rawRegion, point.lat || point.latitude, point.lng || point.longitude, result.name);
          if (!regionalStats[region]) {
            regionalStats[region] = 0;
          }
          regionalStats[region]++;
        });

        const sortedRegions = Object.entries(regionalStats)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 8); // Top 8 regions

        if (sortedRegions.length > 0) {
          pdf.text('Data distribution by region:', 25, yPosition);
          yPosition += 8;

          sortedRegions.forEach(([region, count]) => {
            const percentage = ((count as number / (enrichedData.mapData as any).dataPoints.length) * 100).toFixed(1);
            pdf.text(`• ${region}: ${count} points (${percentage}%)`, 30, yPosition);
            yPosition += 6;
          });
          yPosition += 10;

          // Add bias analysis by region if available
          if ((enrichedData as any).datasetDetails?.regionalData) {
            pdf.setFont('helvetica', 'bold');
            pdf.text('Regional Bias Analysis:', 25, yPosition);
            pdf.setFont('helvetica', 'normal');
            yPosition += 8;

            (enrichedData as any).datasetDetails.regionalData.slice(0, 5).forEach((regionData: any) => {
              const mappedRegionName = mapRegionName(regionData.region, undefined, undefined, result.name);
              pdf.text(`• ${mappedRegionName}: Bias ${regionData.bias?.toFixed(3) || 'N/A'}, Coverage ${regionData.coverage?.toFixed(1) || 'N/A'}%`, 30, yPosition);
              yPosition += 6;
            });
            yPosition += 10;
          }
        }
      }

      // Map Data Summary
      if (enrichedData?.mapData) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Geospatial Data Summary', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');

        const mapData = enrichedData.mapData as any;
        const datasetDetails = (enrichedData as any).datasetDetails;
        
        const mapSummary = [
          `Total Data Points: ${mapData.totalPoints || mapData.dataPoints?.length || 0}`,
          `Geographic Extent: ${datasetDetails?.analysisResults?.coverage?.bounds ? 
            `${datasetDetails.analysisResults.coverage.bounds.south?.toFixed(2)}° to ${datasetDetails.analysisResults.coverage.bounds.north?.toFixed(2)}°N, ${datasetDetails.analysisResults.coverage.bounds.west?.toFixed(2)}° to ${datasetDetails.analysisResults.coverage.bounds.east?.toFixed(2)}°E` : 
            'Available in dataset'}`,
          `Data Density: ${mapData.dataPoints ? 
            (mapData.dataPoints.length / (datasetDetails?.analysisResults?.coverage?.coverageArea || 1)).toFixed(2) + ' points per sq unit' : 
            'Calculated from coverage'}`
        ];

        mapSummary.forEach(item => {
          const lines = pdf.splitTextToSize(item, pageWidth - 50);
          pdf.text(lines, 25, yPosition);
          yPosition += lines.length * 6 + 3;
        });
        yPosition += 10;
      }

      // Context Section
      if (result.context && result.context.length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Dataset Context', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');

        result.context.forEach((contextItem, index) => {
          const lines = pdf.splitTextToSize(contextItem, pageWidth - 50);
          pdf.text(`${index + 1}. `, 25, yPosition);
          pdf.text(lines, 35, yPosition);
          yPosition += lines.length * 6 + 5;

          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = 20;
          }
        });
        yPosition += 10;
      }

      // Recommendations
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Actionable Recommendations', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');

      const recommendations = generateEnhancedRecommendations(result);
      recommendations.forEach((section) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text(section.category, 25, yPosition);
        yPosition += 8;
        
        pdf.setFont('helvetica', 'normal');
        section.items.slice(0, 3).forEach(rec => { // Limit to 3 items per section
          const lines = pdf.splitTextToSize(`• ${rec}`, pageWidth - 50);
          pdf.text(lines, 30, yPosition);
          yPosition += lines.length * 6 + 3;

          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = 20;
          }
        });
        yPosition += 5;
      });

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
        pdf.text('Generated by Fairify - Geospatial Bias Analysis Platform', 20, pageHeight - 10);
        pdf.text(`Report ID: ${result.id.substring(0, 8)}`, 20, pageHeight - 5);
      }

      // Save the PDF
      const fileName = `${result.name.replace(/\.[^/.]+$/, '')}_comprehensive_analysis_report.pdf`;
      pdf.save(fileName);

      toast({
        title: 'Comprehensive PDF Report Generated',
        description: `Detailed report saved as ${fileName}`,
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: 'An error occurred while generating the PDF report.',
        variant: 'destructive'
      });
    } finally {
      setExportingPDF(false);
    }
  };

  // Generate enhanced recommendations based on analysis results
  const generateEnhancedRecommendations = (result: AnalysisResult): { category: string; items: string[] }[] => {
    const recommendations: { category: string; items: string[] }[] = [];
    
    // Bias-based recommendations
    const biasItems: string[] = [];
    if (result.biasScore > 0.6) {
      biasItems.push('Implement stratified sampling strategy to ensure proportional representation across all regions');
      biasItems.push('Deploy additional data collection resources to underrepresented areas');
      biasItems.push('Review and address accessibility barriers that may be causing systematic exclusions');
      biasItems.push('Consider using local community partners to improve data collection in remote areas');
    } else if (result.biasScore > 0.3) {
      biasItems.push('Fine-tune sampling methodology to reduce regional disparities');
      biasItems.push('Expand coverage in areas with less than 20% of expected representation');
      biasItems.push('Monitor collection practices to prevent accumulation of bias over time');
    } else {
      biasItems.push('Maintain current sampling methodology as bias levels are within acceptable range');
      biasItems.push('Continue monitoring for any emerging bias patterns in future data collection');
    }
    recommendations.push({ category: '1. Bias Reduction Strategies', items: biasItems });

    // Coverage-based recommendations
    const coverageItems: string[] = [];
    if (result.coverageScore < 50) {
      coverageItems.push('Significantly expand monitoring network by at least 50% to improve geographic coverage');
      coverageItems.push('Prioritize data collection in regions with zero or minimal coverage');
      coverageItems.push('Establish permanent monitoring stations in previously uncovered areas');
      coverageItems.push('Develop mobile data collection teams for hard-to-reach locations');
    } else if (result.coverageScore < 80) {
      coverageItems.push('Target expansion in specific regions to achieve more comprehensive coverage');
      coverageItems.push('Fill identified coverage gaps through strategic placement of new collection points');
      coverageItems.push('Enhance data collection frequency in moderately covered areas');
    } else {
      coverageItems.push('Excellent coverage achieved - focus on maintaining data quality and consistency');
      coverageItems.push('Consider optimizing existing collection points for better efficiency');
    }
    recommendations.push({ category: '2. Coverage Enhancement', items: coverageItems });

    // Data quality recommendations
    const qualityItems: string[] = [];
    if (result.dataPoints < 100) {
      qualityItems.push('Increase sample size to at least 500 points for more robust statistical analysis');
      qualityItems.push('Implement systematic data collection protocols to ensure consistency');
    } else if (result.dataPoints < 1000) {
      qualityItems.push('Consider expanding dataset size for improved regional analysis capabilities');
    } else {
      qualityItems.push('Dataset size is adequate for comprehensive spatial analysis');
    }

    if (result.giniCoefficient > 0.5) {
      qualityItems.push('Address high inequality in data distribution through geographic rebalancing');
      qualityItems.push('Implement weighted sampling to ensure proportional regional representation');
    }

    if (!result.context || result.context.length === 0) {
      qualityItems.push('Add comprehensive metadata and context information for better analysis interpretation');
      qualityItems.push('Document data collection methodology and constraints for future reference');
    }
    recommendations.push({ category: '3. Data Quality Improvements', items: qualityItems });

    // Technical and methodological recommendations
    const technicalItems: string[] = [];
    technicalItems.push('Implement automated bias monitoring systems for real-time assessment');
    technicalItems.push('Establish regular review cycles (monthly/quarterly) to track bias trends');
    technicalItems.push('Document all data collection protocols and maintain version control');
    technicalItems.push('Train data collection teams on bias awareness and mitigation strategies');
    technicalItems.push('Create standardized reporting templates for consistent documentation');
    recommendations.push({ category: '4. Technical Recommendations', items: technicalItems });

    // Regional-specific recommendations (if analysis data is available)
    if (result.analysisResults) {
      const regionalItems: string[] = [];
      regionalItems.push('Conduct detailed regional analysis to identify specific undersampled areas');
      regionalItems.push('Develop region-specific data collection strategies based on local constraints');
      regionalItems.push('Establish partnerships with local organizations for sustainable data collection');
      regionalItems.push('Create feedback mechanisms to monitor effectiveness of regional improvements');
      recommendations.push({ category: '5. Regional Strategy', items: regionalItems });
    }

    return recommendations;
  };

  // Generate recommendations based on analysis results (simplified version for compatibility)
  const generateRecommendations = (result: AnalysisResult): string[] => {
    const enhanced = generateEnhancedRecommendations(result);
    return enhanced.flatMap(section => section.items.slice(0, 2)); // Take top 2 from each category
  };

  const handleDownload = async (result: AnalysisResult, format: 'pdf' | 'json' | 'csv') => {
    if (format === 'pdf') {
      await generatePDFReport(result);
      return;
    }

    try {
      // Fetch enriched data for export
      const enrichedData = await fetchEnrichedData(result.id);
      
      const exportData = {
        dataset: {
          id: result.id,
          name: result.name,
          type: result.type,
          uploadDate: result.uploadDate,
          processedDate: result.processedDate,
          dataPoints: result.dataPoints,
          fileSize: result.fileSize
        },
        analysis: {
          biasScore: result.biasScore,
          giniCoefficient: result.giniCoefficient,
          coverageScore: result.coverageScore,
          detailedResults: result.analysisResults
        },
        context: result.context,
        enrichedData: enrichedData,
        exportedAt: new Date().toISOString(),
        exportFormat: format
      };
      
      let blob: Blob;
      let fileName: string;
      
      if (format === 'csv') {
        // Convert to CSV format
        const csvLines = ['Dataset Name,Bias Score,Gini Coefficient,Coverage Score,Data Points,File Size'];
        csvLines.push(`"${result.name}",${result.biasScore},${result.giniCoefficient},${result.coverageScore},${result.dataPoints},"${result.fileSize}"`);
        
        const csvData = csvLines.join('\n');
        blob = new Blob([csvData], { type: 'text/csv' });
        fileName = `${result.name}_analysis.csv`;
      } else {
        // JSON format
        blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        fileName = `${result.name}_analysis.json`;
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
        title: 'Export Complete',
        description: `Data exported as ${fileName}`,
      });

    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Export Failed',
        description: 'An error occurred while exporting the data.',
        variant: 'destructive'
      });
    }
  };

  // Handle bulk export
  const handleBulkExport = async () => {
    const allData = await Promise.all(
      filteredResults.map(async (result) => {
        const enrichedData = await fetchEnrichedData(result.id);
        return {
          dataset: {
            id: result.id,
            name: result.name,
            type: result.type,
            dataPoints: result.dataPoints,
            biasScore: result.biasScore,
            giniCoefficient: result.giniCoefficient,
            coverageScore: result.coverageScore
          },
          analysisResults: result.analysisResults,
          context: result.context,
          enrichedData: enrichedData
        };
      })
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalDatasets: filteredResults.length,
      datasets: allData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fairify_bulk_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Bulk Export Complete',
      description: `${filteredResults.length} datasets exported successfully`,
    });
  };

  const viewDetailedResults = (result: AnalysisResult) => {
    // Navigate to dashboard view with this specific dataset
    window.location.href = `/dashboard?dataset=${result.id}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-roboto font-bold text-gray-900 mb-2">My Results</h1>
          <p className="text-gray-600 font-open-sans">
            View and download your analysis results and reports
          </p>
        </div>
        <Button 
          className="bg-maphera-blue hover:bg-blue-600"
          onClick={handleBulkExport}
          disabled={filteredResults.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Bulk Export ({filteredResults.length})
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredResults.map((result) => (
          <Card key={result.id} className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {result.type === 'CSV' ? (
                      <FileText className="h-8 w-8 text-maphera-blue" />
                    ) : (
                      <Map className="h-8 w-8 text-maphera-green" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-roboto font-medium text-gray-900 truncate">
                        {result.name}
                      </h3>
                      <Badge variant="outline" className="flex-shrink-0">
                        {result.type}
                      </Badge>
                      <Badge 
                        className={`flex-shrink-0 ${
                          result.status === 'complete' 
                            ? 'bg-green-100 text-green-800' 
                            : result.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {result.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-600 font-open-sans">
                      <div>
                        <p className="font-medium">Upload Date</p>
                        <p>{result.uploadDate.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="font-medium">File Size</p>
                        <p>{result.fileSize}</p>
                      </div>
                      <div>
                        <p className="font-medium">Data Points</p>
                        <p>{result.dataPoints.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-medium">Processing Time</p>
                        <p>2.3s</p>
                      </div>
                    </div>

                    {result.status === 'complete' && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600 font-open-sans">Bias Score</span>
                            <Badge className={getBiasLabel(result.biasScore).color}>
                              {getBiasLabel(result.biasScore).label}
                            </Badge>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 font-roboto mt-1">
                            {result.biasScore.toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <span className="text-sm font-medium text-gray-600 font-open-sans">Gini Coefficient</span>
                          <p className="text-2xl font-bold text-gray-900 font-roboto mt-1">
                            {result.giniCoefficient.toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <span className="text-sm font-medium text-gray-600 font-open-sans">Coverage Score</span>
                          <p className="text-2xl font-bold text-gray-900 font-roboto mt-1">
                            {result.coverageScore.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {result.status === 'complete' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewDetailedResults(result)}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `/map?dataset=${result.id}`}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Map View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={exportingPDF}>
                            <Download className="h-4 w-4 mr-2" />
                            {exportingPDF ? 'Generating...' : 'Export'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleDownload(result, 'pdf')}>
                            <Printer className="h-4 w-4 mr-2" />
                            Download PDF Report
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(result, 'json')}>
                            <FileText className="h-4 w-4 mr-2" />
                            Download JSON Data
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(result, 'csv')}>
                            <FileText className="h-4 w-4 mr-2" />
                            Download CSV Summary
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => viewDetailedResults(result)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => window.location.href = `/map?dataset=${result.id}`}
                      >
                        <Map className="h-4 w-4 mr-2" />
                        View on Map
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-roboto font-medium text-gray-900 mb-2">Loading Results</h3>
            <p className="text-gray-600 font-open-sans">
              Fetching your analysis results...
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && filteredResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-roboto font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 font-open-sans">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload and analyze your first dataset to see results here'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button 
                className="mt-4 bg-maphera-blue hover:bg-blue-600"
                onClick={() => window.location.href = '/upload'}
              >
                Upload Dataset
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Results;
