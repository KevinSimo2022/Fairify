
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { 
  Users, 
  Database, 
  Activity, 
  AlertTriangle,
  Shield,
  Download,
  RefreshCw
} from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();

  // Redirect if not admin
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const platformStats = [
    { label: 'Total Users', value: '1,247', change: '+12%', icon: Users, color: 'text-blue-600' },
    { label: 'Datasets Processed', value: '8,924', change: '+18%', icon: Database, color: 'text-green-600' },
    { label: 'Active Sessions', value: '187', change: '+5%', icon: Activity, color: 'text-purple-600' },
    { label: 'Security Alerts', value: '3', change: '-25%', icon: AlertTriangle, color: 'text-red-600' }
  ];

  const usageData = [
    { month: 'Jan', uploads: 245, users: 89 },
    { month: 'Feb', uploads: 312, users: 127 },
    { month: 'Mar', uploads: 287, users: 143 },
    { month: 'Apr', uploads: 398, users: 189 },
    { month: 'May', uploads: 456, users: 234 },
    { month: 'Jun', uploads: 523, users: 267 }
  ];

  const recentUploads = [
    {
      id: '1',
      user: 'john.doe@example.com',
      filename: 'climate_data_2024.csv',
      size: '15.2 MB',
      status: 'complete',
      timestamp: '2 minutes ago'
    },
    {
      id: '2',
      user: 'jane.smith@example.com',
      filename: 'environmental_survey.geojson',
      size: '8.7 MB',
      status: 'processing',
      timestamp: '15 minutes ago'
    },
    {
      id: '3',
      user: 'admin@maphera.com',
      filename: 'weather_stations.csv',
      size: '22.8 MB',
      status: 'complete',
      timestamp: '1 hour ago'
    }
  ];

  const systemLogs = [
    {
      id: '1',
      type: 'security',
      message: 'Failed login attempt from IP 192.168.1.100',
      timestamp: '5 minutes ago',
      severity: 'warning'
    },
    {
      id: '2',
      type: 'system',
      message: 'Database backup completed successfully',
      timestamp: '1 hour ago',
      severity: 'info'
    },
    {
      id: '3',
      type: 'user',
      message: 'New user registered: alice@example.com',
      timestamp: '2 hours ago',
      severity: 'info'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-roboto font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600 font-open-sans">
            Monitor platform usage, manage users, and view system analytics
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-maphera-blue hover:bg-blue-600" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {platformStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 font-open-sans">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 font-roboto">{stat.value}</p>
                  <p className={`text-sm ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change} from last month
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-roboto">Platform Usage Trends</CardTitle>
            <CardDescription className="font-open-sans">
              Monthly uploads and active users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="uploads" stroke="#1E88E5" strokeWidth={2} name="Uploads" />
                <Line type="monotone" dataKey="users" stroke="#43A047" strokeWidth={2} name="Active Users" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-roboto">Upload Volume</CardTitle>
            <CardDescription className="font-open-sans">
              Dataset uploads by month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="uploads" fill="#1E88E5" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-roboto">Recent Uploads</CardTitle>
            <CardDescription className="font-open-sans">
              Latest dataset uploads across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate font-open-sans">
                      {upload.filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {upload.user} • {upload.size} • {upload.timestamp}
                    </p>
                  </div>
                  <Badge 
                    className={upload.status === 'complete' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {upload.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-roboto">System Logs</CardTitle>
            <CardDescription className="font-open-sans">
              Recent security and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    log.severity === 'warning' 
                      ? 'bg-yellow-500' 
                      : log.severity === 'error'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 font-open-sans">
                      {log.message}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {log.type}
                      </Badge>
                      <span className="text-xs text-gray-500">{log.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-roboto flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Admin Actions
          </CardTitle>
          <CardDescription className="font-open-sans">
            Platform management and maintenance tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            <Button variant="outline" className="justify-start">
              <Database className="h-4 w-4 mr-2" />
              Database Management
            </Button>
            <Button variant="outline" className="justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Security Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
