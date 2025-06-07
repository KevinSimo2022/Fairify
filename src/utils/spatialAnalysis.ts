/**
 * Spatial analysis utilities for regional boundary operations
 * Handles point-in-polygon calculations and regional assignments
 */

export interface RegionalBoundary {
  type: 'Feature';
  properties: {
    name: string;
    code: string;
    population?: number;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface BoundaryCollection {
  type: 'FeatureCollection';
  features: RegionalBoundary[];
}

export interface DataPoint {
  id: string;
  lat: number;
  lng: number;
  value?: number;
  bias?: number;
  category?: string;
  region?: string;
  properties?: Record<string, any>;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Find which region a data point belongs to
 */
export function assignPointToRegion(point: DataPoint, boundaries: BoundaryCollection): string | null {
  const coords: [number, number] = [point.lng, point.lat]; // Note: GeoJSON uses [lng, lat] format

  for (const feature of boundaries.features) {
    if (feature.geometry.type === 'Polygon') {
      // Check main polygon
      const polygon = feature.geometry.coordinates[0];
      if (pointInPolygon(coords, polygon)) {
        return feature.properties.name;
      }
    }
  }

  return null; // Point doesn't fall within any region
}

/**
 * Assign all data points to their respective regions
 */
export function assignDataPointsToRegions(
  dataPoints: DataPoint[], 
  boundaries: BoundaryCollection
): DataPoint[] {
  return dataPoints.map(point => ({
    ...point,
    region: assignPointToRegion(point, boundaries)
  }));
}

/**
 * Calculate regional statistics
 */
export interface RegionalStats {
  regionName: string;
  pointCount: number;
  coverage: number;
  averageValue: number;
  averageBias: number;
  giniCoefficient: number;
  population?: number;
  dataPointsPerCapita?: number;
}

export function calculateRegionalStats(
  dataPoints: DataPoint[], 
  boundaries: BoundaryCollection
): RegionalStats[] {
  const regionalData: { [region: string]: DataPoint[] } = {};
  
  // Group points by region
  dataPoints.forEach(point => {
    if (point.region) {
      if (!regionalData[point.region]) {
        regionalData[point.region] = [];
      }
      regionalData[point.region].push(point);
    }
  });

  // Calculate statistics for each region
  const stats: RegionalStats[] = [];
  
  boundaries.features.forEach(boundary => {
    const regionName = boundary.properties.name;
    const regionPoints = regionalData[regionName] || [];
    const population = boundary.properties.population;

    // Calculate averages
    const totalValue = regionPoints.reduce((sum, p) => sum + (p.value || 0), 0);
    const totalBias = regionPoints.reduce((sum, p) => sum + (p.bias || 0), 0);
    const averageValue = regionPoints.length > 0 ? totalValue / regionPoints.length : 0;
    const averageBias = regionPoints.length > 0 ? totalBias / regionPoints.length : 0;

    // Calculate Gini coefficient for the region
    const giniCoefficient = calculateGiniCoefficient(regionPoints.map(p => p.value || 0));

    // Calculate coverage (simplified as point density)
    const coverage = regionPoints.length > 0 ? Math.min(100, regionPoints.length * 10) : 0;

    stats.push({
      regionName,
      pointCount: regionPoints.length,
      coverage,
      averageValue,
      averageBias,
      giniCoefficient,
      population,
      dataPointsPerCapita: population ? regionPoints.length / population * 100000 : undefined
    });
  });

  return stats;
}

/**
 * Calculate Gini coefficient for a set of values
 */
export function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;

  // Sort values in ascending order
  const sortedValues = values.slice().sort((a, b) => a - b);
  const n = sortedValues.length;
  const mean = sortedValues.reduce((sum, val) => sum + val, 0) / n;

  if (mean === 0) return 0;

  // Calculate Gini coefficient
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      numerator += Math.abs(sortedValues[i] - sortedValues[j]);
    }
  }

  return numerator / (2 * n * n * mean);
}

/**
 * Calculate coverage ratio for each region
 */
export function calculateCoverageRatio(regionalStats: RegionalStats[]): { [region: string]: number } {
  const totalPoints = regionalStats.reduce((sum, stat) => sum + stat.pointCount, 0);
  const totalPopulation = regionalStats.reduce((sum, stat) => sum + (stat.population || 0), 0);

  const coverageRatio: { [region: string]: number } = {};

  regionalStats.forEach(stat => {
    if (totalPoints > 0 && totalPopulation > 0 && stat.population) {
      const expectedRatio = stat.population / totalPopulation;
      const actualRatio = stat.pointCount / totalPoints;
      coverageRatio[stat.regionName] = actualRatio / expectedRatio;
    } else {
      coverageRatio[stat.regionName] = 0;
    }
  });

  return coverageRatio;
}

/**
 * Get default boundaries based on country
 */
export async function getBoundariesForCountry(country: 'kenya' | 'south-africa'): Promise<BoundaryCollection> {
  // In a real implementation, these would be loaded from the JSON files
  // For now, we'll return simplified boundaries
  
  if (country === 'kenya') {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Nairobi', code: 'NRB', population: 4397073 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[36.6444, -1.444], [37.1068, -1.444], [37.1068, -1.163], [36.6444, -1.163], [36.6444, -1.444]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Central', code: 'CEN', population: 4383743 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[36.2, -1.3], [37.5, -1.3], [37.5, 0.2], [36.2, 0.2], [36.2, -1.3]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Coast', code: 'CST', population: 3325307 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[38.5, -4.8], [41.9, -4.8], [41.9, -1.0], [38.5, -1.0], [38.5, -4.8]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Eastern', code: 'EST', population: 5668123 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[37.0, -3.0], [40.0, -3.0], [40.0, 1.0], [37.0, 1.0], [37.0, -3.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Rift Valley', code: 'RV', population: 10006805 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[34.0, -2.5], [37.5, -2.5], [37.5, 3.5], [34.0, 3.5], [34.0, -2.5]]]
          }
        }
      ]
    };
  } else {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Western Cape', code: 'WC', population: 6621126 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[17.5, -34.8], [23.0, -34.8], [23.0, -31.0], [17.5, -31.0], [17.5, -34.8]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Gauteng', code: 'GP', population: 15176115 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[27.0, -26.5], [29.0, -26.5], [29.0, -25.0], [27.0, -25.0], [27.0, -26.5]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'KwaZulu-Natal', code: 'KZN', population: 11289086 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[28.5, -31.5], [32.9, -31.5], [32.9, -26.5], [28.5, -26.5], [28.5, -31.5]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Eastern Cape', code: 'EC', population: 6734001 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[22.5, -33.8], [30.0, -33.8], [30.0, -30.5], [22.5, -30.5], [22.5, -33.8]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Limpopo', code: 'LIM', population: 5982584 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[26.0, -25.0], [31.5, -25.0], [31.5, -22.0], [26.0, -22.0], [26.0, -25.0]]]
          }
        }
      ]
    };
  }
}

/**
 * Detect country from data points based on coordinate bounds
 */
export function detectCountryFromCoordinates(dataPoints: DataPoint[]): 'kenya' | 'south-africa' | 'unknown' {
  if (dataPoints.length === 0) return 'unknown';

  const lats = dataPoints.map(p => p.lat);
  const lngs = dataPoints.map(p => p.lng);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Kenya bounds: approximately -5°S to 5°N, 34°E to 42°E
  if (minLat >= -5 && maxLat <= 5 && minLng >= 34 && maxLng <= 42) {
    return 'kenya';
  }
  
  // South Africa bounds: approximately -35°S to -22°S, 16°E to 33°E
  if (minLat >= -35 && maxLat <= -22 && minLng >= 16 && maxLng <= 33) {
    return 'south-africa';
  }

  return 'unknown';
}
