import CryptoJS from 'crypto-js';

// Environment-based encryption key (use different keys for dev/prod)
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'fairify-default-key-2024';

export interface EncryptionOptions {
  enabled?: boolean;
  algorithm?: 'AES' | 'TripleDES';
  keySize?: number;
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  encrypted: boolean;
  timestamp: number;
}

export class EncryptionService {
  private static readonly DEFAULT_OPTIONS: EncryptionOptions = {
    enabled: true,
    algorithm: 'AES',
    keySize: 256
  };

  /**
   * Safely encrypt data with fallback to unencrypted storage
   */
  static encrypt(data: any, options: EncryptionOptions = {}): EncryptedData | any {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // If encryption is disabled, return original data
      if (!opts.enabled) {
        return data;
      }

      const jsonData = JSON.stringify(data);
      const salt = CryptoJS.lib.WordArray.random(256/8);
      const iv = CryptoJS.lib.WordArray.random(128/8);
      
      const key = CryptoJS.PBKDF2(ENCRYPTION_KEY, salt, {
        keySize: (opts.keySize || 256) / 32,
        iterations: 1000
      });

      const encrypted = CryptoJS.AES.encrypt(jsonData, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });

      return {
        data: encrypted.toString(),
        iv: iv.toString(),
        salt: salt.toString(),
        encrypted: true,
        timestamp: Date.now()
      };
    } catch (error) {
      console.warn('Encryption failed, storing data unencrypted:', error);
      // Fallback to unencrypted storage
      return data;
    }
  }

  /**
   * Safely decrypt data with fallback for unencrypted data
   */
  static decrypt(encryptedData: EncryptedData | any, options: EncryptionOptions = {}): any {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // If data is not encrypted, return as-is
      if (!encryptedData || typeof encryptedData !== 'object' || !encryptedData.encrypted) {
        return encryptedData;
      }

      // If encryption is disabled, try to return the original data
      if (!opts.enabled) {
        return encryptedData;
      }

      const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
      const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
      
      const key = CryptoJS.PBKDF2(ENCRYPTION_KEY, salt, {
        keySize: (opts.keySize || 256) / 32,
        iterations: 1000
      });

      const decrypted = CryptoJS.AES.decrypt(encryptedData.data, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });

      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedText);
    } catch (error) {
      console.warn('Decryption failed, returning data as-is:', error);
      // Fallback to returning the data as-is
      return encryptedData;
    }
  }

  /**
   * Encrypt file data before upload
   */
  static encryptFileData(fileData: ArrayBuffer, options: EncryptionOptions = {}): EncryptedData | ArrayBuffer {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      if (!opts.enabled) {
        return fileData;
      }

      // Convert ArrayBuffer to WordArray
      const wordArray = CryptoJS.lib.WordArray.create(fileData);
      const salt = CryptoJS.lib.WordArray.random(256/8);
      const iv = CryptoJS.lib.WordArray.random(128/8);
      
      const key = CryptoJS.PBKDF2(ENCRYPTION_KEY, salt, {
        keySize: (opts.keySize || 256) / 32,
        iterations: 1000
      });

      const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });

      return {
        data: encrypted.toString(),
        iv: iv.toString(),
        salt: salt.toString(),
        encrypted: true,
        timestamp: Date.now()
      };
    } catch (error) {
      console.warn('File encryption failed, storing unencrypted:', error);
      return fileData;
    }
  }

  /**
   * Check if data is encrypted
   */
  static isEncrypted(data: any): boolean {
    return data && typeof data === 'object' && data.encrypted === true;
  }

  /**
   * Get encryption status for debugging
   */
  static getEncryptionStatus(): { enabled: boolean; algorithm: string; keyPresent: boolean } {
    return {
      enabled: true,
      algorithm: 'AES-256',
      keyPresent: !!ENCRYPTION_KEY
    };
  }
}

export default EncryptionService;
