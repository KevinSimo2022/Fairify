"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDatasetWithAI = void 0;
const functions = require("firebase-functions");
// Initialize Gemini AI only when needed (lazy initialization)
let genAI = null;
function initializeGemini() {
    var _a, _b;
    if (!genAI) {
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const apiKey = ((_b = (_a = functions.config()) === null || _a === void 0 ? void 0 : _a.gemini) === null || _b === void 0 ? void 0 : _b.api_key) || process.env.GEMINI_API_KEY;
            if (apiKey && apiKey !== 'your-api-key-here' && apiKey.trim() !== '') {
                genAI = new GoogleGenerativeAI(apiKey);
                console.log('Gemini AI initialized successfully');
            }
            else {
                console.warn('Gemini API key not configured properly');
            }
        }
        catch (error) {
            console.warn('Gemini AI initialization failed:', error);
        }
    }
    return genAI;
}
exports.analyzeDatasetWithAI = functions.https.onCall(async (data, context) => {
    try {
        const { dataPoints, datasetName, stats } = data;
        // Prepare data summary for Gemini
        const dataSummary = {
            totalPoints: dataPoints.length,
            avgBias: stats.avgBias,
            giniCoefficient: stats.giniCoefficient,
            coverageScore: stats.coverageScore,
            highBiasPercentage: (stats.highBiasCount / dataPoints.length) * 100,
            geographicSpread: calculateGeographicSpread(dataPoints),
            biasDistribution: calculateBiasDistribution(dataPoints)
        };
        // Create analysis prompt
        const prompt = `
        Analyze this geospatial dataset: "${datasetName}"
        
        Dataset Statistics:
        - Total data points: ${dataSummary.totalPoints}
        - Average bias score: ${dataSummary.avgBias.toFixed(3)}
        - Gini coefficient: ${dataSummary.giniCoefficient.toFixed(3)}
        - Coverage score: ${dataSummary.coverageScore.toFixed(1)}%
        - High bias points: ${dataSummary.highBiasPercentage.toFixed(1)}%
        - Geographic spread: ${dataSummary.geographicSpread}
        - Bias distribution: ${JSON.stringify(dataSummary.biasDistribution)}
        
        Please provide:
        1. A concise summary of the dataset's bias characteristics
        2. Key findings about spatial bias patterns
        3. Specific bias patterns identified
        4. Actionable recommendations for improving data quality
        5. Insights about geographic coverage gaps
        
        Focus on fairness, equity, and actionable insights for decision-makers.
      `;
        // Get Gemini analysis
        let analysisText = '';
        const geminiAI = initializeGemini();
        if (geminiAI) {
            try {
                const model = geminiAI.getGenerativeModel({ model: 'gemini-pro' });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                analysisText = response.text();
            }
            catch (geminiError) {
                console.warn('Gemini API unavailable, using fallback analysis:', geminiError);
                analysisText = generateFallbackAnalysis(dataSummary, datasetName);
            }
        }
        else {
            console.warn('Gemini API not available, using fallback analysis');
            analysisText = generateFallbackAnalysis(dataSummary, datasetName);
        }
        // Parse the response into structured format
        const analysis = parseGeminiResponse(analysisText);
        return {
            summary: analysis.summary,
            keyFindings: analysis.keyFindings,
            biasPatterns: analysis.biasPatterns,
            recommendations: analysis.recommendations,
            coverageInsights: analysis.coverageInsights,
            confidenceScore: calculateConfidenceScore(dataSummary)
        };
    }
    catch (error) {
        console.error('AI Analysis Error:', error);
        // Return fallback analysis
        const requestData = data;
        return {
            summary: `Analysis of ${requestData.datasetName} with ${requestData.dataPoints.length} data points.`,
            keyFindings: [
                `Average bias score: ${requestData.stats.avgBias.toFixed(3)}`,
                `Coverage score: ${requestData.stats.coverageScore.toFixed(1)}%`,
                `Gini coefficient: ${requestData.stats.giniCoefficient.toFixed(3)}`
            ],
            biasPatterns: ['AI analysis temporarily unavailable'],
            recommendations: ['Increase data collection in underrepresented areas'],
            coverageInsights: ['Geographic coverage analysis requires additional data'],
            confidenceScore: 0.5
        };
    }
});
function generateFallbackAnalysis(dataSummary, datasetName) {
    return `
Summary: Analysis of ${datasetName} reveals ${dataSummary.totalPoints} data points with an average bias score of ${dataSummary.avgBias.toFixed(3)}.

Key Findings:
- Total data points: ${dataSummary.totalPoints}
- Coverage score: ${dataSummary.coverageScore.toFixed(1)}%
- Gini coefficient: ${dataSummary.giniCoefficient.toFixed(3)}
- High bias percentage: ${dataSummary.highBiasPercentage.toFixed(1)}%

Bias Patterns:
- Geographic spread: ${dataSummary.geographicSpread}
- Distribution varies across regions

Recommendations:
- Increase data collection in underrepresented areas
- Monitor bias patterns regularly
- Implement targeted sampling strategies

Coverage Insights:
- Current coverage: ${dataSummary.coverageScore.toFixed(1)}%
- Geographic distribution needs improvement
  `;
}
function calculateGeographicSpread(dataPoints) {
    if (dataPoints.length === 0)
        return 'No data';
    const lats = dataPoints.map(p => p.lat);
    const lngs = dataPoints.map(p => p.lng);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);
    if (latRange > 10 || lngRange > 10)
        return 'Continental';
    if (latRange > 1 || lngRange > 1)
        return 'Regional';
    return 'Local';
}
function calculateBiasDistribution(dataPoints) {
    const distribution = { low: 0, medium: 0, high: 0 };
    dataPoints.forEach(point => {
        if (point.bias <= 0.3)
            distribution.low++;
        else if (point.bias <= 0.6)
            distribution.medium++;
        else
            distribution.high++;
    });
    return distribution;
}
function parseGeminiResponse(text) {
    // Simple parsing logic - in production, you might want more sophisticated parsing
    const sections = text.split('\n\n');
    return {
        summary: sections[0] || 'Analysis summary not available',
        keyFindings: extractListItems(text, 'findings') || ['Key findings analysis pending'],
        biasPatterns: extractListItems(text, 'patterns') || ['Bias pattern analysis pending'],
        recommendations: extractListItems(text, 'recommendations') || ['Recommendations analysis pending'],
        coverageInsights: extractListItems(text, 'coverage') || ['Coverage analysis pending']
    };
}
function extractListItems(text, keyword) {
    const lines = text.split('\n');
    const items = [];
    let capturing = false;
    for (const line of lines) {
        if (line.toLowerCase().includes(keyword)) {
            capturing = true;
            continue;
        }
        if (capturing && line.trim().startsWith('-')) {
            items.push(line.trim().substring(1).trim());
        }
        else if (capturing && line.trim() === '') {
            break;
        }
    }
    return items.length > 0 ? items : [`${keyword} analysis pending`];
}
function calculateConfidenceScore(dataSummary) {
    let score = 0.5; // Base score
    // Increase confidence based on data quality indicators
    if (dataSummary.totalPoints > 100)
        score += 0.1;
    if (dataSummary.totalPoints > 1000)
        score += 0.1;
    if (dataSummary.coverageScore > 70)
        score += 0.1;
    if (dataSummary.giniCoefficient < 0.4)
        score += 0.1;
    if (dataSummary.geographicSpread !== 'Local')
        score += 0.1;
    return Math.min(0.95, score);
}
//# sourceMappingURL=analysisFunction.js.map
