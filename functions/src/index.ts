import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { DataProcessor } from './analysis/dataProcessor';
import { ServerEncryptionService } from './utils/encryption';

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '1GiB',
  region: 'us-central1'
});

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const processor = new DataProcessor();

/**
 * Analyze a dataset without encryption
 */
export const analyzeDataset = onCall({
  timeoutSeconds: 540,
  memory: '1GiB',
  maxInstances: 10
}, async (request) => {
  const { auth, data } = request;
  
  if (!auth?.uid) {
    console.error("Unauthenticated user attempted to call analyzeDataset");
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = auth.uid;
  const { datasetId, analysisType = 'comprehensive', userContext } = data;
  
  console.log('analyzeDataset called with:', { userId, datasetId, analysisType, userContext });
  
  try {
    // Get dataset document
    const datasetDoc = await db.collection('datasets').doc(datasetId).get();
    
    if (!datasetDoc.exists) {
      throw new HttpsError('not-found', 'Dataset not found');
    }
    
    const dataset = datasetDoc.data()!;
    
    // Verify ownership
    if (dataset.userId !== userId) {
      throw new HttpsError('permission-denied', 'Access denied to this dataset');
    }
    
    console.log('Processing dataset:', { 
      fileName: dataset.fileName, 
      fileType: dataset.fileType,
      filePath: dataset.filePath 
    });
    
    // Extract data points from the dataset
    const dataPoints = await processor.extractDataPoints(dataset, datasetId);
    
    if (dataPoints.length === 0) {
      console.warn('No data points extracted from dataset');
      throw new HttpsError('failed-precondition', 'No valid data points found in dataset');
    }
    
    console.log(`Extracted ${dataPoints.length} data points from dataset`);
    
    // Perform analysis
    const analysisResults = await processor.performComprehensiveAnalysis(dataPoints, dataset);
    
    console.log('Analysis completed:', {
      totalDataPoints: dataPoints.length,
      analysisType: analysisResults.analysisType,
      coveragePercentage: analysisResults.coverage?.coveragePercentage,
      biasScore: analysisResults.bias?.biasScore
    });
    
    // Update dataset with analysis results (keep unencrypted for app use)
    await db.collection('datasets').doc(datasetId).update({
      status: 'complete',
      analysisResults: analysisResults,
      totalRows: dataPoints.length,
      // Store processed data points for map visualization
      processedDataPoints: dataPoints,
      analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastModified: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Encrypt the original file in Firebase Storage after analysis
    if (dataset.filePath) {
      console.log('Encrypting original file in storage...');
      try {
        const encryptedFilePath = await encryptFileInStorage(dataset.filePath, userId);
        console.log('Original file encrypted and uploaded to:', encryptedFilePath);
        
        // Update dataset with encrypted file path
        await db.collection('datasets').doc(datasetId).update({
          encryptedFilePath: encryptedFilePath,
          originalFileEncrypted: true,
          fileEncryptedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (encryptError) {
        console.error('Failed to encrypt original file, but analysis succeeded:', encryptError);
        // Continue without failing the entire operation
      }
    }
    
    return {
      success: true,
      datasetId,
      analysisResults: analysisResults,
      totalDataPoints: dataPoints.length,
      fileEncrypted: true
    };
    
  } catch (error) {
    console.error('Error in analyzeDataset:', error);
    
    // Update dataset status to error
    await db.collection('datasets').doc(datasetId).update({
      status: 'error',
      error: error instanceof Error ? error.message : 'Analysis failed',
      lastModified: admin.firestore.FieldValue.serverTimestamp()
    }).catch(updateError => {
      console.error('Failed to update dataset error status:', updateError);
    });
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Encrypt file in Firebase Storage after analysis
 */
async function encryptFileInStorage(filePath: string, userId: string): Promise<string> {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    
    // Download original file
    const [buffer] = await file.download();
    console.log(`Downloaded original file for encryption: ${filePath}`);
    
    // Encrypt the file content
    const encryptedData = ServerEncryptionService.encryptFileBuffer(buffer, {
      enabled: true
    });
    
    // Create new encrypted file path
    const encryptedFilePath = filePath.replace(/(\.[^.]+)$/, '_encrypted$1');
    const encryptedFile = bucket.file(encryptedFilePath);
    
    // Upload encrypted file - convert encrypted data to buffer if needed
    let uploadBuffer: Buffer;
    if (ServerEncryptionService.isEncrypted(encryptedData)) {
      // Convert encrypted data to buffer
      uploadBuffer = Buffer.from(JSON.stringify(encryptedData), 'utf8');
    } else {
      uploadBuffer = encryptedData as Buffer;
    }
    
    await encryptedFile.save(uploadBuffer, {
      metadata: {
        contentType: 'application/octet-stream',
        metadata: {
          originalPath: filePath,
          encrypted: 'true',
          encryptedAt: new Date().toISOString(),
          userId: userId
        }
      }
    });
    
    console.log(`Encrypted file uploaded to: ${encryptedFilePath}`);
    
    // Delete original file for security
    await file.delete();
    console.log(`Original file deleted: ${filePath}`);
    
    return encryptedFilePath;
    
  } catch (error) {
    console.error('Error encrypting file in storage:', error);
    throw new Error(`Failed to encrypt file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get map data for a specific dataset
 */
export const getMapDataForDataset = onCall({
  timeoutSeconds: 300,
  memory: '1GiB',
  maxInstances: 10
}, async (request) => {
  const { auth, data } = request;
  
  if (!auth?.uid) {
    console.error("Unauthenticated user attempted to call getMapDataForDataset");
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = auth.uid;
  const { datasetId } = data;
  
  console.log('getMapDataForDataset called with:', { userId, datasetId });
  
  try {
    // Get dataset document
    const datasetDoc = await db.collection('datasets').doc(datasetId).get();
    
    if (!datasetDoc.exists) {
      throw new HttpsError('not-found', 'Dataset not found');
    }
    
    const dataset = datasetDoc.data()!;
    
    // Verify ownership
    if (dataset.userId !== userId) {
      throw new HttpsError('permission-denied', 'Access denied to this dataset');
    }
    
    console.log('Getting map data for dataset:', { 
      fileName: dataset.fileName, 
      fileType: dataset.fileType,
      status: dataset.status,
      hasProcessedDataPoints: dataset.processedDataPoints ? true : false
    });
    
    // Check if we have processed data points stored from analysis
    let dataPoints;
    if (dataset.processedDataPoints && Array.isArray(dataset.processedDataPoints)) {
      console.log(`Using stored processed data points: ${dataset.processedDataPoints.length} points`);
      dataPoints = dataset.processedDataPoints;
    } else {
      // Fallback: extract data points from the dataset file
      console.log('No processed data found, extracting from file...');
      dataPoints = await processor.extractDataPoints(dataset, datasetId);
      console.log(`Extracted ${dataPoints.length} data points from file`);
      
      // Store for future use if we got data
      if (dataPoints.length > 0) {
        await db.collection('datasets').doc(datasetId).update({
          processedDataPoints: dataPoints,
          lastDataPointsUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Stored ${dataPoints.length} processed data points for future use`);
      }
    }
    
    console.log(`Retrieved ${dataPoints.length} data points for map visualization`);
    
    return {
      success: true,
      datasetId,
      dataPoints,
      totalPoints: dataPoints.length,
      fromStoredData: dataset.processedDataPoints ? true : false
    };
    
  } catch (error) {
    console.error('Error in getMapDataForDataset:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Failed to get map data: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get user's files
 */
export const getUserFiles = onCall({
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 10
}, async (request) => {
  const { auth, data } = request;
  
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = auth.uid;
  const { limit = 50 } = data;
  
  try {
    const query = db.collection('datasets')
      .where('userId', '==', userId)
      .orderBy('uploadedAt', 'desc')
      .limit(limit);
    
    const snapshot = await query.get();
    const files = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      success: true,
      files
    };
    
  } catch (error) {
    console.error('Error in getUserFiles:', error);
    throw new HttpsError('internal', 'Failed to get user files: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Check if file exists
 */
export const checkFileExists = onCall({
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 10
}, async (request) => {
  const { auth, data } = request;
  
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = auth.uid;
  const { fileName } = data;
  
  try {
    const query = db.collection('datasets')
      .where('userId', '==', userId)
      .where('fileName', '==', fileName)
      .limit(1);
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return { exists: false };
    }
    
    const existingFile = snapshot.docs[0];
    return {
      exists: true,
      existingFile: {
        id: existingFile.id,
        ...existingFile.data()
      }
    };
    
  } catch (error) {
    console.error('Error in checkFileExists:', error);
    throw new HttpsError('internal', 'Failed to check file existence: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Delete a file
 */
export const deleteFile = onCall({
  timeoutSeconds: 120,
  memory: '512MiB',
  maxInstances: 10
}, async (request) => {
  const { auth, data } = request;
  
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = auth.uid;
  const { fileId } = data;
  
  try {
    // Get the dataset document
    const datasetDoc = await db.collection('datasets').doc(fileId).get();
    
    if (!datasetDoc.exists) {
      throw new HttpsError('not-found', 'File not found');
    }
    
    const dataset = datasetDoc.data()!;
    
    // Verify ownership
    if (dataset.userId !== userId) {
      throw new HttpsError('permission-denied', 'Access denied to this file');
    }
    
    // Delete from storage if filePath exists
    if (dataset.filePath) {
      try {
        const bucket = admin.storage().bucket();
        await bucket.file(dataset.filePath).delete();
        console.log('Deleted file from storage:', dataset.filePath);
      } catch (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Continue with Firestore deletion even if storage deletion fails
      }
    }
    
    // Delete from Firestore
    await db.collection('datasets').doc(fileId).delete();
    
    return {
      success: true,
      fileId
    };
    
  } catch (error) {
    console.error('Error in deleteFile:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Failed to delete file: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
});
