import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

/**
 * Encrypts a file in Firebase Storage using AES-256-CBC and stores it back with a .enc extension.
 * @param bucketName The name of the storage bucket
 * @param filePath The path to the file in the bucket
 * @param encryptionKey The encryption key (32 bytes for AES-256)
 * @returns The path to the encrypted file
 */
export async function encryptFileInStorage(bucketName: string, filePath: string, encryptionKey: Buffer): Promise<string> {
  const bucket = admin.storage().bucket(bucketName);
  const file = bucket.file(filePath);
  const [exists] = await file.exists();
  if (!exists) throw new Error('File does not exist: ' + filePath);

  // Download file content
  const [fileBuffer] = await file.download();

  // Generate random IV
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

  // Prepend IV to encrypted data
  const encryptedWithIv = Buffer.concat([iv, encrypted]);

  // Save encrypted file with .enc extension
  const encryptedFilePath = filePath + '.enc';
  const encryptedFile = bucket.file(encryptedFilePath);
  await encryptedFile.save(encryptedWithIv, { contentType: 'application/octet-stream' });

  // Optionally, delete the original file
  // await file.delete();

  return encryptedFilePath;
}
