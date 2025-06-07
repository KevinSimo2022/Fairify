"use strict";
/**
 * Enhanced spatial analysis module for Firebase Functions
 * Includes regional boundary support for Kenya and South Africa
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBoundariesForCountry = exports.detectCountryFromCoordinates = exports.getSouthAfricaBoundaries = exports.getKenyaBoundaries = exports.calculateGiniCoefficient = exports.calculateRegionalStats = exports.assignDataPointsToRegions = exports.assignPointToRegion = exports.pointInPolygon = void 0;
/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function pointInPolygon(point, polygon) {
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
exports.pointInPolygon = pointInPolygon;
/**
 * Find which region a data point belongs to
 */
function assignPointToRegion(point, boundaries) {
    const coords = [point.lng, point.lat]; // Note: GeoJSON uses [lng, lat] format
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
exports.assignPointToRegion = assignPointToRegion;
/**
 * Assign all data points to their respective regions
 */
function assignDataPointsToRegions(dataPoints, boundaries) {
    return dataPoints.map(point => {
        const region = assignPointToRegion(point, boundaries);
        return Object.assign(Object.assign({}, point), { region: region === null ? undefined : region });
    });
}
exports.assignDataPointsToRegions = assignDataPointsToRegions;
function calculateRegionalStats(dataPoints, boundaries) {
    const regionalData = {};
    // Group points by region
    dataPoints.forEach(point => {
        if (point.region) {
            if (!regionalData[point.region]) {
                regionalData[point.region] = [];
            }
            regionalData[point.region].push(point);
        }
    });
    // Calculate totals for coverage ratio
    const totalPoints = dataPoints.length;
    const totalPopulation = boundaries.features.reduce((sum, f) => sum + (f.properties.population || 0), 0);
    // Calculate statistics for each region
    const stats = [];
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
        // Calculate coverage ratio (actual vs expected based on population)
        let coverageRatio = 1;
        if (totalPoints > 0 && totalPopulation > 0 && population) {
            const expectedRatio = population / totalPopulation;
            const actualRatio = regionPoints.length / totalPoints;
            coverageRatio = expectedRatio > 0 ? actualRatio / expectedRatio : 0;
        }
        // Calculate coverage percentage (simplified as normalized point density)
        const coverage = Math.min(100, Math.max(0, coverageRatio * 100));
        stats.push({
            regionName,
            pointCount: regionPoints.length,
            coverage,
            averageValue,
            averageBias,
            giniCoefficient,
            population,
            dataPointsPerCapita: population ? regionPoints.length / population * 100000 : undefined,
            coverageRatio
        });
    });
    return stats;
}
exports.calculateRegionalStats = calculateRegionalStats;
/**
 * Calculate Gini coefficient for a set of values
 */
function calculateGiniCoefficient(values) {
    if (values.length === 0)
        return 0;
    // Sort values in ascending order
    const sortedValues = values.slice().sort((a, b) => a - b);
    const n = sortedValues.length;
    const mean = sortedValues.reduce((sum, val) => sum + val, 0) / n;
    if (mean === 0)
        return 0;
    // Calculate Gini coefficient
    let numerator = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            numerator += Math.abs(sortedValues[i] - sortedValues[j]);
        }
    }
    return numerator / (2 * n * n * mean);
}
exports.calculateGiniCoefficient = calculateGiniCoefficient;
/**
 * Get boundaries for Kenya
 */
function getKenyaBoundaries() {
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
                properties: { name: 'North Eastern', code: 'NE', population: 2310757 },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[38.5, 2.0], [42.0, 2.0], [42.0, 5.0], [38.5, 5.0], [38.5, 2.0]]]
                }
            },
            {
                type: 'Feature',
                properties: { name: 'Nyanza', code: 'NYZ', population: 5442711 },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[33.8, -1.8], [35.5, -1.8], [35.5, 0.5], [33.8, 0.5], [33.8, -1.8]]]
                }
            },
            {
                type: 'Feature',
                properties: { name: 'Rift Valley', code: 'RV', population: 10006805 },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[34.0, -2.5], [37.5, -2.5], [37.5, 3.5], [34.0, 3.5], [34.0, -2.5]]]
                }
            },
            {
                type: 'Feature',
                properties: { name: 'Western', code: 'WST', population: 4334282 },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[33.5, -1.0], [35.5, -1.0], [35.5, 1.5], [33.5, 1.5], [33.5, -1.0]]]
                }
            }
        ]
    };
}
exports.getKenyaBoundaries = getKenyaBoundaries;
/**
 * Get boundaries for South Africa
 */
function getSouthAfricaBoundaries() {
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
                properties: { name: 'Eastern Cape', code: 'EC', population: 6734001 },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[22.5, -33.8], [30.0, -33.8], [30.0, -30.5], [22.5, -30.5], [22.5, -33.8]]]
                }
            },
            {
                type: 'Feature',
                properties: { name: 'Northern Cape', code: 'NC', population: 1263875 },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[17.0, -30.0], [25.0, -30.0], [25.0, -26.0], [17.0, -26.0], [17.0, -30.0]]]
                }
            },
            {
                type: 'Feature',
                properties: { name: 'Free State', code: 'FS', population: 2887465 },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[24.0, -30.5], [30.0, -30.5], [30.0, -26.5], [24.0, -26.5], [24.0, -30.5]]]
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
                properties: { name: 'North West', code: 'NW', population: 4027160 },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[22.0, -27.5], [28.0, -27.5], [28.0, -24.0], [22.0, -24.0], [22.0, -27.5]]]
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
                properties: { name: 'Mpumalanga', code: 'MP', population: 4592187 },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[28.5, -26.5], [32.0, -26.5], [32.0, -22.5], [28.5, -22.5], [28.5, -26.5]]]
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
exports.getSouthAfricaBoundaries = getSouthAfricaBoundaries;
/**
 * Detect country from data points based on coordinate bounds
 */
function detectCountryFromCoordinates(dataPoints) {
    if (dataPoints.length === 0) {
        console.warn('No data points provided for country detection.');
        return 'unknown';
    }
    console.log('Mapping all locations without country limits.');
    return 'unknown';
}
exports.detectCountryFromCoordinates = detectCountryFromCoordinates;
/**
 * Get boundaries based on detected country
 */
function getBoundariesForCountry(country) {
    if (country === 'kenya') {
        return getKenyaBoundaries();
    }
    else {
        return getSouthAfricaBoundaries();
    }
}
exports.getBoundariesForCountry = getBoundariesForCountry;
//# sourceMappingURL=spatialAnalysis.js.map
