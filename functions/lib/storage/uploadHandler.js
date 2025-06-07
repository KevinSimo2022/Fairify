"use strict";
/**
 * File upload handler for secure dataset uploads
 * Validates files, uploads to Firebase Storage, and creates dataset metadata
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDatasetFile = exports.uploadHandler = void 0;
const admin = require("firebase-admin");
const path = require("path");
/**
 * Handle secure file uploads with validation
 */
async function uploadHandler(req, userId) {
    try {
        if (req.method !== 'POST') {
            return { success: false, error: 'Only POST method allowed' };
        }
        // Parse multipart form data (you'll need to implement this based on your setup)
        const { file, datasetName, description } = await parseMultipartForm(req);
        if (!file) {
            return { success: false, error: 'No file provided' };
        }
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = path.extname(file.originalname);
        const fileName = `${datasetName || 'dataset'}_${timestamp}${fileExtension}`;
        const filePath = `datasets/${userId}/${fileName}`;
        // Upload to Firebase Storage
        const storage = admin.storage();
        const bucket = storage.bucket();
        const fileRef = bucket.file(filePath);
        await fileRef.save(file.buffer, {
            metadata: {
                contentType: file.mimetype,
                metadata: {
                    uploadedBy: userId,
                    originalName: file.originalname,
                    uploadTimestamp: timestamp.toString()
                }
            }
        });
        // Get download URL
        const [downloadURL] = await fileRef.getSignedUrl({
            action: 'read',
            expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        });
        // Create dataset metadata in Firestore
        const datasetDoc = await admin.firestore().collection('datasets').add({
            userId,
            fileName: file.originalname,
            filePath,
            downloadURL,
            fileSize: file.size,
            fileType: getFileType(file.originalname),
            name: datasetName || file.originalname,
            description: description || '',
            status: 'uploaded',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            datasetId: datasetDoc.id,
            filePath,
            downloadURL
        };
    }
    catch (error) {
        console.error('Upload error:', error);
        return { success: false, error: 'Upload failed' };
    }
}
exports.uploadHandler = uploadHandler;
/**
 * Validate uploaded file
 */
function validateFile(file) {
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        return { valid: false, error: 'File size exceeds 50MB limit' };
    }
    // Check file type
    const allowedExtensions = ['.csv', '.geojson', '.json'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        return { valid: false, error: 'Only CSV and GeoJSON files are allowed' };
    }
    // Check MIME type
    const allowedMimeTypes = [
        'text/csv',
        'application/json',
        'application/geo+json',
        'application/vnd.geo+json'
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return { valid: false, error: 'Invalid file type' };
    }
    return { valid: true };
}
/**
 * Determine file type from filename
 */
function getFileType(filename) {
    const extension = path.extname(filename).toLowerCase();
    if (extension === '.csv')
        return 'csv';
    if (extension === '.geojson' || extension === '.json')
        return 'geojson';
    throw new Error('Unsupported file type');
}
/**
 * Parse multipart form data using busboy
 */
async function parseMultipartForm(req) {
    const busboy = require('busboy');
    return new Promise((resolve, reject) => {
        const bb = busboy({ headers: req.headers });
        const fields = {};
        let file = null;
        bb.on('field', (fieldname, val) => {
            fields[fieldname] = val;
        });
        bb.on('file', (fieldname, fileStream, info) => {
            const { filename, mimeType } = info;
            const chunks = [];
            fileStream.on('data', (chunk) => {
                chunks.push(chunk);
            });
            fileStream.on('end', () => {
                file = {
                    originalname: filename,
                    mimetype: mimeType,
                    size: Buffer.concat(chunks).length,
                    buffer: Buffer.concat(chunks)
                };
            });
        });
        bb.on('finish', () => {
            resolve({
                file,
                datasetName: fields.datasetName || (file === null || file === void 0 ? void 0 : file.originalname),
                description: fields.description || ''
            });
        });
        bb.on('error', reject);
        req.pipe(bb);
    });
}
/**
 * Delete dataset file from storage
 */
async function deleteDatasetFile(filePath, userId) {
    var _a;
    try {
        const storage = admin.storage();
        const bucket = storage.bucket();
        const file = bucket.file(filePath);
        // Verify the file belongs to the user
        const [metadata] = await file.getMetadata();
        if (((_a = metadata.metadata) === null || _a === void 0 ? void 0 : _a.uploadedBy) !== userId) {
            throw new Error('Permission denied');
        }
        await file.delete();
        return true;
    }
    catch (error) {
        console.error('Delete error:', error);
        return false;
    }
}
exports.deleteDatasetFile = deleteDatasetFile;
//# sourceMappingURL=uploadHandler.js.map
