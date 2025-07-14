// Shared utility for calculating live stats from data points
import type { DataPoint as BaseDataPoint } from '@/utils/spatialAnalysis';
type DataPoint = BaseDataPoint & { coverageBias?: number };

export function calculateLiveStats(dataPoints: DataPoint[]) {
  if (dataPoints.length === 0) {
    return {
      avgValue: 0,
      avgBias: 0,
      giniCoefficient: 0,
      highBiasCount: 0,
      coverageScore: 0
    };
  }

  // Calculate average value and bias
  const avgValue = dataPoints.reduce((sum, p) => sum + (p.value || 0), 0) / dataPoints.length;
  const avgBias = dataPoints.reduce((sum, p) => sum + (p.bias || 0), 0) / dataPoints.length;

  // Calculate Gini coefficient based on bias values
  const biasValues = dataPoints.map(p => p.bias || 0).sort((a, b) => a - b);
  let giniSum = 0;
  const n = biasValues.length;
  const mean = avgBias;

  if (mean > 0) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        giniSum += Math.abs(biasValues[i] - biasValues[j]);
      }
    }
  }
  const giniCoefficient = mean > 0 ? giniSum / (2 * n * n * mean) : 0;

  // Count high bias points (bias > 0.6)
  const highBiasCount = dataPoints.filter(p => (p.bias || 0) > 0.6).length;

  // Improved geographical coverage calculation
  // Based on how well distributed the data points are across regions
  const lats = dataPoints.map(p => p.lat);
  const lngs = dataPoints.map(p => p.lng);
  if (lats.length === 0) return { avgValue, avgBias, giniCoefficient, highBiasCount, coverageScore: 0 };
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);
  const gridSize = 10; // 10x10 grid
  const latStep = (latMax - latMin) / gridSize;
  const lngStep = (lngMax - lngMin) / gridSize;
  const occupiedCells = new Set<string>();
  dataPoints.forEach(point => {
    if (latStep > 0 && lngStep > 0) {
      const gridLat = Math.floor((point.lat - latMin) / latStep);
      const gridLng = Math.floor((point.lng - lngMin) / lngStep);
      occupiedCells.add(`${gridLat}-${gridLng}`);
    }
  });
  // Coverage score: percentage of grid cells that have data points
  const totalCells = gridSize * gridSize;
  const coverageScore = (occupiedCells.size / totalCells) * 100;
  return {
    avgValue,
    avgBias,
    giniCoefficient: Math.min(1, giniCoefficient), // Cap at 1
    highBiasCount,
    coverageScore: Math.min(100, coverageScore) // Cap at 100%
  };
}
