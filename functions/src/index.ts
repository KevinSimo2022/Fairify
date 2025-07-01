import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { PracticalDataProcessor } from './analysis/practicalDataProcessor';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const processor = new PracticalDataProcessor();

/**
 * Analyze a dataset without encryption
 */
export const analyzeDataset = onCall(async (request) => {
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
    
    // Update dataset with analysis results
    await db.collection('datasets').doc(datasetId).update({
      status: 'analyzed',
      analysisResults,
      totalRows: dataPoints.length,
      analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastModified: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      datasetId,
      analysisResults,
      totalDataPoints: dataPoints.length
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
 * Get map data for a specific dataset
 */
export const getMapDataForDataset = onCall(async (request) => {
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
      status: dataset.status 
    });
    
    // Extract data points from the dataset
    const dataPoints = await processor.extractDataPoints(dataset, datasetId);
    
    console.log(`Retrieved ${dataPoints.length} data points for map visualization`);
    
    return {
      success: true,
      datasetId,
      dataPoints,
      totalPoints: dataPoints.length
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
export const getUserFiles = onCall(async (request) => {
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
export const checkFileExists = onCall(async (request) => {
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
export const deleteFile = onCall(async (request) => {
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
