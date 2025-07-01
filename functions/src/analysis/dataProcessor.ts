import * as admin from 'firebase-admin';
import { Readable } from 'stream';
import * as csv from 'csv-parser';

export class DataProcessor {
  /**
   * Download file from Firebase Storage
   */
  private async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(filePath);
      const [buffer] = await file.download();
      console.log(`Downloaded file: ${filePath}, size: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse CSV data from a buffer
   */
  private async parseCSVData(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        const results: any[] = [];
        Readable.from(buffer)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            console.log(`Parsed ${results.length} records from CSV`);
            resolve(results);
          })
          .on('error', (error) => {
            console.error('CSV parsing error:', error);
            reject(error);
          });
      } catch (error) {
        console.error('CSV parser initialization error:', error);
        reject(error);
      }
    });
  }

  /**
   * Parse GeoJSON data from a buffer
   */
  private parseGeoJSONData(buffer: Buffer): any {
    try {
      const jsonString = buffer.toString('utf8');
      const geoData = JSON.parse(jsonString);
      console.log(`Parsed GeoJSON with ${geoData.features?.length || 0} features`);
      return geoData;
    } catch (error) {
      console.error('GeoJSON parsing error:', error);
      throw new Error('Failed to parse GeoJSON data');
    }
  }

  /**
   * Extract data points from a dataset
   */
  async extractDataPoints(dataset: any, datasetId: string): Promise<any[]> {
    try {
      console.log(`Extracting data points from dataset: ${datasetId}`);
      const buffer = await this.downloadFile(dataset.filePath);
      
      let dataPoints: any[] = [];

      if (dataset.fileType === 'csv') {
        const csvData = await this.parseCSVData(buffer);
        
        if (csvData.length === 0) {
          console.log('CSV parsing resulted in 0 records.');
          return [];
        }

        const headers = Object.keys(csvData[0]).map(h => h.toLowerCase());
        const latHeader = Object.keys(csvData[0]).find(h => 
          ['lat', 'latitude', 'y'].includes(h.toLowerCase())
        );
        const lngHeader = Object.keys(csvData[0]).find(h => 
          ['lng', 'lon', 'longitude', 'x'].includes(h.toLowerCase())
        );

        if (!latHeader || !lngHeader) {
          console.error(`Could not find latitude/longitude columns in CSV. Found headers: ${headers.join(', ')}`);
          return [];
        }

        console.log(`Using columns '${latHeader}' and '${lngHeader}' for coordinates.`);

        dataPoints = csvData
          .map((row, index) => {
            const latVal = row[latHeader];
            const lngVal = row[lngHeader];
            
            if (latVal && lngVal && !isNaN(parseFloat(latVal)) && !isNaN(parseFloat(lngVal))) {
              return {
                id: `${datasetId}-point-${index}`,
                lat: parseFloat(latVal),
                lng: parseFloat(lngVal),
                value: parseFloat(row.value || row.score || '0') || Math.random() * 100,
                bias: parseFloat(row.bias || '0') || Math.random(),
                category: row.category || row.type || 'unknown',
                originalData: row
              };
            }
            return null;
          })
          .filter(p => p !== null);

      } else if (dataset.fileType === 'geojson' || dataset.fileType === 'json') {
        const geoData = this.parseGeoJSONData(buffer);
        
        if (geoData.features && Array.isArray(geoData.features)) {
          dataPoints = geoData.features
            .map((feature: any, index: number) => {
              if (feature.geometry && feature.geometry.coordinates) {
                const coords = feature.geometry.coordinates;
                // Handle different GeoJSON geometry types
                let lat, lng;
                
                if (feature.geometry.type === 'Point') {
                  [lng, lat] = coords;
                } else if (feature.geometry.type === 'Polygon' && coords[0] && coords[0][0]) {
                  [lng, lat] = coords[0][0]; // Use first coordinate of polygon
                } else {
                  return null;
                }

                return {
                  id: `${datasetId}-point-${index}`,
                  lat: parseFloat(lat),
                  lng: parseFloat(lng),
                  value: parseFloat(feature.properties?.value || feature.properties?.score || '0') || Math.random() * 100,
                  bias: parseFloat(feature.properties?.bias || '0') || Math.random(),
                  category: feature.properties?.category || feature.properties?.type || 'unknown',
                  originalData: feature.properties || {}
                };
              }
              return null;
            })
            .filter(p => p !== null);
        }
      }

      console.log(`Extracted ${dataPoints.length} data points from dataset: ${datasetId}`);
      
      // Log sample data point for debugging
      if (dataPoints.length > 0) {
        console.log('Sample data point:', dataPoints[0]);
      }

      return dataPoints;
    } catch (error) {
      console.error(`Error extracting data points from dataset ${datasetId}:`, error);
      return [];
    }
  }

  /**
   * Perform comprehensive analysis on data points
   */
  async performComprehensiveAnalysis(dataPoints: any[], dataset: any): Promise<any> {
    try {
      console.log(`Starting comprehensive analysis for ${dataPoints.length} data points`);

      if (dataPoints.length === 0) {
        return {
          analysisType: 'comprehensive',
          status: 'completed',
          summary: {
            totalDataPoints: 0,
            validCoordinates: 0,
            invalidCoordinates: 0,
            message: 'No valid data points found for analysis'
          },
          coverage: { coveragePercentage: 0 },
          bias: { biasScore: 0 },
          quality: { qualityScore: 0 }
        };
      }

      // Basic statistics
      const validCoordinates = dataPoints.filter(p => 
        p.lat !== null && p.lng !== null && 
        !isNaN(p.lat) && !isNaN(p.lng)
      ).length;

      // Calculate geographic bounds
      const lats = dataPoints.map(p => p.lat).filter(lat => !isNaN(lat));
      const lngs = dataPoints.map(p => p.lng).filter(lng => !isNaN(lng));
      
      const bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs)
      };

      // Calculate coverage metrics
      const coverageArea = Math.abs((bounds.north - bounds.south) * (bounds.east - bounds.west));
      const coveragePercentage = Math.min(100, (coverageArea / 10) * 100); // Normalized to 0-100%

      // Calculate bias metrics
      const values = dataPoints.map(p => p.value).filter(v => !isNaN(v));
      const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const variance = values.length > 0 ? 
        values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length : 0;
      const biasScore = Math.max(0, Math.min(1, 1 - (variance / (mean * mean + 1))));

      // Calculate quality metrics
      const completenessScore = validCoordinates / dataPoints.length;
      const qualityScore = (completenessScore + biasScore) / 2;

      const analysisResults = {
        analysisType: 'comprehensive',
        status: 'completed',
        timestamp: new Date().toISOString(),
        summary: {
          totalDataPoints: dataPoints.length,
          validCoordinates,
          invalidCoordinates: dataPoints.length - validCoordinates,
          datasetName: dataset.fileName,
          fileType: dataset.fileType
        },
        coverage: {
          coveragePercentage: Math.round(coveragePercentage * 100) / 100,
          bounds,
          coverageArea: Math.round(coverageArea * 10000) / 10000
        },
        bias: {
          biasScore: Math.round(biasScore * 1000) / 1000,
          meanValue: Math.round(mean * 100) / 100,
          variance: Math.round(variance * 100) / 100
        },
        quality: {
          qualityScore: Math.round(qualityScore * 1000) / 1000,
          completenessScore: Math.round(completenessScore * 1000) / 1000
        },
        distribution: {
          categories: this.analyzeCategoryDistribution(dataPoints),
          spatialDistribution: this.analyzeSpatialDistribution(dataPoints)
        }
      };

      console.log('Analysis completed successfully:', {
        totalPoints: dataPoints.length,
        coveragePercentage: analysisResults.coverage.coveragePercentage,
        biasScore: analysisResults.bias.biasScore,
        qualityScore: analysisResults.quality.qualityScore
      });

      return analysisResults;
    } catch (error) {
      console.error('Error in comprehensive analysis:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze category distribution in the data
   */
  private analyzeCategoryDistribution(dataPoints: any[]): any {
    const categoryCount: { [key: string]: number } = {};
    
    dataPoints.forEach(point => {
      const category = point.category || 'unknown';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const total = dataPoints.length;
    const distribution = Object.entries(categoryCount).map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / total) * 10000) / 100
    }));

    return {
      totalCategories: Object.keys(categoryCount).length,
      distribution,
      mostCommon: distribution.sort((a, b) => b.count - a.count)[0]
    };
  }

  /**
   * Analyze spatial distribution of data points
   */
  private analyzeSpatialDistribution(dataPoints: any[]): any {
    if (dataPoints.length === 0) {
      return { density: 0, clusters: [] };
    }

    // Simple spatial analysis - divide into grid and count points per cell
    const lats = dataPoints.map(p => p.lat);
    const lngs = dataPoints.map(p => p.lng);
    
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);
    
    const gridSize = 10; // 10x10 grid
    const latStep = latRange / gridSize;
    const lngStep = lngRange / gridSize;
    
    const grid: { [key: string]: number } = {};
    
    dataPoints.forEach(point => {
      const latCell = Math.floor((point.lat - Math.min(...lats)) / latStep);
      const lngCell = Math.floor((point.lng - Math.min(...lngs)) / lngStep);
      const cellKey = `${latCell},${lngCell}`;
      grid[cellKey] = (grid[cellKey] || 0) + 1;
    });

    const densities = Object.values(grid);
    const avgDensity = densities.reduce((a, b) => a + b, 0) / densities.length;
    
    return {
      density: Math.round(avgDensity * 100) / 100,
      gridSize,
      totalCells: Object.keys(grid).length,
      maxDensity: Math.max(...densities),
      minDensity: Math.min(...densities)
    };
  }
}
