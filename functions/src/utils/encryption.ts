import * as crypto from 'crypto';

// Get encryption secret from environment or use fallback
function getEncryptionSecret(): string {
  return process.env.ENCRYPTION_SECRET || 'fairify-encryption-secret-2025';
}

// Simple encryption key derivation from user ID and app secret
function getEncryptionKey(userId: string): Buffer {
  const secret = getEncryptionSecret();
  return crypto.pbkdf2Sync(userId + secret, 'salt', 10000, 32, 'sha256');
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptData(data: string, userId: string): string {
  try {
    if (!data || !userId) {
      throw new Error('Data and userId are required for encryption');
    }
    const key = getEncryptionKey(userId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(encryptedData: string, userId: string): string {
  try {
    if (!encryptedData || !userId) {
      throw new Error('EncryptedData and userId are required for decryption');
    }
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const key = getEncryptionKey(userId);
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
}

/**
 * Decrypt file buffer
 */
export function decryptFileBuffer(encryptedBuffer: Buffer, userId: string): Buffer {
  try {
    const encryptedString = encryptedBuffer.toString('base64');
    const decryptedString = decryptData(encryptedString, userId);
    return Buffer.from(decryptedString, 'base64');
  } catch (error) {
    console.error('File buffer decryption failed:', error);
    throw error;
  }
}

/**
 * Encrypt JSON data
 */
export function encryptJSON(data: any, userId: string): string {
  try {
    if (!data || !userId) {
      throw new Error('Data and userId are required for JSON encryption');
    }
    const jsonString = JSON.stringify(data);
    return encryptData(jsonString, userId);
  } catch (error) {
    console.error('JSON encryption failed:', error);
    throw error;
  }
}

/**
 * Decrypt JSON data
 */
export function decryptJSON(encryptedData: string, userId: string): any {
  try {
    if (!encryptedData || !userId) {
      throw new Error('EncryptedData and userId are required for JSON decryption');
    }
    const decryptedString = decryptData(encryptedData, userId);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('JSON decryption failed:', error);
    throw error;
  }
}

/**
 * Generate encryption metadata for storage
 */
export function generateEncryptionMetadata(userId: string) {
  if (!userId) {
    throw new Error('UserId is required for encryption metadata generation');
  }
  
  return {
    encrypted: true,
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    timestamp: new Date().toISOString()
  };
}
