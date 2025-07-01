import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Brain, RefreshCw, TrendingUp, AlertTriangle, CheckCircle, BarChart3, MapPin, Lightbulb, MessageSquare } from 'lucide-react';
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
  category: 'coverage_gap' | 'regional_importance' | 'sampling_issue' | 'methodological_flaw' | 'data_quality';
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
  userContext?: string[];
  liveStats: {
    avgValue: number;
    avgBias: number;
    giniCoefficient: number;
    highBiasCount: number;
    coverageScore: number;
  };
  className?: string;
  allRegionNames?: string[];
  regionsWithNoData?: string[];
  highImportanceRegions?: string[];
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ dataPoints, datasetName, userContext, liveStats, className, allRegionNames, regionsWithNoData, highImportanceRegions }) => {
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

      // Create enhanced analysis prompt focusing on bias sources and research improvements
      const prompt = `
        You are an expert research methodologist and bias detection specialist with deep knowledge of data collection challenges, sampling issues, and geographical representation problems.
        
        CRITICAL ANALYSIS TASK: Identify specific sources of bias in this geospatial dataset and provide actionable improvements for the researcher.
        
        Dataset: "${datasetName || 'Dataset'}"
        
        BIAS INDICATORS:
        - Total data points: ${dataSummary.totalPoints}
        - Bias score: ${dataSummary.avgBias.toFixed(3)} (0=no bias, 1=maximum bias)
        - Gini coefficient: ${dataSummary.giniCoefficient.toFixed(3)} (inequality measure)
        - Coverage gaps: ${(100 - dataSummary.coverageScore).toFixed(1)}% of region uncovered
        - High-bias hotspots: ${dataSummary.highBiasPercentage.toFixed(1)}% of data points
        - Geographic clustering: ${dataSummary.geographicSpread}
        - Bias distribution: ${dataSummary.biasDistribution.high} high-bias, ${dataSummary.biasDistribution.medium} medium-bias, ${dataSummary.biasDistribution.low} low-bias points
        
        GEOGRAPHICAL BIAS PATTERNS:
        - Region: ${dataSummary.geographicalAnalysis.primaryRegion}
        - Coordinate range: ${dataSummary.geographicalAnalysis.bounds}
        - Urban vs Rural bias: ${dataSummary.geographicalAnalysis.ruralUrbanSplit}
        - Data clustering: ${dataSummary.regionalClusters.map(c => `${c.name}: ${c.pointCount} points (bias: ${c.avgBias.toFixed(2)})`).join('; ')}
        
        ${userContext && userContext.length > 0 ? `
        RESEARCHER CONTEXT:
        ${userContext.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n        ')}
        
        FOCUS: Address the specific research context above and identify bias sources related to these aspects.
        ` : ''}
        
        ANALYSIS REQUIREMENTS:
        1. IDENTIFY SPECIFIC REGIONAL GAPS: Which important regions have insufficient data coverage and why this matters?
        2. QUANTIFY REGIONAL IMPORTANCE: How much do these undersampled regions contribute to or are affected by the research topic?
        3. ASSESS METHODOLOGICAL IMPACT: How do these coverage gaps affect research validity and conclusions?
        4. PROVIDE RESEARCH METHODOLOGY IMPROVEMENTS: Give specific, actionable steps to improve sampling strategy and data collection approach
        5. SUGGEST VALIDATION METHODS: How can the researcher verify and measure methodological improvements?
        
        FOCUS ON REGIONAL COVERAGE ANALYSIS AND RESEARCH METHODOLOGY IMPROVEMENTS. USE ACTUAL REGION NAMES, NOT GENERIC LABELS.
        
        Please provide a JSON response with the following structure:
        {
          "summary": "1-sentence summary of main coverage gaps and impact",
          "insights": [
            {
              "category": "coverage_gap|regional_importance|sampling_issue|methodological_flaw|data_quality",
              "title": "Concise title with region name",
              "description": "Brief 2-3 sentence explanation: WHICH regions undersampled, WHY important, WHAT impact. Use actual region names.",
              "severity": "low|medium|high",
              "icon": "AlertTriangle|TrendingUp|MapPin|BarChart3"
            }
          ],
          "recommendations": [
            "SAMPLING: Brief action for specific regions with target numbers",
            "COVERAGE: Highlight one well-covered region and its importance",
            "METHOD: Specific collection improvement with measurable outcome"
          ]
        }
        
        CRITICAL: 
        - Use actual region names, not generic labels
        - Keep responses concise - max 3 sentences per insight description
        - At least one recommendation must highlight a well-covered important region
        - Focus on actionable improvements with specific numbers/targets
        - Ensure valid JSON only, no additional text.
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
        summary: `Coverage analysis of ${dataPoints.length} points in ${geographicalAnalysis.primaryRegion} shows ${
          liveStats.avgBias > 0.6 ? 'critical gaps needing immediate fixes' : 
          liveStats.avgBias > 0.3 ? 'moderate coverage issues' : 'manageable gaps with improvement opportunities'
        }. ${geographicalAnalysis.ruralUrbanSplit} distribution indicates accessibility-based sampling limitations.`,
        insights: [
          {
            category: 'coverage_gap',
            title: `${geographicalAnalysis.primaryRegion} Coverage Gaps`,
            description: `${liveStats.coverageScore.toFixed(1)}% coverage reveals ${liveStats.coverageScore > 70 ? 'minor' : 'significant'} gaps. ${liveStats.highBiasCount} points (${((liveStats.highBiasCount / dataPoints.length) * 100).toFixed(1)}%) show high gaps affecting critical regions.`,
            severity: liveStats.avgBias > 0.6 ? 'high' : liveStats.avgBias > 0.3 ? 'medium' : 'low',
            icon: 'AlertTriangle'
          },
          {
            category: 'regional_importance',
            title: 'Urban-Rural Imbalance',
            description: `Major cities (${geographicalAnalysis.majorCities.slice(0, 2).join(', ')}) oversample while important rural regions undersample. ${((dataPoints.length - liveStats.highBiasCount) / dataPoints.length * 100).toFixed(1)}% cluster in accessible areas.`,
            severity: liveStats.coverageScore > 70 ? 'low' : liveStats.coverageScore > 40 ? 'medium' : 'high',
            icon: 'MapPin'
          },
          {
            category: 'sampling_issue',
            title: 'Methodological Limitations',
            description: `Gini coefficient ${liveStats.giniCoefficient.toFixed(2)} shows unequal distribution. Oversampling accessible urban areas while undersampling significant rural regions.`,
            severity: 'medium',
            icon: 'BarChart3'
          }
        ],
        recommendations: [
          `TARGET SAMPLING: Add ${Math.ceil(dataPoints.length * 0.4)} points in ${geographicalAnalysis.primaryRegion === 'Kenya' ? 'Northern Kenya arid zones' : 'remote regions'} using mobile teams.`,
          `STRONG COVERAGE: ${geographicalAnalysis.primaryRegion === 'Kenya' ? 'Central Kenya (' + Math.floor(dataPoints.length * 0.3) + ' points) covers 60% population, critical for food security policy' : 'Urban centers well-covered, important for population impact assessment'}.`,
          `IMPROVE ACCESS: Deploy community monitors in ${geographicalAnalysis.primaryRegion === 'Kenya' ? 'Northern pastoral areas' : 'remote regions'}. Target <0.3 bias, +45% rural representation.`
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackAnalysis = (): AnalysisResult => {
    const hasContext = userContext && userContext.length > 0;
    return {
      summary: `Regional coverage analysis ready for "${datasetName || 'Selected Dataset'}".${hasContext ? ' Context will guide targeted analysis.' : ''} System will identify coverage gaps and methodological issues.`,
      insights: [
        {
          category: 'methodological_flaw',
          title: 'Analysis System Ready',
          description: `Regional coverage algorithms configured for geographic gap detection and sampling bias identification.${hasContext ? ' Context will focus on relevant coverage issues.' : ''}`,
          severity: 'medium',
          icon: 'RefreshCw'
        },
        {
          category: 'coverage_gap',
          title: 'Coverage Assessment Prepared',
          description: 'System will identify undersampled areas with high research importance. Analysis includes accessibility gaps and demographic representation issues.',
          severity: 'low',
          icon: 'CheckCircle'
        },
        {
          category: 'regional_importance',
          title: 'Regional Impact Analysis Pending',
          description: 'Will provide insights on underrepresented regions and research impact. Includes contribution analysis and representativeness improvements.',
          severity: 'low',
          icon: 'MapPin'
        }
      ],
      recommendations: [
        'SETUP: Document sampling strategy and collection methods for precise analysis',
        'CONTEXT: Note accessibility limitations and coverage challenges for targeted insights',
        'VALIDATION: Prepare reference data for bias quantification and representativeness checks'
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
    // Add more regions as needed
    else if (latMin >= -90 && latMax <= 90 && lngMin >= -180 && lngMax <= 180) {
      // Determine broader regions
      if (latMin >= -35 && latMax <= 37 && lngMin >= -18 && lngMax <= 51) {
        primaryRegion = 'Africa';
        majorCities = ['Cairo', 'Lagos', 'Nairobi', 'Casablanca'];
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
    
    // Determine region names based on coordinates
    const getRegionName = (lat: number, lng: number, primaryRegion: string) => {
      if (primaryRegion === 'Kenya') {
        if (lat > 0) return 'Northern Kenya';
        if (lat < -2) return 'Southern Kenya';
        if (lng < 36) return 'Western Kenya';
        if (lng > 39) return 'Eastern Kenya';
        return 'Central Kenya';
      } else {
        // Generic regional naming for other areas
        if (lat > 0) return 'Northern Region';
        if (lat < -10) return 'Southern Region';
        if (lng < 0) return 'Western Region';
        if (lng > 30) return 'Eastern Region';
        return 'Central Region';
      }
    };

    const geographicalAnalysis = analyzeGeographicalDistribution(points);
    
    points.forEach((point, index) => {
      if (processedPoints.has(index)) return;
      
      const regionName = getRegionName(point.lat, point.lng, geographicalAnalysis.primaryRegion);
      
      const cluster = {
        name: regionName,
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
    
    // Merge clusters with same names and sort by point count
    const mergedClusters = new Map();
    clusters.forEach(cluster => {
      if (mergedClusters.has(cluster.name)) {
        const existing = mergedClusters.get(cluster.name);
        existing.pointCount += cluster.pointCount;
        existing.avgBias = (existing.avgBias + cluster.avgBias) / 2;
      } else {
        mergedClusters.set(cluster.name, cluster);
      }
    });
    
    return Array.from(mergedClusters.values())
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
  }, [datasetName, dataPoints.length, liveStats.avgBias, liveStats.giniCoefficient, userContext]);

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

  const getCategoryDisplay = (category: string) => {
    switch (category) {
      case 'coverage_gap': return 'Coverage Gap';
      case 'regional_importance': return 'Regional Impact';
      case 'sampling_issue': return 'Sampling Issue';
      case 'methodological_flaw': return 'Method Flaw';
      case 'data_quality': return 'Data Quality';
      default: return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <Card className={className}>
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
              <TabsTrigger value="summary">Bias Summary</TabsTrigger>
              <TabsTrigger value="insights">Bias Sources</TabsTrigger>
              <TabsTrigger value="recommendations">Improvements</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4 mt-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-open-sans leading-relaxed">{analysis.summary}</p>
              </div>
              {/* Show user context if available */}
              {userContext && userContext.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <h4 className="text-sm font-medium text-blue-800 font-roboto">Dataset Context Used</h4>
                  </div>
                  <div className="space-y-1">
                    {userContext.map((context, index) => (
                      <p key={index} className="text-xs text-blue-700 font-open-sans">
                        • {context}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
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
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium font-roboto text-gray-800">Regional Coverage Gaps & Methodological Issues</h4>
                  <Badge variant="outline" className="text-xs">
                    {analysis.insights.length} issue{analysis.insights.length > 1 ? 's' : ''} identified
                  </Badge>
                </div>
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
                            {getCategoryDisplay(insight.category)}
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
                <h4 className="font-medium font-roboto">Research Methodology & Data Collection Improvements</h4>
                <p className="text-sm text-gray-600 font-open-sans mb-4">
                  Specific methodological changes to improve sampling strategy, data collection approach, and research design
                </p>
                {analysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-green-700">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-open-sans text-gray-800">{recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Research Methodology Note</span>
                </div>
                <p className="text-sm text-blue-700">
                  These recommendations are based on statistical bias detection and geographical analysis. 
                  Validate improvements through pilot testing, demographic comparison with census data, 
                  and consultation with local research experts before full implementation.
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
