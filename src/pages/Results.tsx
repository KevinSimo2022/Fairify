
import React, { useState } from 'react';
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
  MoreVertical
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface AnalysisResult {
  id: string;
  name: string;
  type: 'CSV' | 'GeoJSON';
  uploadDate: Date;
  processedDate: Date;
  status: 'complete' | 'processing' | 'error';
  biasScore: number;
  giniCoefficient: number;
  coverageScore: number;
  dataPoints: number;
  fileSize: string;
}

const Results: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const mockResults: AnalysisResult[] = [
    {
      id: '1',
      name: 'climate_stations_2024.csv',
      type: 'CSV',
      uploadDate: new Date('2024-01-15'),
      processedDate: new Date('2024-01-15'),
      status: 'complete',
      biasScore: 0.32,
      giniCoefficient: 0.28,
      coverageScore: 85.2,
      dataPoints: 2847,
      fileSize: '15.2 MB'
    },
    {
      id: '2',
      name: 'environmental_survey_data.geojson',
      type: 'GeoJSON',
      uploadDate: new Date('2024-01-14'),
      processedDate: new Date('2024-01-14'),
      status: 'complete',
      biasScore: 0.45,
      giniCoefficient: 0.41,
      coverageScore: 67.8,
      dataPoints: 1923,
      fileSize: '8.7 MB'
    },
    {
      id: '3',
      name: 'weather_monitoring_points.csv',
      type: 'CSV',
      uploadDate: new Date('2024-01-13'),
      processedDate: new Date('2024-01-13'),
      status: 'complete',
      biasScore: 0.18,
      giniCoefficient: 0.15,
      coverageScore: 92.1,
      dataPoints: 4521,
      fileSize: '22.8 MB'
    },
    {
      id: '4',
      name: 'air_quality_sensors.geojson',
      type: 'GeoJSON',
      uploadDate: new Date('2024-01-12'),
      processedDate: new Date('2024-01-12'),
      status: 'processing',
      biasScore: 0,
      giniCoefficient: 0,
      coverageScore: 0,
      dataPoints: 0,
      fileSize: '12.1 MB'
    }
  ];

  const filteredResults = mockResults.filter(result => {
    const matchesSearch = result.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getBiasLabel = (score: number) => {
    if (score <= 0.25) return { label: 'Low', color: 'bg-green-100 text-green-800' };
    if (score <= 0.4) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'High', color: 'bg-red-100 text-red-800' };
  };

  const handleDownload = (result: AnalysisResult, format: 'pdf' | 'json') => {
    // Mock download functionality
    console.log(`Downloading ${result.name} as ${format.toUpperCase()}`);
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
        <Button className="bg-maphera-blue hover:bg-blue-600">
          <Download className="h-4 w-4 mr-2" />
          Bulk Export
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
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleDownload(result, 'pdf')}>
                            Download PDF Report
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(result, 'json')}>
                            Download JSON Data
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
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Reprocess</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-roboto font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 font-open-sans">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload your first dataset to see analysis results here'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Results;
