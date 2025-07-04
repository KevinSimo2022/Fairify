"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerEncryptionService = void 0;
const CryptoJS = require("crypto-js");
// Use environment variable for production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fairify-server-key-2024';
class ServerEncryptionService {
    /**
     * Safely encrypt data on the server
     */
    static encrypt(data, options = {}) {
        const opts = Object.assign(Object.assign({}, this.DEFAULT_OPTIONS), options);
        try {
            if (!opts.enabled) {
                return data;
            }
            const jsonData = JSON.stringify(data);
            const salt = CryptoJS.lib.WordArray.random(256 / 8);
            const iv = CryptoJS.lib.WordArray.random(128 / 8);
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
        }
        catch (error) {
            console.warn('Server encryption failed, storing data unencrypted:', error);
            return data;
        }
    }
    /**
     * Safely decrypt data on the server
     */
    static decrypt(encryptedData, options = {}) {
        const opts = Object.assign(Object.assign({}, this.DEFAULT_OPTIONS), options);
        try {
            if (!encryptedData || typeof encryptedData !== 'object' || !encryptedData.encrypted) {
                return encryptedData;
            }
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
        }
        catch (error) {
            console.warn('Server decryption failed, returning data as-is:', error);
            return encryptedData;
        }
    }
    /**
     * Encrypt file buffer for storage
     */
    static encryptFileBuffer(buffer, options = {}) {
        const opts = Object.assign(Object.assign({}, this.DEFAULT_OPTIONS), options);
        try {
            if (!opts.enabled) {
                return buffer;
            }
            const wordArray = CryptoJS.lib.WordArray.create(buffer);
            const salt = CryptoJS.lib.WordArray.random(256 / 8);
            const iv = CryptoJS.lib.WordArray.random(128 / 8);
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
        }
        catch (error) {
            console.warn('File buffer encryption failed, storing unencrypted:', error);
            return buffer;
        }
    }
    /**
     * Check if data is encrypted
     */
    static isEncrypted(data) {
        return data && typeof data === 'object' && data.encrypted === true;
    }
}
exports.ServerEncryptionService = ServerEncryptionService;
ServerEncryptionService.DEFAULT_OPTIONS = {
    enabled: true,
    algorithm: 'AES',
    keySize: 256
};
exports.default = ServerEncryptionService;
//# sourceMappingURL=encryption.js.map