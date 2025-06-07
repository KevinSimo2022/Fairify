"use strict";
/**
 * Main entry point for Maphera Firebase Cloud Functions
 * Handles authentication, file uploads, data analysis, and API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDatasetWithAI = exports.getMapDataForDataset = exports.getUserFiles = exports.deleteFile = exports.checkFileExists = exports.createUserProfileCallable = exports.cleanupTempFiles = exports.exportMapData = exports.getSystemAnalytics = exports.updateProfile = exports.onUserDocumentCreate = exports.getDashboardData = exports.getUserAnalysisResults = exports.handleUpload = exports.analyzeDataset = void 0;
const admin = require("firebase-admin");
const cors = require("cors");
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
// Initialize Firebase Admin
admin.initializeApp();
// Configure Firestore to ignore undefined properties
const firestore = admin.firestore();
firestore.settings({ ignoreUndefinedProperties: true });
// Configure admin SDK for emulator use in development
if (process.env.FUNCTIONS_EMULATOR) {
    // Set environment variables for Firebase Admin SDK to use emulators
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
}
// Initialize CORS
const corsHandler = cors({ origin: true });
// Import function modules
const dataProcessor_1 = require("./analysis/dataProcessor");
const uploadHandler_1 = require("./storage/uploadHandler");
const userManager_1 = require("./auth/userManager");
const dashboardData_1 = require("./analytics/dashboardData");
const analysisFunction_1 = require("./ai/analysisFunction");
Object.defineProperty(exports, "analyzeDatasetWithAI", { enumerable: true, get: function () { return analysisFunction_1.analyzeDatasetWithAI; } });
/**
 * Analyzes a dataset for bias, coverage, and fairness
 * Performs bias analysis, coverage analysis, and fairness scoring
 */
exports.analyzeDataset = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        console.error("Unauthenticated user attempted to call analyzeDataset");
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const userId = request.auth.uid;
    const { datasetId, analysisType = 'comprehensive' } = request.data;
    console.log('analyzeDataset called with:', { userId, datasetId, analysisType }); // Added logging
    if (!datasetId) {
        console.error("Invalid argument: Dataset ID is required");
        throw new https_1.HttpsError("invalid-argument", "Dataset ID is required");
    }
    try {
        const datasetDoc = await admin.firestore().collection('datasets').doc(datasetId).get();
        if (!datasetDoc.exists) {
            console.error("Dataset not found:", datasetId);
            throw new https_1.HttpsError("not-found", "Dataset not found");
        }
        const rawData = datasetDoc.data();
        console.log("Fetched dataset data:", rawData);
        if (!rawData) { // Added check for undefined rawData
            console.error("Dataset data is undefined for datasetId:", datasetId);
            throw new https_1.HttpsError("internal", "Dataset data is undefined.");
        }
        const dataset = Object.assign({ userId: rawData === null || rawData === void 0 ? void 0 : rawData.userId, filePath: rawData === null || rawData === void 0 ? void 0 : rawData.filePath, fileName: rawData === null || rawData === void 0 ? void 0 : rawData.fileName, fileType: rawData === null || rawData === void 0 ? void 0 : rawData.fileType, fileSize: rawData === null || rawData === void 0 ? void 0 : rawData.fileSize }, rawData);
        if (dataset.userId !== userId) {
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                console.error("Permission denied for user:", userId);
                throw new https_1.HttpsError("permission-denied", "Access denied");
            }
        }
        console.log("Starting analysis for dataset:", datasetId, "Dataset object:", dataset);
        const analysisResult = await (0, dataProcessor_1.processDataset)(dataset, analysisType, userId, datasetId);
        console.log("Raw analysis result from processDataset:", analysisResult); // Log raw result
        console.log("Stringified analysis result from processDataset:", JSON.stringify(analysisResult, null, 2)); // Log the full result
        if (!analysisResult || typeof analysisResult !== 'object') {
            console.error('Invalid analysis result received from processDataset:', analysisResult);
            throw new https_1.HttpsError('internal', 'Invalid analysis result received.');
        }
        const resultDoc = await admin.firestore().collection('analysis_results').add(Object.assign(Object.assign({}, analysisResult), { userId,
            datasetId, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        console.log("Analysis result saved with ID:", resultDoc.id);
        const updateData = {
            status: "analyzed",
            lastAnalyzed: admin.firestore.FieldValue.serverTimestamp(),
            analysisResultId: resultDoc.id,
        };
        if (analysisResult.results && Object.keys(analysisResult.results).length > 0) {
            updateData.analysisResults = analysisResult.results;
        }
        // Ensure metadata exists and has recordCount before accessing it
        if (analysisResult.metadata && typeof analysisResult.metadata.recordCount === 'number') {
            updateData.totalRows = analysisResult.metadata.recordCount;
        }
        else {
            console.warn('analysisResult.metadata.recordCount is missing or not a number. Setting totalRows to 0.', analysisResult.metadata);
            updateData.totalRows = 0; // Default to 0 if not available
        }
        if (analysisResult.dataPoints && analysisResult.dataPoints.length > 0) {
            updateData.dataPoints = analysisResult.dataPoints;
        }
        await admin.firestore().collection("datasets").doc(datasetId).update(updateData);
        console.log("Dataset updated successfully:", datasetId);
        return {
            success: true,
            analysisId: resultDoc.id,
            results: analysisResult
        };
    }
    catch (error) {
        console.error("Error in analyzeDataset function:", {
            message: error.message,
            code: error.code,
            stack: error.stack,
            details: error.details,
            data: request.data // Log the input data
        });
        throw new https_1.HttpsError("internal", error.message || "An internal error occurred during analysis.", {
            originalMessage: error.message,
            originalCode: error.code,
            originalStack: error.stack,
        });
    }
});
/**
 * HTTP function to handle secure file uploads
 */
exports.handleUpload = (0, https_2.onRequest)(async (req, res) => {
    return corsHandler(req, res, async () => {
        var _a;
        try {
            // Verify authentication
            const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split('Bearer ')[1];
            if (!token) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const decodedToken = await admin.auth().verifyIdToken(token);
            const userId = decodedToken.uid;
            const result = await (0, uploadHandler_1.uploadHandler)(req, userId);
            if (result.success && result.datasetId) {
                console.log('Dataset uploaded successfully, triggering analysis:', result.datasetId);
                try {
                    const datasetDoc = await admin.firestore().collection('datasets').doc(result.datasetId).get();
                    if (!datasetDoc.exists) {
                        throw new Error('Dataset not found');
                    }
                    const datasetData = datasetDoc.data();
                    if (!datasetData) {
                        throw new Error('Dataset data is undefined');
                    }
                    const analysisResult = await (0, dataProcessor_1.processDataset)({
                        filePath: datasetData.filePath,
                        fileName: datasetData.fileName,
                        fileType: datasetData.fileType,
                        fileSize: datasetData.fileSize,
                        userId,
                    }, 'comprehensive', userId, result.datasetId);
                    console.log('Analysis completed successfully:', analysisResult);
                }
                catch (error) {
                    console.error('Error during analysis:', error);
                }
            }
            res.json(result);
        }
        catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'Upload failed' });
        }
    });
});
/**
 * Callable function to get user's analysis results
 */
exports.getUserAnalysisResults = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = request.auth.uid;
    const { limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = request.data;
    try {
        let query = admin.firestore()
            .collection('analysis_results')
            .where('userId', '==', userId);
        // Apply status filter if provided
        if (status) {
            query = query.where('status', '==', status);
        }
        // Apply sorting
        query = query.orderBy(sortBy, sortOrder);
        // Apply limit
        query = query.limit(limit);
        const snapshot = await query.get();
        const results = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return { results };
    }
    catch (error) {
        console.error('Error fetching results:', error);
        throw new https_1.HttpsError('internal', 'Failed to fetch results');
    }
});
/**
 * Callable function to get dashboard analytics data
 */
exports.getDashboardData = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = request.auth.uid;
    const { timeRange = '30d' } = request.data;
    try {
        const analyticsData = await (0, dashboardData_1.getAnalyticsData)(userId, timeRange);
        return analyticsData;
    }
    catch (error) {
        console.error('Error fetching dashboard data:', error);
        throw new https_1.HttpsError('internal', 'Failed to fetch dashboard data');
    }
});
/**
 * Firestore trigger function that runs when a user document is created
 * This replaces the Auth trigger since we don't have GCIP enabled
 */
exports.onUserDocumentCreate = (0, firestore_1.onDocumentCreated)('users/{userId}', async (event) => {
    var _a;
    try {
        const userData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
        const userId = event.params.userId;
        if (!userData || !userId) {
            console.log('No user data found for document creation');
            return;
        }
        console.log('User document created:', userId);
        console.log('User data:', userData);
        // The user profile is already created when this trigger runs
        // We can use this trigger for additional setup like sending welcome emails,
        // setting up default preferences, etc.
        // Example: Update user document with additional default fields
        await admin.firestore().collection('users').doc(userId).update({
            setupComplete: true,
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
            preferences: userData.preferences || {
                theme: 'light',
                notifications: true,
                dataRetention: '1year'
            }
        });
        console.log('User setup completed for:', userId);
    }
    catch (error) {
        console.error('Error in user document create trigger:', error);
    }
});
/**
 * Callable function to update user profile
 */
exports.updateProfile = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = request.auth.uid;
    const { displayName, preferences, twoFactorEnabled } = request.data;
    try {
        await (0, userManager_1.updateUserProfile)(userId, { displayName, preferences, twoFactorEnabled });
        return { success: true };
    }
    catch (error) {
        console.error('Error updating profile:', error);
        throw new https_1.HttpsError('internal', 'Failed to update profile');
    }
});
/**
 * Admin-only function to get system analytics
 */
exports.getSystemAnalytics = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Check if user is admin
    const userDoc = await admin.firestore()
        .collection('users')
        .doc(request.auth.uid)
        .get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        // Get system-wide analytics
        const totalUsers = await admin.firestore().collection('users').count().get();
        const totalDatasets = await admin.firestore().collection('datasets').count().get();
        const totalAnalyses = await admin.firestore().collection('analysis_results').count().get();
        // Get recent activity
        const recentAnalyses = await admin.firestore()
            .collection('analysis_results')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        return {
            systemStats: {
                totalUsers: totalUsers.data().count,
                totalDatasets: totalDatasets.data().count,
                totalAnalyses: totalAnalyses.data().count
            },
            recentActivity: recentAnalyses.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())))
        };
    }
    catch (error) {
        console.error('Error fetching system analytics:', error);
        throw new https_1.HttpsError('internal', 'Failed to fetch analytics');
    }
});
/**
 * Callable function to export map data for a dataset
 */
exports.exportMapData = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { datasetId } = request.data;
    if (!datasetId) {
        throw new https_1.HttpsError('invalid-argument', 'Dataset ID is required');
    }
    try {
        const userId = request.auth.uid;
        // Get dataset metadata
        const datasetDoc = await admin.firestore()
            .collection('datasets')
            .doc(datasetId)
            .get();
        if (!datasetDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Dataset not found');
        }
        const datasetData = datasetDoc.data();
        // Check permissions
        if ((datasetData === null || datasetData === void 0 ? void 0 : datasetData.userId) !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Access denied');
        }
        // Get analysis results
        const analysisResults = await admin.firestore()
            .collection('analysis_results')
            .where('datasetId', '==', datasetId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        const latestAnalysis = analysisResults.empty ? null : analysisResults.docs[0].data();
        // Prepare export data
        const exportData = {
            dataset: {
                id: datasetId,
                name: datasetData === null || datasetData === void 0 ? void 0 : datasetData.name,
                description: datasetData === null || datasetData === void 0 ? void 0 : datasetData.description,
                uploadedAt: datasetData === null || datasetData === void 0 ? void 0 : datasetData.uploadedAt,
                fileType: datasetData === null || datasetData === void 0 ? void 0 : datasetData.fileType,
                totalRows: datasetData === null || datasetData === void 0 ? void 0 : datasetData.totalRows,
                totalColumns: datasetData === null || datasetData === void 0 ? void 0 : datasetData.totalColumns
            },
            analysis: latestAnalysis ? {
                id: analysisResults.docs[0].id,
                bias: latestAnalysis.bias,
                coverage: latestAnalysis.coverage,
                fairnessScore: latestAnalysis.fairnessScore,
                suggestions: latestAnalysis.suggestions,
                createdAt: latestAnalysis.createdAt
            } : null,
            exportedAt: admin.firestore.FieldValue.serverTimestamp(),
            exportedBy: userId
        };
        return exportData;
    }
    catch (error) {
        console.error('Error exporting map data:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to export map data');
    }
});
/**
 * Scheduled function to clean up temporary files
 */
exports.cleanupTempFiles = (0, scheduler_1.onSchedule)('every 24 hours', async (event) => {
    try {
        const bucket = admin.storage().bucket();
        const [files] = await bucket.getFiles({ prefix: 'temp/' });
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const now = Date.now();
        for (const file of files) {
            const [metadata] = await file.getMetadata();
            const createdTime = new Date(metadata.timeCreated).getTime();
            if (now - createdTime > oneDay) {
                await file.delete();
                console.log(`Deleted temp file: ${file.name}`);
            }
        }
        console.log('Temp file cleanup completed');
    }
    catch (error) {
        console.error('Error cleaning up temp files:', error);
    }
});
/**
 * Callable function to create a user profile
 */
exports.createUserProfileCallable = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        console.error("Unauthenticated user attempted to call createUserProfileCallable");
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = request.auth.uid;
    const data = request.data;
    console.log("Data received:", data);
    console.log("UID:", uid);
    try {
        const user = await admin.auth().getUser(uid);
        console.log("Fetched user from Firebase Auth:", user);
        await (0, userManager_1.createUserProfile)(user);
        console.log("User profile created successfully");
        return { success: true };
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error("User not found in Firebase Auth:", uid);
            throw new https_1.HttpsError("not-found", "User does not exist");
        }
        console.error("Error creating user profile:", error);
        throw new https_1.HttpsError("internal", "Failed to create user profile");
    }
});
/**
 * Callable function to check if a file already exists for the user
 */
exports.checkFileExists = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = request.auth.uid;
    const { fileName } = request.data;
    if (!fileName) {
        throw new https_1.HttpsError('invalid-argument', 'File name is required');
    }
    try {
        // Check in Firestore datasets collection
        const existingFile = await admin.firestore()
            .collection('datasets')
            .where('userId', '==', userId)
            .where('fileName', '==', fileName)
            .limit(1)
            .get();
        if (!existingFile.empty) {
            const fileData = existingFile.docs[0].data();
            return {
                exists: true,
                existingFile: Object.assign({ id: existingFile.docs[0].id }, fileData)
            };
        }
        return { exists: false };
    }
    catch (error) {
        console.error('Error checking file existence:', error);
        throw new https_1.HttpsError('internal', 'Failed to check file existence');
    }
});
/**
 * Callable function to delete a file and its associated data
 */
exports.deleteFile = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = request.auth.uid;
    const { fileId } = request.data;
    if (!fileId) {
        throw new https_1.HttpsError('invalid-argument', 'File ID is required');
    }
    try {
        // Get dataset document
        const datasetDoc = await admin.firestore()
            .collection('datasets')
            .doc(fileId)
            .get();
        if (!datasetDoc.exists) {
            throw new https_1.HttpsError('not-found', 'File not found');
        }
        const datasetData = datasetDoc.data();
        // Check ownership
        if ((datasetData === null || datasetData === void 0 ? void 0 : datasetData.userId) !== userId) {
            // Check if user is admin
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                throw new https_1.HttpsError('permission-denied', 'Access denied');
            }
        }
        // Delete from Firebase Storage
        if (datasetData === null || datasetData === void 0 ? void 0 : datasetData.filePath) {
            try {
                const storage = admin.storage();
                const bucket = storage.bucket();
                const file = bucket.file(datasetData.filePath);
                const [exists] = await file.exists();
                if (exists) {
                    await file.delete();
                    console.log(`Deleted file from storage: ${datasetData.filePath}`);
                }
            }
            catch (storageError) {
                console.warn('Error deleting from storage:', storageError);
                // Continue with other deletions even if storage deletion fails
            }
        }
        // Delete analysis results
        const analysisResults = await admin.firestore()
            .collection('analysis_results')
            .where('datasetId', '==', fileId)
            .get();
        const batch = admin.firestore().batch();
        analysisResults.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Delete map data
        const mapData = await admin.firestore()
            .collection('mapData')
            .where('datasetId', '==', fileId)
            .get();
        mapData.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Delete dataset document
        batch.delete(datasetDoc.ref);
        await batch.commit();
        console.log(`Successfully deleted file and associated data: ${fileId}`);
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting file:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to delete file');
    }
});
/**
 * Callable function to get user's files
 */
exports.getUserFiles = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = request.auth.uid;
    const { limit = 50, status, sortBy = 'uploadedAt', sortOrder = 'desc' } = request.data;
    try {
        let query = admin.firestore()
            .collection('datasets')
            .where('userId', '==', userId);
        // Apply status filter if provided
        if (status) {
            query = query.where('status', '==', status);
        }
        // Apply sorting
        query = query.orderBy(sortBy, sortOrder);
        // Apply limit
        query = query.limit(limit);
        const snapshot = await query.get();
        const files = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return { files };
    }
    catch (error) {
        console.error('Error fetching user files:', error);
        throw new https_1.HttpsError('internal', 'Failed to fetch files');
    }
});
/**
 * Callable function to get map data for a specific dataset
 */
exports.getMapDataForDataset = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = request.auth.uid;
    const { datasetId } = request.data;
    if (!datasetId) {
        throw new https_1.HttpsError('invalid-argument', 'Dataset ID is required');
    }
    try {
        // Verify dataset ownership
        const datasetDoc = await admin.firestore()
            .collection('datasets')
            .doc(datasetId)
            .get();
        if (!datasetDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Dataset not found');
        }
        const datasetData = datasetDoc.data();
        if ((datasetData === null || datasetData === void 0 ? void 0 : datasetData.userId) !== userId) {
            // Check if user is admin
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                throw new https_1.HttpsError('permission-denied', 'Access denied');
            }
        }
        // Fetch map data points for this dataset without requiring an index
        const snapshot = await admin.firestore()
            .collection('mapData')
            .where('datasetId', '==', datasetId)
            .get();
        // Map and sort data points by 'index' property
        let dataPoints = snapshot.docs.map(doc => {
            const data = doc.data();
            return Object.assign({ id: doc.id }, data);
        });
        dataPoints.sort((a, b) => { var _a, _b; return ((_a = a.index) !== null && _a !== void 0 ? _a : 0) - ((_b = b.index) !== null && _b !== void 0 ? _b : 0); });
        return {
            dataPoints,
            datasetInfo: {
                id: datasetId,
                name: (datasetData === null || datasetData === void 0 ? void 0 : datasetData.fileName) || 'Unknown Dataset',
                totalPoints: dataPoints.length
            }
        };
    }
    catch (error) {
        console.error('Error fetching map data for dataset:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to fetch map data');
    }
});
//# sourceMappingURL=index.js.map
