import { DataProcessor } from './dataProcessor';
import { encryptJSON, decryptJSON, generateEncryptionMetadata } from '../utils/encryption';

/**
 * Secure data processor with encryption capabilities
 * Extends the practical data processor with encryption features
 */
export class SecureDataProcessor extends DataProcessor {
  
  /**
   * Process and encrypt dataset analysis
   */
  async performSecureAnalysis(
    dataset: any,
    datasetId: string,
    userId: string
  ) {
    try {
      // Extract data points first
      const dataPoints = await this.extractDataPoints(dataset, datasetId);
      
      // Perform the regular analysis
      const analysisResult = await this.performComprehensiveAnalysis(dataPoints, dataset);

      // Add encryption metadata
      const encryptionMetadata = generateEncryptionMetadata(userId);
      
      // Encrypt sensitive analysis data
      const encryptedAnalysis = {
        ...analysisResult,
        encryption: encryptionMetadata,
        encryptedData: encryptJSON(analysisResult, userId),
        originalData: undefined // Remove unencrypted data
      };

      return encryptedAnalysis;
    } catch (error) {
      console.error('Secure analysis failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt and retrieve analysis data
   */
  async getDecryptedAnalysis(encryptedAnalysis: any, userId: string) {
    try {
      if (!encryptedAnalysis.encryption?.encrypted) {
        // Return as-is if not encrypted
        return encryptedAnalysis;
      }

      // Decrypt the data
      const decryptedData = decryptJSON(encryptedAnalysis.encryptedData, userId);
      
      return {
        ...encryptedAnalysis,
        data: decryptedData,
        encryptedData: undefined // Remove encrypted data for clarity
      };
    } catch (error) {
      console.error('Analysis decryption failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt dataset before storage
   */
  async encryptDataset(dataset: any, userId: string) {
    try {
      const encryptionMetadata = generateEncryptionMetadata(userId);
      
      return {
        ...dataset,
        encryption: encryptionMetadata,
        encryptedContent: encryptJSON(dataset.content, userId),
        content: undefined // Remove unencrypted content
      };
    } catch (error) {
      console.error('Dataset encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt dataset for processing
   */
  async decryptDataset(encryptedDataset: any, userId: string) {
    try {
      if (!encryptedDataset.encryption?.encrypted) {
        // Return as-is if not encrypted
        return encryptedDataset;
      }

      const decryptedContent = decryptJSON(encryptedDataset.encryptedContent, userId);
      
      return {
        ...encryptedDataset,
        content: decryptedContent,
        encryptedContent: undefined // Remove encrypted content
      };
    } catch (error) {
      console.error('Dataset decryption failed:', error);
      throw error;
    }
  }
}
