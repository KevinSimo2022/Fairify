"use strict";
/**
 * Dashboard analytics data provider
 * Generates analytics data for dashboard visualizations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthsInRange = exports.getAnalyticsData = void 0;
const admin = require("firebase-admin");
/**
 * Get comprehensive dashboard analytics data for a user
 */
async function getAnalyticsData(userId, timeRange = '30d') {
    try {
        const [metrics, charts, recentActivity] = await Promise.all([
            getUserMetrics(userId, timeRange),
            getChartData(userId, timeRange),
            getRecentActivity(userId, 10)
        ]);
        return {
            metrics,
            charts,
            recentActivity
        };
    }
    catch (error) {
        console.error('Error getting analytics data:', error);
        throw error;
    }
}
exports.getAnalyticsData = getAnalyticsData;
/**
 * Calculate key metrics for the user
 */
async function getUserMetrics(userId, timeRange) {
    const cutoffDate = getCutoffDate(timeRange);
    // Get total datasets
    const datasetsQuery = admin.firestore()
        .collection('datasets')
        .where('userId', '==', userId)
        .where('createdAt', '>=', cutoffDate);
    const datasetsSnapshot = await datasetsQuery.get();
    const totalDatasets = datasetsSnapshot.size;
    // Get total analyses
    const analysesQuery = admin.firestore()
        .collection('analysis_results')
        .where('userId', '==', userId)
        .where('createdAt', '>=', cutoffDate)
        .where('status', '==', 'complete');
    const analysesSnapshot = await analysesQuery.get();
    const totalAnalyses = analysesSnapshot.size;
    // Calculate average bias score and coverage
    let totalBiasScore = 0;
    let totalCoverage = 0;
    let validAnalyses = 0;
    analysesSnapshot.docs.forEach(doc => {
        var _a, _b, _c, _d;
        const data = doc.data();
        if (((_b = (_a = data.results) === null || _a === void 0 ? void 0 : _a.biasAnalysis) === null || _b === void 0 ? void 0 : _b.biasScore) !== undefined) {
            totalBiasScore += data.results.biasAnalysis.biasScore;
            validAnalyses++;
        }
        if (((_d = (_c = data.results) === null || _c === void 0 ? void 0 : _c.coverageAnalysis) === null || _d === void 0 ? void 0 : _d.overallCoverage) !== undefined) {
            totalCoverage += data.results.coverageAnalysis.overallCoverage;
        }
    });
    const averageBiasScore = validAnalyses > 0 ? totalBiasScore / validAnalyses : 0;
    const averageCoverage = validAnalyses > 0 ? totalCoverage / validAnalyses : 0;
    return {
        totalDatasets,
        totalAnalyses,
        averageBiasScore,
        averageCoverage
    };
}
/**
 * Generate chart data for dashboard visualizations
 */
async function getChartData(userId, timeRange) {
    const cutoffDate = getCutoffDate(timeRange);
    // Get analysis results for charts
    const analysesSnapshot = await admin.firestore()
        .collection('analysis_results')
        .where('userId', '==', userId)
        .where('createdAt', '>=', cutoffDate)
        .where('status', '==', 'complete')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    const analyses = analysesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    // Generate bias data by region
    const regionData = {};
    analyses.forEach((analysis) => {
        var _a, _b, _c;
        if (((_a = analysis.results) === null || _a === void 0 ? void 0 : _a.biasAnalysis) && ((_b = analysis.results) === null || _b === void 0 ? void 0 : _b.coverageAnalysis)) {
            const regions = ((_c = analysis.metadata) === null || _c === void 0 ? void 0 : _c.regions) || ['Unknown'];
            const gini = analysis.results.biasAnalysis.giniCoefficient || 0;
            const coverage = analysis.results.coverageAnalysis.overallCoverage || 0;
            regions.forEach((region) => {
                if (!regionData[region]) {
                    regionData[region] = { gini: [], coverage: [] };
                }
                regionData[region].gini.push(gini);
                regionData[region].coverage.push(coverage);
            });
        }
    });
    const biasData = Object.entries(regionData).map(([region, data]) => ({
        region,
        gini: data.gini.reduce((sum, val) => sum + val, 0) / data.gini.length,
        coverage: data.coverage.reduce((sum, val) => sum + val, 0) / data.coverage.length
    })).slice(0, 6); // Limit to 6 regions
    // Generate time series data
    const timeSeriesData = generateTimeSeriesData(analyses, timeRange);
    // Generate distribution data
    const distributionData = generateDistributionData(analyses);
    return {
        biasData,
        timeSeriesData,
        distributionData
    };
}
/**
 * Generate time series data for trends
 */
function generateTimeSeriesData(analyses, timeRange) {
    const months = getMonthsInRange(timeRange);
    const monthlyData = {};
    // Initialize monthly data
    months.forEach(month => {
        monthlyData[month] = { bias: [], coverage: [] };
    });
    // Group analyses by month
    analyses.forEach(analysis => {
        var _a, _b;
        if (analysis.createdAt && analysis.results) {
            const date = analysis.createdAt.toDate();
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData[monthKey]) {
                const bias = ((_a = analysis.results.biasAnalysis) === null || _a === void 0 ? void 0 : _a.biasScore) || 0;
                const coverage = ((_b = analysis.results.coverageAnalysis) === null || _b === void 0 ? void 0 : _b.overallCoverage) || 0;
                monthlyData[monthKey].bias.push(bias);
                monthlyData[monthKey].coverage.push(coverage);
            }
        }
    });
    // Calculate averages for each month
    return months.map(month => {
        const data = monthlyData[month];
        const avgBias = data.bias.length > 0
            ? data.bias.reduce((sum, val) => sum + val, 0) / data.bias.length
            : 0;
        const avgCoverage = data.coverage.length > 0
            ? data.coverage.reduce((sum, val) => sum + val, 0) / data.coverage.length
            : 0;
        return {
            month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
            bias: Number(avgBias.toFixed(2)),
            coverage: Number(avgCoverage.toFixed(1))
        };
    });
}
/**
 * Generate distribution data for pie charts
 */
function generateDistributionData(analyses) {
    let lowBias = 0;
    let mediumBias = 0;
    let highBias = 0;
    analyses.forEach(analysis => {
        var _a, _b;
        const biasScore = ((_b = (_a = analysis.results) === null || _a === void 0 ? void 0 : _a.biasAnalysis) === null || _b === void 0 ? void 0 : _b.biasScore) || 0;
        if (biasScore <= 0.25) {
            lowBias++;
        }
        else if (biasScore <= 0.4) {
            mediumBias++;
        }
        else {
            highBias++;
        }
    });
    const total = lowBias + mediumBias + highBias;
    if (total === 0) {
        return [
            { name: 'No Data', value: 100, color: '#E0E0E0' }
        ];
    }
    return [
        { name: 'Low Bias', value: Math.round((lowBias / total) * 100), color: '#43A047' },
        { name: 'Medium Bias', value: Math.round((mediumBias / total) * 100), color: '#FFC107' },
        { name: 'High Bias', value: Math.round((highBias / total) * 100), color: '#F44336' }
    ];
}
/**
 * Get recent activity for the user
 */
async function getRecentActivity(userId, limit) {
    const activities = [];
    // Get recent datasets
    const datasetsSnapshot = await admin.firestore()
        .collection('datasets')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit / 2)
        .get();
    datasetsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        activities.push({
            id: doc.id,
            type: 'dataset_upload',
            description: `Uploaded dataset: ${data.name}`,
            timestamp: data.createdAt
        });
    });
    // Get recent analyses
    const analysesSnapshot = await admin.firestore()
        .collection('analysis_results')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit / 2)
        .get();
    analysesSnapshot.docs.forEach(doc => {
        var _a, _b;
        const data = doc.data();
        activities.push({
            id: doc.id,
            type: 'analysis_complete',
            description: `Analysis completed for ${((_b = (_a = data.metadata) === null || _a === void 0 ? void 0 : _a.fileInfo) === null || _b === void 0 ? void 0 : _b.name) || 'dataset'}`,
            timestamp: data.createdAt
        });
    });
    // Sort by timestamp and limit
    return activities
        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
        .slice(0, limit);
}
/**
 * Get cutoff date based on time range
 */
function getCutoffDate(timeRange) {
    const now = new Date();
    let daysBack = 30;
    switch (timeRange) {
        case '7d':
            daysBack = 7;
            break;
        case '30d':
            daysBack = 30;
            break;
        case '90d':
            daysBack = 90;
            break;
        case '1y':
            daysBack = 365;
            break;
    }
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    return admin.firestore.Timestamp.fromDate(cutoffDate);
}
/**
 * Get array of month strings for the given time range
 */
function getMonthsInRange(timeRange) {
    const now = new Date();
    const months = [];
    let monthsBack = 6;
    switch (timeRange) {
        case '7d':
        case '30d':
            monthsBack = 3;
            break;
        case '90d':
            monthsBack = 6;
            break;
        case '1y':
            monthsBack = 12;
            break;
    }
    for (let i = monthsBack - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.push(monthKey);
    }
    return months;
}
exports.getMonthsInRange = getMonthsInRange;
//# sourceMappingURL=dashboardData.js.map
