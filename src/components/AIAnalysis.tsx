import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Brain, RefreshCw, TrendingUp, AlertTriangle, CheckCircle, BarChart3, MapPin, Lightbulb } from 'lucide-react';
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import app from '../lib/firebase';

interface DataPoint {
  lat: number;
  lng: number;
  value?: number;
  bias?: number;
  cluster?: number;
  isOutlier?: boolean;
}

interface AIInsight {
  category: 'bias' | 'coverage' | 'spatial' | 'recommendations';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  icon: string;
}

interface AnalysisResult {
  summary: string;
  insights: AIInsight[];
  recommendations: string[];
}

interface AIAnalysisProps {
  dataPoints: DataPoint[];
  datasetName?: string;
  liveStats: {
    avgValue: number;
    avgBias: number;
    giniCoefficient: number;
    highBiasCount: number;
    coverageScore: number;
  };
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ dataPoints, datasetName, liveStats }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      // Handle cases with no data points by providing fallback analysis
      if (!dataPoints || dataPoints.length === 0) {
        setAnalysis(generateFallbackAnalysis());
        return;
      }

      // Initialize the Gemini AI backend service
      const ai = getAI(app, { backend: new GoogleAIBackend() });
      
      // Create a GenerativeModel instance
      const model = getGenerativeModel(ai, { model: "gemini-2.0-flash-exp" });

      // Prepare data summary for analysis with enhanced geographical context
      const geographicalAnalysis = analyzeGeographicalDistribution(dataPoints);
      const regionalClusters = identifyRegionalClusters(dataPoints);
      
      const dataSummary = {
        totalPoints: dataPoints.length,
        avgBias: liveStats.avgBias,
        giniCoefficient: liveStats.giniCoefficient,
        coverageScore: liveStats.coverageScore,
        highBiasPercentage: (liveStats.highBiasCount / dataPoints.length) * 100,
        geographicSpread: calculateGeographicSpread(dataPoints),
        biasDistribution: calculateBiasDistribution(dataPoints),
        geographicalAnalysis,
        regionalClusters
      };

      // Create enhanced analysis prompt with geographical specificity
      const prompt = `
        You are an expert data analyst specializing in bias detection, geographical equity assessment, and regional development issues.
        
        Analyze this geospatial dataset: "${datasetName || 'Dataset'}"
        
        Dataset Statistics:
        - Total data points: ${dataSummary.totalPoints}
        - Average bias score: ${dataSummary.avgBias.toFixed(3)}
        - Gini coefficient: ${dataSummary.giniCoefficient.toFixed(3)}
        - Coverage score: ${dataSummary.coverageScore.toFixed(1)}%
        - High bias points: ${dataSummary.highBiasPercentage.toFixed(1)}%
        - Geographic spread: ${dataSummary.geographicSpread}
        - Bias distribution: Low: ${dataSummary.biasDistribution.low}, Medium: ${dataSummary.biasDistribution.medium}, High: ${dataSummary.biasDistribution.high}
        
        Geographical Context:
        - Primary region/country: ${dataSummary.geographicalAnalysis.primaryRegion}
        - Geographic bounds: ${dataSummary.geographicalAnalysis.bounds}
        - Major population centers in region: ${dataSummary.geographicalAnalysis.majorCities.join(', ')}
        - Rural vs Urban distribution: ${dataSummary.geographicalAnalysis.ruralUrbanSplit}
        - Regional clusters identified: ${dataSummary.regionalClusters.map(c => `${c.name} (${c.pointCount} points, avg bias: ${c.avgBias.toFixed(2)})`).join('; ')}
        
        IMPORTANT: Be specific about the geographical region (${dataSummary.geographicalAnalysis.primaryRegion}) and provide practical, actionable insights relevant to this specific location. Consider:
        - Regional development challenges specific to ${dataSummary.geographicalAnalysis.primaryRegion}
        - Infrastructure and accessibility issues in rural vs urban areas
        - Economic disparities between regions
        - Specific policy implications for local governments
        - Cultural and social factors affecting data collection in this region
        
        Please provide a JSON response with the following structure:
        {
          "summary": "A concise 2-sentence summary specifically mentioning the geographical region and practical implications of the bias patterns found",
          "insights": [
            {
              "category": "bias|coverage|spatial|regional",
              "title": "Specific insight title mentioning location/region when relevant",
              "description": "Detailed insight description that includes specific geographical context, mentions towns/regions/provinces where relevant, and explains practical implications for local communities or governments",
              "severity": "low|medium|high",
              "icon": "TrendingUp|AlertTriangle|MapPin|BarChart3"
            }
          ],
          "recommendations": [
            "Specific actionable recommendation that mentions geographical areas and practical implementation steps for ${dataSummary.geographicalAnalysis.primaryRegion}",
            "Region-specific policy or intervention recommendation",
            "Targeted data collection or resource allocation recommendation for specific areas/communities"
          ]
        }
        
        Focus on geographical equity, regional development, specific location-based issues, and actionable insights for local decision-makers and communities in ${dataSummary.geographicalAnalysis.primaryRegion}.
        Be specific about which regions, towns, or areas are most affected and what practical steps can be taken.
        Ensure the response is valid JSON only, no additional text.
      `;

      // Generate analysis
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      // Parse the JSON response
      try {
        const parsedAnalysis = JSON.parse(analysisText.replace(/```json|```/g, '').trim());
        setAnalysis(parsedAnalysis);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        throw new Error('Invalid AI response format');
      }

    } catch (err: any) {
      console.error('AI Analysis Error:', err);
      setError(`Failed to generate AI analysis: ${err.message || 'Unknown error'}`);
      
      // Provide fallback analysis with geographical context
      const geographicalAnalysis = analyzeGeographicalDistribution(dataPoints);
      setAnalysis({
        summary: `Analysis of ${dataPoints.length} data points in ${geographicalAnalysis.primaryRegion} shows ${
          liveStats.avgBias > 0.6 ? 'high bias levels requiring immediate attention' : 
          liveStats.avgBias > 0.3 ? 'moderate bias levels across regions' : 'acceptable bias levels'
        }. ${geographicalAnalysis.ruralUrbanSplit} distribution indicates potential geographical disparities.`,
        insights: [
          {
            category: 'regional',
            title: `Bias Distribution in ${geographicalAnalysis.primaryRegion}`,
            description: `Average bias score of ${liveStats.avgBias.toFixed(2)} with ${liveStats.highBiasCount} high-bias points (${((liveStats.highBiasCount / dataPoints.length) * 100).toFixed(1)}%) across ${geographicalAnalysis.primaryRegion}. Geographic coverage spans ${geographicalAnalysis.bounds}.`,
            severity: liveStats.avgBias > 0.6 ? 'high' : liveStats.avgBias > 0.3 ? 'medium' : 'low',
            icon: 'TrendingUp'
          },
          {
            category: 'spatial',
            title: 'Geographic Coverage Analysis',
            description: `Coverage score of ${liveStats.coverageScore.toFixed(1)}% indicates ${liveStats.coverageScore > 70 ? 'good' : 'limited'} geographical distribution across ${geographicalAnalysis.primaryRegion}. Rural-urban split: ${geographicalAnalysis.ruralUrbanSplit}.`,
            severity: liveStats.coverageScore > 70 ? 'low' : liveStats.coverageScore > 40 ? 'medium' : 'high',
            icon: 'MapPin'
          },
          {
            category: 'coverage',
            title: 'Regional Access Patterns',
            description: `Data collection covers major areas including ${geographicalAnalysis.majorCities.slice(0, 3).join(', ')}. ${geographicalAnalysis.ruralUrbanSplit} suggests potential access disparities between urban centers and rural communities.`,
            severity: 'medium',
            icon: 'BarChart3'
          }
        ],
        recommendations: [
          `Enhance data collection in underrepresented areas of ${geographicalAnalysis.primaryRegion}, particularly in regions with high bias scores`,
          `Implement targeted interventions in rural areas where bias levels exceed urban averages`,
          `Establish regional monitoring systems in major population centers like ${geographicalAnalysis.majorCities.slice(0, 2).join(' and ')}`
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackAnalysis = (): AnalysisResult => {
    return {
      summary: `Analysis for dataset "${datasetName || 'Selected Dataset'}" is being prepared. Comprehensive geographical bias analysis including regional coverage, urban-rural disparities, and location-specific insights will be available once data points are loaded.`,
      insights: [
        {
          category: 'coverage',
          title: 'Dataset Preparation',
          description: 'Data points are being processed for geographical analysis. The system will identify regional patterns, urban-rural bias differences, and location-specific coverage gaps.',
          severity: 'medium',
          icon: 'RefreshCw'
        },
        {
          category: 'regional',
          title: 'Geographic Bias Detection Ready',
          description: 'The system is configured to detect geographical bias patterns, identify underrepresented regions, and analyze spatial distribution across countries, provinces, and local communities.',
          severity: 'low',
          icon: 'CheckCircle'
        },
        {
          category: 'spatial',
          title: 'Location-Specific Analysis Pending',
          description: 'Spatial analysis will identify specific towns, regions, and communities with bias issues, providing actionable insights for local governments and development organizations.',
          severity: 'low',
          icon: 'MapPin'
        }
      ],
      recommendations: [
        'Ensure the selected dataset includes comprehensive geographical metadata (coordinates, region names, administrative boundaries)',
        'Verify that data points represent diverse geographical areas including both urban centers and rural communities',
        'Check that the dataset processing has completed successfully and geographical boundaries are properly detected'
      ]
    };
  };

  const calculateGeographicSpread = (points: DataPoint[]): string => {
    if (points.length === 0) return 'No data';
    
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);
    
    if (latRange > 10 || lngRange > 10) return 'Continental';
    if (latRange > 1 || lngRange > 1) return 'Regional';
    return 'Local';
  };

  const calculateBiasDistribution = (points: DataPoint[]) => {
    const distribution = { low: 0, medium: 0, high: 0 };
    
    points.forEach(point => {
      const bias = point.bias || 0;
      if (bias <= 0.3) distribution.low++;
      else if (bias <= 0.6) distribution.medium++;
      else distribution.high++;
    });
    
    return distribution;
  };

  const analyzeGeographicalDistribution = (points: DataPoint[]) => {
    if (points.length === 0) return {
      primaryRegion: 'No data',
      bounds: 'No coordinates',
      majorCities: [],
      ruralUrbanSplit: 'Unknown'
    };

    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const lngMin = Math.min(...lngs);
    const lngMax = Math.max(...lngs);
    
    // Determine primary region based on coordinates
    let primaryRegion = 'Unknown Region';
    let majorCities: string[] = [];
    
    // Kenya boundaries: approximately -4.7 to 4.6 latitude, 33.9 to 41.9 longitude
    if (latMin >= -4.7 && latMax <= 4.6 && lngMin >= 33.9 && lngMax <= 41.9) {
      primaryRegion = 'Kenya';
      majorCities = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'];
    }
    // South Africa boundaries: approximately -34.8 to -22.1 latitude, 16.5 to 32.9 longitude
    else if (latMin >= -34.8 && latMax <= -22.1 && lngMin >= 16.5 && lngMax <= 32.9) {
      primaryRegion = 'South Africa';
      majorCities = ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth'];
    }
    // Add more regions as needed
    else if (latMin >= -90 && latMax <= 90 && lngMin >= -180 && lngMax <= 180) {
      // Determine broader regions
      if (latMin >= -35 && latMax <= 37 && lngMin >= -18 && lngMax <= 51) {
        primaryRegion = 'Africa';
        majorCities = ['Cairo', 'Lagos', 'Nairobi', 'Cape Town', 'Casablanca'];
      } else if (latMin >= 5 && latMax <= 81 && lngMin >= -169 && lngMax <= 190) {
        primaryRegion = 'Europe/Asia';
        majorCities = ['London', 'Paris', 'Berlin', 'Moscow', 'Tokyo'];
      } else {
        primaryRegion = 'Global Dataset';
        majorCities = ['Multiple Continents'];
      }
    }
    
    const bounds = `${latMin.toFixed(2)}°N to ${latMax.toFixed(2)}°N, ${lngMin.toFixed(2)}°E to ${lngMax.toFixed(2)}°E`;
    
    // Estimate rural vs urban distribution based on coordinate density
    const coordinateGrid = new Map();
    points.forEach(point => {
      const gridKey = `${Math.floor(point.lat * 10)},${Math.floor(point.lng * 10)}`;
      coordinateGrid.set(gridKey, (coordinateGrid.get(gridKey) || 0) + 1);
    });
    
    const urbanThreshold = 5; // Points per grid cell
    let urbanPoints = 0;
    coordinateGrid.forEach(count => {
      if (count >= urbanThreshold) urbanPoints += count;
    });
    
    const urbanPercentage = (urbanPoints / points.length) * 100;
    const ruralUrbanSplit = `${urbanPercentage.toFixed(1)}% urban, ${(100 - urbanPercentage).toFixed(1)}% rural`;
    
    return {
      primaryRegion,
      bounds,
      majorCities,
      ruralUrbanSplit
    };
  };

  const identifyRegionalClusters = (points: DataPoint[]) => {
    if (points.length === 0) return [];
    
    // Simple clustering based on coordinate proximity
    const clusters = [];
    const processedPoints = new Set();
    
    points.forEach((point, index) => {
      if (processedPoints.has(index)) return;
      
      const cluster = {
        name: `Region ${clusters.length + 1}`,
        centerLat: point.lat,
        centerLng: point.lng,
        points: [point],
        pointCount: 1,
        avgBias: point.bias || 0
      };
      
      // Find nearby points (within ~0.5 degrees)
      points.forEach((otherPoint, otherIndex) => {
        if (processedPoints.has(otherIndex) || index === otherIndex) return;
        
        const distance = Math.sqrt(
          Math.pow(point.lat - otherPoint.lat, 2) + 
          Math.pow(point.lng - otherPoint.lng, 2)
        );
        
        if (distance <= 0.5) {
          cluster.points.push(otherPoint);
          cluster.pointCount++;
          cluster.avgBias = (cluster.avgBias * (cluster.pointCount - 1) + (otherPoint.bias || 0)) / cluster.pointCount;
          processedPoints.add(otherIndex);
        }
      });
      
      processedPoints.add(index);
      clusters.push(cluster);
    });
    
    // Sort by point count and return top clusters
    return clusters
      .sort((a, b) => b.pointCount - a.pointCount)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        pointCount: c.pointCount,
        avgBias: c.avgBias
      }));
  };

  useEffect(() => {
    // Always generate analysis when dataset is selected, even without data points
    if (datasetName) {
      generateAnalysis();
    }
  }, [datasetName, dataPoints.length, liveStats.avgBias, liveStats.giniCoefficient]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp': return TrendingUp;
      case 'AlertTriangle': return AlertTriangle;
      case 'MapPin': return MapPin;
      case 'Lightbulb': return Lightbulb;
      case 'BarChart3': return BarChart3;
      default: return CheckCircle;
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <CardTitle className="font-roboto">AI Analysis & Insights</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateAnalysis}
            disabled={loading || !dataPoints || dataPoints.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </div>
        <CardDescription className="font-open-sans">
          AI-powered interpretation of bias patterns and data quality
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-2" />
            <p className="text-red-600 font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={generateAnalysis}>
              Try Again
            </Button>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 font-open-sans">AI is analyzing your data...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
          </div>
        ) : !analysis ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-open-sans">No analysis available</p>
          </div>
        ) : (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="recommendations">Actions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4 mt-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-open-sans leading-relaxed">{analysis.summary}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{dataPoints.length}</p>
                  <p className="text-sm text-gray-600">Data Points Analyzed</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{liveStats.avgBias.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Average Bias Score</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4 mt-4">
              <div className="space-y-3">
                {analysis.insights.map((insight, index) => {
                  const IconComponent = getIconComponent(insight.icon);
                  return (
                    <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getSeverityColor(insight.severity)}`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium font-roboto">{insight.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {insight.category}
                          </Badge>
                        </div>
                        <p className="text-sm font-open-sans text-gray-600">{insight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h4 className="font-medium font-roboto">AI Recommendations</h4>
                {analysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <p className="text-sm font-open-sans">{recommendation}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Implementation Note</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  These recommendations are AI-generated based on statistical analysis. 
                  Please validate with domain expertise before implementation.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAnalysis;
