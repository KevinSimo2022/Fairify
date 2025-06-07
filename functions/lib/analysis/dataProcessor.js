"use strict";
/**
 * Data processing and analysis module
 * Handles CSV and GeoJSON parsing, bias analysis, and fairness scoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDataset = void 0;
const admin = require("firebase-admin");
const csv = require("csv-parser");
const stream_1 = require("stream");
const spatialAnalysis_1 = require("./spatialAnalysis");
/**
 * Removes undefined values from an object to prevent Firestore write errors
 */
function removeUndefined(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Main function to process and analyze datasets
 */
async function processDataset(dataset, analysisType, userId, datasetId) {
    const startTime = Date.now();
    try {
        console.log('Processing dataset:', {
            filePath: dataset.filePath,
            fileName: dataset.fileName,
            fileType: dataset.fileType,
            userId: userId
        });
        // Download file from Firebase Storage
        const storage = admin.storage();
        const bucket = storage.bucket();
        console.log('Storage bucket name:', bucket.name);
        console.log('Attempting to download file from path:', dataset.filePath);
        const file = bucket.file(dataset.filePath);
        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`File not found at path: ${dataset.filePath}`);
        }
        let fileContent;
        try {
            console.log('File exists, downloading...');
            [fileContent] = await file.download();
            console.log('File downloaded successfully, size:', fileContent.length);
        }
        catch (error) {
            const downloadError = error;
            console.error('Error downloading file:', {
                error: downloadError,
                filePath: dataset.filePath,
                bucketName: bucket.name
            });
            throw new Error(`Failed to download file: ${downloadError.message}`);
        }
        // Parse data based on file type
        let dataPoints = [];
        try {
            if (dataset.fileType === 'csv') {
                dataPoints = await parseCSV(fileContent);
            }
            else if (dataset.fileType === 'geojson') {
                dataPoints = await parseGeoJSON(fileContent);
            }
            else {
                throw new Error('Unsupported file type');
            }
        }
        catch (error) {
            const parseError = error;
            console.error('Error parsing file content:', {
                error: parseError,
                fileType: dataset.fileType,
                fileName: dataset.fileName
            });
            throw new Error(`Failed to parse file: ${parseError.message}`);
        }
        console.log('Parsed data points:', dataPoints.length);
        if (dataPoints.length === 0) {
            console.warn('No data points found in file');
            return {
                status: 'complete',
                timestamp: admin.firestore.Timestamp.now(),
                results: {},
                dataPoints: [],
                metadata: {
                    recordCount: 0,
                    regions: [],
                    processingTime: Date.now() - startTime,
                    fileInfo: {
                        name: dataset.fileName,
                        size: dataset.fileSize,
                        type: dataset.fileType
                    }
                }
            };
        }
        // Detect country and assign regions
        const detectedCountry = (0, spatialAnalysis_1.detectCountryFromCoordinates)(dataPoints);
        console.log('Detected country:', detectedCountry);
        // Filter data points within Kenya and South Africa boundaries
        const filteredDataPoints = dataPoints.filter(point => {
            // Include all points with valid latitude and longitude
            return point.lat !== undefined && point.lng !== undefined;
        });
        console.log('Filtered data points:', filteredDataPoints.length);
        if (filteredDataPoints.length === 0) {
            console.warn('No valid data points found');
            return {
                status: 'complete',
                timestamp: admin.firestore.Timestamp.now(),
                results: {},
                dataPoints: [],
                metadata: {
                    recordCount: 0,
                    regions: [],
                    processingTime: Date.now() - startTime,
                    fileInfo: {
                        name: dataset.fileName,
                        size: dataset.fileSize,
                        type: dataset.fileType
                    }
                }
            };
        }
        // Update enhancedDataPoints to use filtered data points
        let enhancedDataPoints = filteredDataPoints;
        if (detectedCountry !== 'unknown') {
            const boundaries = (0, spatialAnalysis_1.getBoundariesForCountry)(detectedCountry);
            enhancedDataPoints = (0, spatialAnalysis_1.assignDataPointsToRegions)(filteredDataPoints, boundaries);
            console.log('Enhanced data points with regions:', enhancedDataPoints.filter(p => p.region).length);
        }
        // Perform analysis
        const coverageAnalysis = await analyzeCoverage(enhancedDataPoints, detectedCountry);
        const biasAnalysis = await analyzeBias(enhancedDataPoints, detectedCountry);
        const fairnessScores = await calculateFairness(enhancedDataPoints, coverageAnalysis, biasAnalysis);
        const processingTime = Date.now() - startTime;
        // Clean up undefined values from analysis results
        const cleanCoverageAnalysis = coverageAnalysis || {};
        if (cleanCoverageAnalysis.regionalStats === undefined) {
            delete cleanCoverageAnalysis.regionalStats;
        }
        const cleanBiasAnalysis = biasAnalysis || {};
        if (cleanBiasAnalysis.regionalGini === undefined) {
            delete cleanBiasAnalysis.regionalGini;
        }
        if (cleanBiasAnalysis.coverageRatio === undefined) {
            delete cleanBiasAnalysis.coverageRatio;
        }
        const result = {
            status: 'complete',
            timestamp: admin.firestore.Timestamp.now(),
            results: {
                coverageAnalysis: cleanCoverageAnalysis,
                biasAnalysis: cleanBiasAnalysis,
                fairnessScores: fairnessScores || {}
            },
            dataPoints: enhancedDataPoints || [],
            metadata: {
                recordCount: enhancedDataPoints.length,
                regions: getUniqueRegions(enhancedDataPoints),
                processingTime,
                fileInfo: {
                    name: dataset.fileName,
                    size: dataset.fileSize,
                    type: dataset.fileType
                }
            }
        };
        console.log('Processing completed successfully:', {
            dataPoints: result.dataPoints.length,
            recordCount: result.metadata.recordCount,
            processingTime: result.metadata.processingTime,
            detectedCountry: detectedCountry
        });
        // Check if Firestore collection exists
        const firestore = admin.firestore();
        const collectionRef = firestore.collection('mapData');
        // Enhanced logging and error handling for Firestore operations
        const collectionSnapshot = await collectionRef.limit(1).get();
        if (collectionSnapshot.empty) {
            console.log('Firestore collection "mapData" does not exist. Creating it...');
            try {
                await firestore.collection('mapData').doc('metadata').set({ createdAt: admin.firestore.Timestamp.now() });
                console.log('Metadata document created successfully.');
            }
            catch (error) {
                console.error('Failed to create metadata document:', error);
            }
        }
        console.log('Filtered data points:', filteredDataPoints);
        // Store filtered data points in Firestore with dataset reference
        const batch = firestore.batch();
        // Clear any existing map data for this dataset first
        if (datasetId) {
            try {
                const existingMapData = await collectionRef.where('datasetId', '==', datasetId).get();
                existingMapData.docs.forEach(doc => {
                    console.log('Deleting existing map data document:', doc.id);
                    batch.delete(doc.ref);
                });
            }
            catch (error) {
                console.error('Failed to delete existing map data documents:', error);
            }
        }
        filteredDataPoints.forEach((point, index) => {
            const docRef = collectionRef.doc();
            const data = {
                datasetId,
                lat: point.lat,
                lng: point.lng,
                value: point.value,
                bias: point.bias,
                region: point.region,
                index
            };
            console.log('Adding map data document:', data);
            batch.set(docRef, data);
        });
        try {
            await batch.commit();
            console.log('Map data batch commit completed successfully');
        }
        catch (error) {
            console.error('Failed to commit map data batch:', error);
        }
        // Clean the result before returning to prevent undefined value issues
        const cleanResult = removeUndefined(result);
        return cleanResult;
    }
    catch (error) {
        console.error('Dataset processing error:', {
            error: error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            dataset: {
                filePath: dataset.filePath,
                fileName: dataset.fileName,
                fileType: dataset.fileType
            }
        });
        return {
            status: 'error',
            timestamp: admin.firestore.Timestamp.now(),
            results: {},
            dataPoints: [],
            metadata: {
                recordCount: 0,
                regions: [],
                processingTime: Date.now() - startTime,
                fileInfo: {
                    name: dataset.fileName,
                    size: dataset.fileSize,
                    type: dataset.fileType
                }
            }
        };
    }
}
exports.processDataset = processDataset;
/**
 * Parse CSV file and extract coordinate data
 */
async function parseCSV(fileContent) {
    return new Promise((resolve, reject) => {
        const dataPoints = [];
        const stream = stream_1.Readable.from(fileContent.toString());
        stream
            .pipe(csv())
            .on('data', (row) => {
            try {
                // Try different common column names for coordinates
                const lat = parseFloat(row.latitude || row.lat || row.y || row.Latitude || row.LAT);
                const lng = parseFloat(row.longitude || row.lng || row.lon || row.x || row.Longitude || row.LNG);
                if (!isNaN(lat) && !isNaN(lng)) {
                    // Generate unique ID for data point
                    const id = `${lat.toFixed(6)}_${lng.toFixed(6)}_${dataPoints.length}`;
                    // Extract value from common value columns
                    const value = parseFloat(row.value || row.score || row.amount || row.count || row.population || row.Value || row.Score) || Math.random() * 100;
                    // Extract category from common category columns
                    const category = row.category || row.type || row.class || row.zone || row.Category || row.Type || 'unknown';
                    dataPoints.push({
                        id,
                        lat,
                        lng,
                        value,
                        category,
                        region: row.region || row.area || row.zone || getRegionFromCoordinates(lat, lng),
                        properties: row
                    });
                }
            }
            catch (error) {
                console.warn('Error parsing CSV row:', { error, row });
            }
        })
            .on('end', () => {
            if (dataPoints.length === 0) {
                console.warn('No valid data points parsed from CSV file.');
            }
            resolve(dataPoints);
        })
            .on('error', (error) => {
            console.error('Error reading CSV file:', error);
            reject(error);
        });
    });
}
/**
 * Parse GeoJSON file and extract coordinate data
 */
async function parseGeoJSON(fileContent) {
    try {
        const geoJSON = JSON.parse(fileContent.toString());
        const dataPoints = [];
        if (geoJSON.type === 'FeatureCollection') {
            geoJSON.features.forEach((feature, index) => {
                var _a, _b, _c, _d, _e;
                if (feature.geometry && feature.geometry.type === 'Point') {
                    const [lng, lat] = feature.geometry.coordinates;
                    const id = `geojson_${lat.toFixed(6)}_${lng.toFixed(6)}_${index}`;
                    const value = ((_a = feature.properties) === null || _a === void 0 ? void 0 : _a.value) || ((_b = feature.properties) === null || _b === void 0 ? void 0 : _b.score) || Math.random() * 100;
                    const category = ((_c = feature.properties) === null || _c === void 0 ? void 0 : _c.category) || ((_d = feature.properties) === null || _d === void 0 ? void 0 : _d.type) || 'unknown';
                    dataPoints.push({
                        id,
                        lat,
                        lng,
                        value,
                        category,
                        region: ((_e = feature.properties) === null || _e === void 0 ? void 0 : _e.region) || getRegionFromCoordinates(lat, lng),
                        properties: feature.properties || {}
                    });
                }
            });
        }
        return dataPoints;
    }
    catch (error) {
        throw new Error('Invalid GeoJSON format');
    }
}
/**
 * Analyze geographical coverage and identify gaps
 */
async function analyzeCoverage(dataPoints, detectedCountry) {
    const regions = getUniqueRegions(dataPoints);
    const regionCounts = {};
    // Count data points per region
    dataPoints.forEach(point => {
        const region = point.region || 'unknown';
        regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    // Calculate coverage percentages
    const totalPoints = dataPoints.length;
    const coveragePercentages = {};
    regions.forEach(region => {
        coveragePercentages[region] = ((regionCounts[region] || 0) / totalPoints) * 100;
    });
    // Calculate regional statistics if country is detected
    let regionalStats;
    if (detectedCountry && (detectedCountry === 'kenya' || detectedCountry === 'south-africa')) {
        const boundaries = (0, spatialAnalysis_1.getBoundariesForCountry)(detectedCountry);
        regionalStats = (0, spatialAnalysis_1.calculateRegionalStats)(dataPoints, boundaries);
    }
    // Identify missing or underrepresented regions
    const averageCoverage = 100 / regions.length;
    const missingRegions = regions.filter(region => (coveragePercentages[region] || 0) < averageCoverage * 0.1 // Less than 10% of average
    );
    // Calculate overall coverage score
    const coverageVariance = regions.reduce((sum, region) => {
        const diff = (coveragePercentages[region] || 0) - averageCoverage;
        return sum + (diff * diff);
    }, 0) / regions.length;
    const overallCoverage = Math.max(0, 100 - Math.sqrt(coverageVariance));
    return {
        totalRecords: totalPoints,
        regionCounts,
        coveragePercentages,
        missingRegions,
        overallCoverage,
        regionalStats,
        detectedCountry
    };
}
/**
 * Calculate bias metrics including Gini coefficient
 */
async function analyzeBias(dataPoints, detectedCountry) {
    const regions = getUniqueRegions(dataPoints);
    const regionCounts = {};
    // Count data points per region
    dataPoints.forEach(point => {
        const region = point.region || 'unknown';
        regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    // Calculate Gini coefficient
    const counts = Object.values(regionCounts).sort((a, b) => a - b);
    const n = counts.length;
    const totalPoints = dataPoints.length;
    let giniSum = 0;
    for (let i = 0; i < n; i++) {
        giniSum += (2 * (i + 1) - n - 1) * counts[i];
    }
    const giniCoefficient = giniSum / (n * totalPoints);
    // Calculate inequality index (normalized standard deviation)
    const mean = totalPoints / n;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / n;
    const inequalityIndex = Math.sqrt(variance) / mean;
    // Identify over/under represented regions
    const averageCount = totalPoints / regions.length;
    const overrepresentedRegions = regions.filter(region => (regionCounts[region] || 0) > averageCount * 1.5);
    const underrepresentedRegions = regions.filter(region => (regionCounts[region] || 0) < averageCount * 0.5);
    // Calculate overall bias score (0-1, where 0 is no bias)
    const biasScore = Math.min(1, giniCoefficient + (inequalityIndex * 0.3));
    // Calculate regional Gini coefficients and coverage ratios if country is detected
    let regionalGini;
    let coverageRatio;
    if (detectedCountry && (detectedCountry === 'kenya' || detectedCountry === 'south-africa')) {
        const boundaries = (0, spatialAnalysis_1.getBoundariesForCountry)(detectedCountry);
        const regionalStats = (0, spatialAnalysis_1.calculateRegionalStats)(dataPoints, boundaries);
        regionalGini = {};
        coverageRatio = {};
        regionalStats.forEach(stat => {
            regionalGini[stat.regionName] = stat.giniCoefficient;
            coverageRatio[stat.regionName] = stat.coverageRatio || 1;
        });
    }
    return {
        giniCoefficient,
        inequalityIndex,
        overrepresentedRegions,
        underrepresentedRegions,
        biasScore,
        regionalGini,
        coverageRatio
    };
}
/**
 * Calculate fairness scores based on multiple metrics
 */
async function calculateFairness(dataPoints, coverage, bias) {
    // Distribution score (based on coverage evenness)
    const distributionScore = Math.max(0, 100 - (bias.giniCoefficient * 100));
    // Representation score (based on coverage completeness)
    const representationScore = coverage.overallCoverage;
    // Accessibility score (inverse of bias score)
    const accessibilityScore = Math.max(0, 100 - (bias.biasScore * 100));
    // Overall fairness index (weighted average)
    const fairnessIndex = (distributionScore * 0.4 +
        representationScore * 0.4 +
        accessibilityScore * 0.2) / 10; // Scale to 0-10
    return {
        fairnessIndex,
        distributionScore,
        representationScore,
        accessibilityScore
    };
}
/**
 * Extract unique regions from data points
 */
function getUniqueRegions(dataPoints) {
    const regions = new Set();
    dataPoints.forEach(point => {
        if (point.region) {
            regions.add(point.region);
        }
    });
    return Array.from(regions);
}
/**
 * Determine region from coordinates using simple geographical boundaries
 */
function getRegionFromCoordinates(lat, lng) {
    // Simple global regions based on coordinates
    if (lat > 60)
        return 'Arctic';
    if (lat > 30)
        return 'Northern';
    if (lat > 0)
        return 'Tropical North';
    if (lat > -30)
        return 'Tropical South';
    if (lat > -60)
        return 'Southern';
    return 'Antarctic';
}
//# sourceMappingURL=dataProcessor.js.map
