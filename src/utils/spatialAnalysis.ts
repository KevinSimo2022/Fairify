/**
 * Spatial analysis utilities for regional boundary operations
 * Handles point-in-polygon calculations and regional assignments
 */

import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { cameroonRegionPopulations, rwandaRegionPopulations, kenyaRegionPopulations } from './regionPopulations';

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
 * Helper to extract region name from properties
 */
export function getRegionNameFromProperties(properties: Record<string, any>): string | undefined {
  // Prioritize 'shapeName' for Cameroon, then try common keys for region names
  return (
    properties.shapeName ||
    properties.name ||
    properties.NAME_1 ||
    properties.NAME ||
    properties.admin1Name ||
    properties.admin ||
    properties.region ||
    properties.province ||
    properties.district ||
    undefined
  );
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
        // Use robust region name extraction
        return getRegionNameFromProperties(feature.properties) || null;
      }
    }
  }

  return null; // Point doesn't fall within any region
}

/**
 * Assign all data points to their respective regions and filter out unknown regions
 */
export function assignDataPointsToRegions(
  dataPoints: DataPoint[], 
  boundaries: BoundaryCollection
): DataPoint[] {
  return dataPoints
    .map(point => ({
      ...point,
      region: assignPointToRegion(point, boundaries)
    }))
    .filter(point => point.region !== null && point.region !== undefined);
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
  
  // Group points by region, only including points with valid regions
  dataPoints.forEach(point => {
    if (point.region && point.region !== null && point.region !== undefined) {
      if (!regionalData[point.region]) {
        regionalData[point.region] = [];
      }
      regionalData[point.region].push(point);
    }
  });

  // Calculate statistics for each region that has data points
  const stats: RegionalStats[] = [];
  
  boundaries.features.forEach(boundary => {
    // Use robust region name extraction
    const regionName = getRegionNameFromProperties(boundary.properties);
    const regionPoints = regionName ? (regionalData[regionName] || []) : [];
    
    // Only include regions that have at least one data point
    if (regionPoints.length > 0) {
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
        regionName: regionName || 'Unknown',
        pointCount: regionPoints.length,
        coverage,
        averageValue,
        averageBias,
        giniCoefficient,
        population,
        dataPointsPerCapita: population ? regionPoints.length / population * 100000 : undefined
      });
    }
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

  console.log('Coverage calculation debug:', {
    totalPoints,
    totalPopulation,
    regionalStats: regionalStats.map(s => ({
      name: s.regionName,
      points: s.pointCount,
      population: s.population
    }))
  });

  regionalStats.forEach(stat => {
    if (totalPoints > 0 && totalPopulation > 0 && stat.population && stat.population > 0) {
      const expectedRatio = stat.population / totalPopulation;
      const actualRatio = stat.pointCount / totalPoints;
      const ratio = actualRatio / expectedRatio;
      
      console.log(`Coverage ratio for ${stat.regionName}:`, {
        points: stat.pointCount,
        population: stat.population,
        expectedRatio: expectedRatio.toFixed(4),
        actualRatio: actualRatio.toFixed(4),
        ratio: ratio.toFixed(4)
      });
      
      coverageRatio[stat.regionName] = ratio;
    } else {
      console.log(`Zero coverage for ${stat.regionName}:`, {
        totalPoints,
        totalPopulation,
        statPopulation: stat.population,
        pointCount: stat.pointCount
      });
      coverageRatio[stat.regionName] = 0;
    }
  });

  return coverageRatio;
}

/**
 * Get default boundaries based on country
 */
export async function getBoundariesForCountry(
  country: 'kenya' | 'rwanda' | 'cameroon'
): Promise<BoundaryCollection> {
  let filename = '';

  if (country === 'kenya') {
    filename = 'geoBoundaries-KEN-ADM1.geojson';
  } else if (country === 'rwanda') {
    filename = 'geoBoundaries-RWA-ADM1.geojson';
  } else if (country === 'cameroon') {
    filename = 'geoBoundaries-CMR-ADM1.geojson';
  }

  if (filename) {
    try {
      const fileRef = storageRef(storage, `region-boundaries/${filename}`);
      const downloadUrl = await getDownloadURL(fileRef);
      const response = await fetch(downloadUrl);
      if (response.ok) {
        const geojson = await response.json();
        if (geojson.type === 'FeatureCollection') {
          // Inject population for Cameroon, Rwanda, or Kenya if missing
          if (country === 'cameroon') {
            geojson.features = geojson.features.map((feature: any) => {
              const regionName = feature.properties?.shapeName;
              const population = cameroonRegionPopulations[regionName] || 0;
              if (!population) {
                console.warn(`Missing population for region: ${regionName}`);
              }
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  population,
                },
              };
            });
          } else if (country === 'rwanda') {
            geojson.features = geojson.features.map((feature: any) => {
              // Try all possible keys for region name
              const regionName = feature.properties?.shapeName || feature.properties?.name || feature.properties?.NAME_1;
              const population = rwandaRegionPopulations[regionName] || 0;
              if (!population) {
                console.warn(`Missing population for region: ${regionName}`);
              }
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  population,
                },
              };
            });
          } else if (country === 'kenya') {
            geojson.features = geojson.features.map((feature: any) => {
              const regionName = feature.properties?.shapeName || feature.properties?.name || feature.properties?.NAME_1;
              const population = kenyaRegionPopulations[regionName] || 0;
              if (!population) {
                console.warn(`Missing population for region: ${regionName}`);
              }
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  population,
                },
              };
            });
          }
          return geojson as BoundaryCollection;
        }
      } else {
        console.warn(`GeoJSON fetch failed: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.warn('Failed to fetch real boundaries for', country, e);
    }
  }

  // Fallback to demo boundaries
  if (country === 'kenya') {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Nairobi', code: 'NRB', population: 4397073 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[36.6, -1.5], [37.2, -1.5], [37.2, -1.1], [36.6, -1.1], [36.6, -1.5]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Central', code: 'CEN', population: 4383743 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[36.0, -1.5], [37.8, -1.5], [37.8, 0.5], [36.0, 0.5], [36.0, -1.5]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Coast', code: 'CST', population: 3325307 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[38.0, -5.0], [42.0, -5.0], [42.0, -1.0], [38.0, -1.0], [38.0, -5.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Eastern', code: 'EST', population: 5668123 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[37.0, -4.0], [40.5, -4.0], [40.5, 1.5], [37.0, 1.5], [37.0, -4.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'North Eastern', code: 'NE', population: 2310757 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[38.0, 1.0], [42.0, 1.0], [42.0, 5.0], [38.0, 5.0], [38.0, 1.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Nyanza', code: 'NYZ', population: 5442711 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[33.8, -2.0], [35.5, -2.0], [35.5, 0.8], [33.8, 0.8], [33.8, -2.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Rift Valley', code: 'RV', population: 10006805 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[34.0, -3.0], [37.5, -3.0], [37.5, 4.0], [34.0, 4.0], [34.0, -3.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Western', code: 'WST', population: 4334282 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[33.5, -1.5], [35.8, -1.5], [35.8, 1.8], [33.5, 1.8], [33.5, -1.5]]]
          }
        }
      ]
    };
  } else if (country === 'rwanda') {
    // Rwanda: 5 provinces (bounding boxes are rough and for demo only)
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'City of Kigali', code: 'KGL', population: 1745555 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[30.0, -1.95], [30.2, -1.95], [30.2, -1.85], [30.0, -1.85], [30.0, -1.95]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Northern Province', code: 'N', population: 2038928 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[29.5, -1.5], [30.0, -1.5], [30.0, -1.0], [29.5, -1.0], [29.5, -1.5]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Southern Province', code: 'S', population: 3029118 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[29.5, -2.5], [30.0, -2.5], [30.0, -1.95], [29.5, -1.95], [29.5, -2.5]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Eastern Province', code: 'E', population: 3563145 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[30.0, -2.5], [30.9, -2.5], [30.9, -1.0], [30.0, -1.0], [30.0, -2.5]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Western Province', code: 'W', population: 2896484 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[28.8, -2.5], [29.5, -2.5], [29.5, -1.0], [28.8, -1.0], [28.8, -2.5]]]
          }
        }
      ]
    };
  } else {
    // Cameroon: 10 regions (bounding boxes are rough and for demo only)
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Adamawa', code: 'ADA', population: 1200000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[12.0, 6.0], [15.0, 6.0], [15.0, 8.0], [12.0, 8.0], [12.0, 6.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Centre', code: 'CEN', population: 4000000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[11.0, 3.0], [13.0, 3.0], [13.0, 5.0], [11.0, 5.0], [11.0, 3.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'East', code: 'EST', population: 800000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[13.0, 2.0], [16.0, 2.0], [16.0, 5.0], [13.0, 5.0], [13.0, 2.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Far North', code: 'FNO', population: 3500000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[13.0, 10.0], [15.0, 10.0], [15.0, 13.0], [13.0, 13.0], [13.0, 10.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Littoral', code: 'LIT', population: 3600000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[9.0, 3.0], [11.0, 3.0], [11.0, 5.0], [9.0, 5.0], [9.0, 3.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'North', code: 'NOR', population: 2400000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[12.0, 8.0], [15.0, 8.0], [15.0, 10.0], [12.0, 10.0], [12.0, 8.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Northwest', code: 'NWR', population: 1800000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[9.0, 6.0], [11.0, 6.0], [11.0, 8.0], [9.0, 8.0], [9.0, 6.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'West', code: 'WES', population: 1800000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[9.0, 5.0], [11.0, 5.0], [11.0, 6.0], [9.0, 6.0], [9.0, 5.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'South', code: 'SOU', population: 800000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[11.0, 1.0], [13.0, 1.0], [13.0, 3.0], [11.0, 3.0], [11.0, 1.0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Southwest', code: 'SWR', population: 1400000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[9.0, 3.0], [9.5, 3.0], [9.5, 6.0], [9.0, 6.0], [9.0, 3.0]]]
          }
        }
      ]
    };
  }
}

/**
 * Detect country from data points based on coordinate bounds
 */
export function detectCountryFromCoordinates(dataPoints: DataPoint[]): 'kenya' | 'rwanda' | 'cameroon' | 'unknown' {
  if (dataPoints.length === 0) return 'unknown';

  const lats = dataPoints.map(p => p.lat);
  const lngs = dataPoints.map(p => p.lng);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Kenya bounds: approximately -5°S to 5.5°N, 33.5°E to 42.5°E (expanded to be more inclusive)
  if (minLat >= -5.5 && maxLat <= 5.5 && minLng >= 33.5 && maxLng <= 42.5) {
    return 'kenya';
  }
  // Rwanda bounds: approximately -3°S to -1°S, 28.8°E to 31.2°E
  if (minLat >= -3 && maxLat <= -1 && minLng >= 28.8 && maxLng <= 31.2) {
    return 'rwanda';
  }
  // Cameroon bounds: approximately 1.5°N to 13°N, 8.5°E to 16.5°E
  if (minLat >= 1.5 && maxLat <= 13 && minLng >= 8.5 && maxLng <= 16.5) {
    return 'cameroon';
  }

  return 'unknown';
}

/**
 * Annotate data points with their region's coverage bias ratio and filter out unknown regions
 */
export function annotateDataPointsWithCoverageBias(
  dataPoints: DataPoint[],
  regionalStats: RegionalStats[]
): DataPoint[] {
  const coverageRatio = calculateCoverageRatio(regionalStats);
  
  console.log('Coverage ratios calculated:', coverageRatio);
  
  return dataPoints
    .filter(point => point.region !== null && point.region !== undefined)
    .map(point => {
      const bias = point.region ? coverageRatio[point.region] ?? 0 : 0;
      
      // Log first few points for debugging
      if (Math.random() < 0.01) { // Log 1% of points randomly
        console.log(`Point coverage bias: region=${point.region}, bias=${bias}`);
      }
      
      return {
        ...point,
        coverageBias: bias
      };
    });
}
