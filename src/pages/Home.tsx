
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Upload, 
  Map, 
  BarChart3, 
  Shield, 
  Globe, 
  TrendingUp,
  Users,
  Activity
} from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: Upload,
      title: 'Secure Data Upload',
      description: 'Upload CSV or GeoJSON files with enterprise-grade security',
      color: 'text-maphera-blue'
    },
    {
      icon: Map,
      title: 'Interactive Maps',
      description: 'Visualize data density and coverage gaps with interactive heatmaps',
      color: 'text-maphera-green'
    },
    {
      icon: BarChart3,
      title: 'Bias Analysis',
      description: 'Calculate Gini coefficients and fairness metrics automatically',
      color: 'text-maphera-amber'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Role-based access control with 2FA and audit logging',
      color: 'text-red-500'
    }
  ];

  const stats = [
    { label: 'Datasets Analyzed', value: '12,487', icon: Globe },
    { label: 'Bias Detections', value: '3,241', icon: TrendingUp },
    { label: 'Active Users', value: '892', icon: Users },
    { label: 'Uptime', value: '99.9%', icon: Activity }
  ];

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-maphera-blue/5 to-maphera-green/5">
        <div className="max-w-4xl mx-auto text-center px-4">          <div className="mb-8">
            <h1 className="text-5xl font-roboto font-bold text-gray-900 mb-4">
              Welcome to <span className="text-maphera-blue">Fairify</span>
            </h1>
            <p className="text-xl text-gray-600 font-open-sans max-w-2xl mx-auto">
              The leading platform for analyzing bias in geospatial datasets. 
              Ensure fairness and representation in your environmental and climate data.
            </p>
          </div>
          
          <div className="flex justify-center space-x-4 mb-12">
            <Button 
              onClick={() => navigate('/login')} 
              size="lg"
              className="bg-maphera-blue hover:bg-blue-600 text-lg px-8 py-3"
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-maphera-blue text-maphera-blue hover:bg-maphera-blue hover:text-white text-lg px-8 py-3"
            >
              Learn More
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="text-center">
                  <feature.icon className={`h-12 w-12 mx-auto mb-4 ${feature.color}`} />
                  <CardTitle className="text-lg font-roboto">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center font-open-sans">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-maphera-blue to-maphera-green rounded-lg p-8 text-white">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-roboto font-bold mb-4">
            Welcome back, {user.name}!
          </h1>
          <p className="text-xl font-open-sans mb-6 opacity-90">
            Ready to analyze your geospatial data for bias and coverage gaps?
          </p>
          <Button 
            onClick={() => navigate('/upload')}
            size="lg"
            className="bg-white text-maphera-blue hover:bg-gray-100"
          >
            Start New Analysis
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 font-open-sans">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 font-roboto">{stat.value}</p>
                </div>
                <stat.icon className="h-8 w-8 text-maphera-blue" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-roboto">Recent Activity</CardTitle>
            <CardDescription className="font-open-sans">Your latest analysis results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Climate_Data_2024.csv', status: 'Complete', bias: 'Low', date: '2 hours ago' },
                { name: 'Environmental_Survey.geojson', status: 'Processing', bias: '-', date: '1 day ago' },
                { name: 'Weather_Stations.csv', status: 'Complete', bias: 'Medium', date: '3 days ago' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <p className="font-medium font-open-sans">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.date}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'Complete' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                    {item.bias !== '-' && (
                      <p className="text-sm mt-1">Bias: {item.bias}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-roboto">Quick Actions</CardTitle>
            <CardDescription className="font-open-sans">Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/upload')} 
              className="w-full justify-start bg-maphera-blue hover:bg-blue-600"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload New Dataset
            </Button>
            <Button 
              onClick={() => navigate('/map')} 
              variant="outline" 
              className="w-full justify-start border-maphera-green text-maphera-green hover:bg-maphera-green hover:text-white"
            >
              <Map className="mr-2 h-4 w-4" />
              View Interactive Map
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline" 
              className="w-full justify-start"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Open Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
