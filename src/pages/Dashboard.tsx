import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Download, RefreshCw } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const getDashboardData = httpsCallable(functions, 'getDashboardData');
      const result = await getDashboardData();
      const data = result.data as any;
      
      setDashboardData(data);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error loading dashboard',
        description: error.message || 'Failed to load dashboard data.',
        variant: 'destructive'
      });
      
      // Use fallback mock data if Firebase fails
      setDashboardData({
        metrics: [
          {
            title: 'Overall Bias Score',
            value: '0.31',
            change: '-8.2%',
            trend: 'down',
            description: 'Lower is better',
            color: 'text-green-600'
          },
          {
            title: 'Gini Coefficient',
            value: '0.28',
            change: '+2.1%',
            trend: 'up',
            description: 'Inequality measure',
            color: 'text-red-600'
          },
          {
            title: 'Coverage Score',
            value: '83.2%',
            change: '+5.7%',
            trend: 'up',
            description: 'Data coverage',
            color: 'text-green-600'
          },
          {
            title: 'Active Datasets',
            value: '12',
            change: '+3',
            trend: 'up',
            description: 'Total datasets',
            color: 'text-blue-600'
          }
        ],
        biasData: [
          { region: 'North', gini: 0.25, coverage: 85 },
          { region: 'South', gini: 0.42, coverage: 67 },
          { region: 'East', gini: 0.18, coverage: 92 },
          { region: 'West', gini: 0.35, coverage: 74 },
          { region: 'Central', gini: 0.29, coverage: 81 }
        ],
        timeSeriesData: [
          { month: 'Jan', bias: 0.32, coverage: 78 },
          { month: 'Feb', bias: 0.28, coverage: 82 },
          { month: 'Mar', bias: 0.35, coverage: 76 },
          { month: 'Apr', bias: 0.29, coverage: 85 },
          { month: 'May', bias: 0.31, coverage: 83 },
          { month: 'Jun', bias: 0.26, coverage: 88 }
        ],
        distributionData: [
          { name: 'Low Bias', value: 45, color: '#43A047' },
          { name: 'Medium Bias', value: 35, color: '#FFC107' },
          { name: 'High Bias', value: 20, color: '#F44336' }
        ]
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  // Show loading state
  if (isLoading || !dashboardData) {
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

  const { metrics, biasData, timeSeriesData, distributionData } = dashboardData;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-roboto font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600 font-open-sans">
            Monitor bias metrics, coverage gaps, and fairness indicators
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="bg-maphera-blue hover:bg-blue-600" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric: any, index: number) => (
          <Card key={index} className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 font-open-sans">{metric.title}</p>
                  <p className="text-3xl font-bold text-gray-900 font-roboto">{metric.value}</p>
                  <p className="text-xs text-gray-500 font-open-sans">{metric.description}</p>
                </div>
                <div className="text-right">
                  <div className={`flex items-center ${metric.color}`}>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    <span className="text-sm font-medium">{metric.change}</span>
                  </div>
                </div>
              </div>
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
              Gini coefficient and coverage by region
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={biasData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="gini" fill="#1E88E5" name="Gini Coefficient" />
                <Bar dataKey="coverage" fill="#43A047" name="Coverage %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-roboto">Bias Trends Over Time</CardTitle>
            <CardDescription className="font-open-sans">
              Monthly bias and coverage trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="bias" stroke="#1E88E5" strokeWidth={2} name="Bias Score" />
                <Line type="monotone" dataKey="coverage" stroke="#43A047" strokeWidth={2} name="Coverage %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-roboto">Bias Distribution</CardTitle>
            <CardDescription className="font-open-sans">
              Breakdown of bias levels across datasets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {distributionData.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm font-open-sans">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-roboto">Recent Alerts</CardTitle>
            <CardDescription className="font-open-sans">
              System notifications and warnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium font-open-sans">High bias detected in Southern region</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium font-open-sans">Coverage improved in Eastern region</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium font-open-sans">Data quality issue in dataset_042</p>
                <p className="text-xs text-gray-500">2 days ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-roboto">Coverage Progress</CardTitle>
            <CardDescription className="font-open-sans">
              Regional coverage targets and progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { region: 'North', progress: 85, target: 90 },
              { region: 'South', progress: 67, target: 80 },
              { region: 'East', progress: 92, target: 95 },
              { region: 'West', progress: 74, target: 85 },
              { region: 'Central', progress: 81, target: 90 }
            ].map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-open-sans">{item.region}</span>
                  <span className="font-medium">{item.progress}% / {item.target}%</span>
                </div>
                <Progress value={item.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;