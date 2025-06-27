import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Download, RefreshCw, Upload, BarChart3 } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Helper to convert various timestamp formats to a Date object
const toDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate(); // Firestore Timestamp
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) return date;
  }
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  return null;
};

// Helper to format timestamp for display
const formatTimestamp = (timestamp: any): string => {
  const date = toDate(timestamp);
  return date ? date.toLocaleString() : 'No date';
};

const Dashboard: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [datasetsList, setDatasetsList] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');

  // Define comprehensive regional data for different countries
  const getCountryRegions = (datasetName: string, analysisResults: any) => {
    const name = datasetName.toLowerCase();
    const results = analysisResults || {};

    // Cameroon regions
    if (name.includes('cameroon') || name.includes('cameroun')) {
      return [
        { region: 'Littoral', population: 3600000 },
        { region: 'Centre', population: 4000000 },
        { region: 'East', population: 800000 },
        { region: 'North', population: 2400000 },
        { region: 'Far North', population: 3500000 },
        { region: 'South', population: 800000 },
        { region: 'West', population: 1800000 },
        { region: 'Northwest', population: 1800000 },
        { region: 'Southwest', population: 1400000 },
        { region: 'Adamawa', population: 1200000 }
      ];
    }

    // Kenya regions
    if (name.includes('kenya')) {
      return [
        { region: 'Nairobi', population: 4397073 },
        { region: 'Central', population: 4383743 },
        { region: 'Eastern', population: 5668123 },
        { region: 'Coast', population: 3325307 },
        { region: 'Rift Valley', population: 10006805 },
        { region: 'Western', population: 4334282 },
        { region: 'Nyanza', population: 5442711 },
        { region: 'North Eastern', population: 2310757 }
      ];
    }

    // Nigeria states (major regions)
    if (name.includes('nigeria')) {
      return [
        { region: 'Lagos', population: 14862000 },
        { region: 'Kano', population: 13076892 },
        { region: 'Kaduna', population: 8252366 },
        { region: 'Katsina', population: 7831319 },
        { region: 'Oyo', population: 7840864 },
        { region: 'Rivers', population: 7303924 },
        { region: 'Bauchi', population: 6537314 },
        { region: 'Jigawa', population: 5828163 },
        { region: 'Benue', population: 5741815 },
        { region: 'Anambra', population: 5527809 }
      ];
    }

    // South Africa provinces
    if (name.includes('south africa') || name.includes('south-africa')) {
      return [
        { region: 'Gauteng', population: 15176115 },
        { region: 'KwaZulu-Natal', population: 11289086 },
        { region: 'Eastern Cape', population: 6734001 },
        { region: 'Western Cape', population: 6621126 },
        { region: 'Limpopo', population: 5982584 },
        { region: 'Mpumalanga', population: 4592187 },
        { region: 'North West', population: 4072160 },
        { region: 'Free State', population: 2887465 },
        { region: 'Northern Cape', population: 1292786 }
      ];
    }

    // Default/fallback regions based on existing data
    if (results.coverageAnalysis?.coveragePercentages) {
      return Object.keys(results.coverageAnalysis.coveragePercentages).map(region => ({
        region,
        population: 1000000 // Default population
      }));
    }

    // Generic regions as fallback
    return [
      { region: 'Region 1', population: 1000000 },
      { region: 'Region 2', population: 1500000 },
      { region: 'Region 3', population: 800000 },
      { region: 'Region 4', population: 1200000 },
      { region: 'Region 5', population: 900000 }
    ];
  };

  const generateDashboardData = (dataset: any) => {
    if (!dataset || !dataset.analysisResults) {
      setDashboardData(null);
      return;
    }

    let results = dataset.analysisResults;
    if (typeof results === 'string') {
      try {
        results = JSON.parse(results);
      } catch (e) {
        console.error(`Failed to parse analysisResults for dataset: ${dataset.id}`, e);
        results = {};
      }
    }    const biasScore = parseFloat(results.biasAnalysis?.biasScore) || 0;
    const overallCoverage = parseFloat(results.coverageAnalysis?.overallCoverage) || 0;

    const biasDistribution = { low: 0, medium: 0, high: 0 };
    if (biasScore <= 0.25) biasDistribution.low = 1;
    else if (biasScore <= 0.4) biasDistribution.medium = 1;
    else biasDistribution.high = 1;

    // Get all regions for the country
    const allRegions = getCountryRegions(dataset.name, results);
    const existingCoverageData = results.coverageAnalysis?.coveragePercentages || {};
    const existingBiasData = results.biasAnalysis?.regionalBias || {};

    // Create comprehensive regional data including all regions
    const processedRegionalData = allRegions.map(regionInfo => {
      const regionName = regionInfo.region;
      const coverage = existingCoverageData[regionName] || 0;
      const bias = existingBiasData[regionName] || results.biasAnalysis?.giniCoefficient || 0;
      
      return {
        region: regionName,
        gini: bias,
        coverage: coverage,
        population: regionInfo.population,
        hasData: coverage > 0
      };
    });

    // Sort by coverage (highest first) to highlight well-covered vs gaps
    processedRegionalData.sort((a, b) => b.coverage - a.coverage);    const coverageProgressData = processedRegionalData.map(item => ({
      region: item.region,
      progress: item.coverage,
      target: 85, // Target coverage percentage
      hasData: item.hasData
    }));

    const processedDistributionData = [
      { name: 'Low Bias', value: biasDistribution.low * 100, color: '#43A047' },
      { name: 'Medium Bias', value: biasDistribution.medium * 100, color: '#FFC107' },
      { name: 'High Bias', value: biasDistribution.high * 100, color: '#F44336' }
    ].filter(item => item.value > 0);

    const transformedData = {
      metrics: [
        {
          title: 'Dataset Name',
          value: dataset.name,
          description: 'Selected dataset',
          color: 'text-blue-600'
        },
        {
          title: 'Analysis Status',
          value: dataset.status,
          description: 'Current status',
          color: dataset.status?.toLowerCase() === 'complete' ? 'text-green-600' : 'text-orange-600'
        },
        {
          title: 'Bias Score',
          value: biasScore.toFixed(2),
          description: 'Lower is better',
          color: biasScore <= 0.3 ? 'text-green-600' : 'text-red-600'
        },
        {
          title: 'Overall Coverage',
          value: `${overallCoverage.toFixed(1)}%`,
          description: 'Data coverage',
          color: overallCoverage >= 70 ? 'text-green-600' : 'text-orange-600'
        }
      ],
      biasData: processedRegionalData,
      distributionData: processedDistributionData.length > 0 ? processedDistributionData : [{ name: 'No Data', value: 100, color: '#E0E0E0' }],
      coverageProgress: coverageProgressData,
    };

    setDashboardData(transformedData);
  };

  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return; // Wait for auth to resolve
    }
    if (!user) {
      setIsLoading(false);
      setDatasetsList([]);
      setDashboardData(null);
      return;
    }

    setIsLoading(true);
    const datasetsQuery = query(
      collection(db, 'datasets'),
      where('userId', '==', user.id),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(datasetsQuery, (snapshot) => {
      const datasets = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        name: doc.data().fileName || doc.data().name || 'Untitled Dataset' 
      }));
      setDatasetsList(datasets);

      if (datasets.length > 0) {
        const currentSelectedId = selectedDatasetId;
        
        if (currentSelectedId && datasets.some(d => d.id === currentSelectedId)) {
          const currentDataset = datasets.find(d => d.id === currentSelectedId);
          if (currentDataset) generateDashboardData(currentDataset);
        } else {
          setSelectedDatasetId(datasets[0].id);
          generateDashboardData(datasets[0]);
        }
      } else {
        setDashboardData(null);
        setSelectedDatasetId('');
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching datasets:', error);
      toast({ title: 'Error loading datasets', description: error.message, variant: 'destructive' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthLoading]);

  const handleDatasetChange = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    const selectedDataset = datasetsList.find(d => d.id === datasetId);
    if (selectedDataset) {
      generateDashboardData(selectedDataset);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (selectedDatasetId) {
      const selectedDataset = datasetsList.find(d => d.id === selectedDatasetId);
      if (selectedDataset) {
        generateDashboardData(selectedDataset);
      }
    } 
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-roboto font-bold text-gray-900">Analytics Dashboard</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-maphera-blue"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-roboto font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600 font-open-sans">
            Displaying metrics for a single dataset
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedDatasetId} onValueChange={handleDatasetChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasetsList.length > 0 ? (
                datasetsList.map(d => <SelectItem key={d.id} value={d.id} className="text-black">{d.name}</SelectItem>)
              ) : (
                <SelectItem value="no-data" disabled>No datasets found</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {!dashboardData ? (
        <div className="text-center py-10">
          <p className="text-lg text-gray-500">Please select a dataset to view its analytics.</p>
          <p className="text-sm text-gray-400">If no datasets are available, please upload one first.</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardData.metrics.map((metric: any, index: number) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-gray-600 font-open-sans">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 font-roboto truncate" title={metric.value}>{metric.value}</p>
                  <p className={`text-xs ${metric.color}`}>{metric.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-roboto">Regional Bias Analysis</CardTitle>
                <CardDescription className="font-open-sans">
                  Gini coefficient and coverage by region (all {dashboardData.biasData.length} regions shown)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.biasData && dashboardData.biasData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.biasData} margin={{ bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="region" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={10}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          typeof value === 'number' ? value.toFixed(2) : value, 
                          name
                        ]}
                        labelFormatter={(label) => `Region: ${label}`}
                      />
                      <Bar 
                        dataKey="gini" 
                        fill="#1E88E5" 
                        name="Gini Coefficient"
                      />                      <Bar 
                        dataKey="coverage" 
                        fill="#43A047"
                        name="Coverage %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">No regional data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-roboto">Coverage Progress</CardTitle>
                <CardDescription className="font-open-sans">
                  Regional coverage vs targets (showing gaps in red regions)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-80 overflow-y-auto">
                {dashboardData.coverageProgress && dashboardData.coverageProgress.length > 0 ? (
                  dashboardData.coverageProgress.map((item: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={`font-open-sans ${!item.hasData ? 'text-red-600 font-semibold' : ''}`}>
                        {item.region} {!item.hasData ? '(No Data)' : ''}
                      </span>
                      <span className={`font-medium ${!item.hasData ? 'text-red-600' : ''}`}>
                        {item.progress.toFixed(1)}% / {item.target}%
                      </span>
                    </div>
                    <Progress 
                      value={item.progress} 
                      className={`h-2 ${!item.hasData ? 'opacity-50' : ''}`}
                    />
                    {!item.hasData && (
                      <p className="text-xs text-red-500">Critical coverage gap - requires immediate attention</p>
                    )}
                  </div>
                ))
                ) : (
                  <div className="text-center py-4 h-[250px] flex items-center justify-center">
                    <div>
                      <p className="text-sm text-gray-500 font-open-sans">No coverage data available</p>
                      <p className="text-xs text-gray-400">Complete an analysis to see progress</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-roboto">Bias Distribution</CardTitle>
                <CardDescription className="font-open-sans">
                  Bias level for the selected dataset
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.distributionData && dashboardData.distributionData.length > 0 && dashboardData.distributionData[0].name !== 'No Data' ? (
                  <div className="flex items-center justify-center h-[250px]">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={dashboardData.distributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dashboardData.distributionData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-400">
                    <div className="text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">No distribution data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;