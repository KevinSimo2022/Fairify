import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUploadState } from '@/hooks/use-upload-state';
import { Upload as UploadIcon, FileText, Map, CheckCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { functions, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DatasetContext from '@/components/DatasetContext';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'ready' | 'processing' | 'complete' | 'error';
  progress: number;
  uploadedAt: Date;
  downloadURL?: string;
  error?: string;
}

const Upload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [datasetContext, setDatasetContext] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    uploadedFiles, 
    addUploadedFile, 
    updateUploadedFile, 
    removeUploadedFile,
  clearUploadedFiles 
  } = useUploadState(user?.id);

  // Handle context updates from DatasetContext component
  const handleContextUpdate = useCallback((context: string[]) => {
    setDatasetContext(context);
  }, []);

  // Function to check if file already exists
  const checkFileExists = async (fileName: string) => {
    try {
      const checkFile = httpsCallable(functions, 'checkFileExists');
      const result = await checkFile({ fileName });
      return result.data as { exists: boolean; existingFile?: any };
    } catch (error) {
      console.error('Error checking file existence:', error);
      return { exists: false };
    }
  };

  // Function to delete a file
  const deleteFile = async (fileId: string, fileName: string) => {
    try {
      setDeletingFileId(fileId);
      const deleteFileFunction = httpsCallable(functions, 'deleteFile');
      await deleteFileFunction({ fileId });
      
      // Remove from local state
      removeUploadedFile(fileId);
      
      toast({
        title: 'File deleted',
        description: `${fileName} has been deleted successfully.`,
      });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete the file.',
        variant: 'destructive'
      });
    } finally {
      setDeletingFileId(null);
    }
  };

  // Function to refresh file list from server
  const refreshFileList = async () => {
    try {
      setIsLoadingFiles(true);
      const getUserFiles = httpsCallable(functions, 'getUserFiles');
      const result = await getUserFiles({ limit: 50 });
      const serverFiles = (result.data as any).files;
      
      // Convert server files to UploadedFile format
      const formattedFiles = serverFiles.map((file: any) => ({
        id: file.id,
        name: file.fileName,
        size: file.fileSize,
        type: '.' + (file.fileType || 'unknown'),
        status: file.status === 'analyzed' ? 'complete' : file.status,
        progress: file.status === 'analyzed' ? 100 : 0,
        uploadedAt: new Date(file.uploadedAt?.seconds * 1000 || Date.now()),
        downloadURL: file.downloadURL,
        error: file.error
      }));
      
      // Update local state with server data
      clearUploadedFiles();
      formattedFiles.forEach((file: any) => addUploadedFile(file));
      
      toast({
        title: 'Files refreshed',
        description: 'File list updated from server.',
      });
    } catch (error: any) {
      console.error('Error refreshing files:', error);
      toast({
        title: 'Refresh failed',
        description: 'Failed to refresh file list.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };
  const uploadFileToFirebase = async (file: File, fileId: string) => {
    try {
      // Create storage reference - using 'datasets' path to match storage rules
      const storageRef = ref(storage, `datasets/${user?.id}/${fileId}_${file.name}`);
      
      // Start upload
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {            // Update progress
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            updateUploadedFile(fileId, { progress: Math.round(progress) });
          },          (error) => {
            console.error('Upload error:', error);
            updateUploadedFile(fileId, { status: 'error', error: error.message });
            reject(error);
          },
          async () => {
            // Upload completed successfully
            try {              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              updateUploadedFile(fileId, { status: 'processing', downloadURL });
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Firebase upload error:', error);
      throw error;
    }
  };

  // Store file metadata without analyzing
  const storeFileMetadata = async (fileId: string, downloadURL: string, fileName: string, fileSize: number) => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const storagePath = `datasets/${user?.id}/${fileId}_${fileName}`;
      const datasetRef = doc(db, 'datasets', fileId);
      
      await setDoc(datasetRef, {
        userId: user?.id,
        filePath: storagePath,
        downloadURL: downloadURL,
        fileName: fileName,
        fileType: fileName.split('.').pop()?.toLowerCase() || 'unknown',
        fileSize: fileSize,
        uploadedAt: new Date(),
        status: 'ready', // File uploaded but not analyzed yet
        context: null // Will be updated when user provides context
      });
    } catch (error) {
      console.error('Error storing file metadata:', error);
      throw error;
    }
  };

  // Modified processDataset function - now called when user clicks analyze
  const analyzeDataset = async (fileId: string, fileName: string) => {
    try {
      updateUploadedFile(fileId, { status: 'processing' });

      // Update the dataset with current context
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const datasetRef = doc(db, 'datasets', fileId);
      await updateDoc(datasetRef, {
        context: datasetContext.length > 0 ? datasetContext : null,
        status: 'processing'
      });

      // Call the analysis function
      const analyzeDatasetFunction = httpsCallable(functions, 'analyzeDataset');
      console.log('Invoking analyzeDataset function with parameters:', {
        datasetId: fileId,
        analysisType: 'comprehensive',
        context: datasetContext
      });

      const result = await analyzeDatasetFunction({
        datasetId: fileId,
        analysisType: 'comprehensive',
        userContext: datasetContext.length > 0 ? datasetContext : null
      });

      console.log('Analysis result:', result.data);
      
      updateUploadedFile(fileId, { status: 'complete' });

      toast({
        title: 'Analysis complete',
        description: `${fileName} has been analyzed successfully.`
      });

      return result.data;
    } catch (error: any) {
      console.error('Analysis error:', error);
      updateUploadedFile(fileId, { status: 'error', error: error.message });
      
      toast({
        title: 'Analysis failed',
        description: `${error.code || 'Error'}: ${error.message || 'An error occurred during analysis'}`,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const processDataset = async (fileId: string, downloadURL: string, fileName: string, fileSize: number) => {
    try {
      // First, create the dataset document in Firestore
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
        // Store the storage path, not the download URL
      const storagePath = `datasets/${user?.id}/${fileId}_${fileName}`;
      
      const datasetRef = doc(db, 'datasets', fileId);
      console.log('Creating Firestore document for dataset:', {
        userId: user?.id,
        filePath: storagePath,
        downloadURL,
        fileName,
        fileType: fileName.split('.').pop()?.toLowerCase() || 'unknown',
        fileSize,
        uploadedAt: new Date(),
        status: 'processing'
      });
        await setDoc(datasetRef, {
        userId: user?.id,
        filePath: storagePath, // Use storage path instead of download URL
        downloadURL: downloadURL, // Store download URL separately
        fileName: fileName,
        fileType: fileName.split('.').pop()?.toLowerCase() || 'unknown',
        fileSize: fileSize,
        uploadedAt: new Date(),
        status: 'processing',
        context: datasetContext.length > 0 ? datasetContext : null // Add user context
      });

      // Then call the analysis function
      const analyzeDataset = httpsCallable(functions, 'analyzeDataset');      console.log('Invoking analyzeDataset function with parameters:', {
        datasetId: fileId,
        analysisType: 'comprehensive',
        context: datasetContext
      });

      const result = await analyzeDataset({
        datasetId: fileId,
        analysisType: 'comprehensive',
        userContext: datasetContext.length > 0 ? datasetContext : null
      });

      console.log('Analysis result:', result.data);
      
      const analysisData = result.data as any;
      
      updateUploadedFile(fileId, { status: 'complete' });

      toast({
        title: 'Analysis complete',
        description: `${fileName} has been analyzed successfully.`
      });

      return analysisData;    } catch (error: any) {
      console.error('Processing error:', {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
        fileId: fileId,
        fileName: fileName
      });
      updateUploadedFile(fileId, { status: 'error', error: error.message });
      
      toast({
        title: 'Processing failed',
        description: `${error.code || 'Error'}: ${error.message || 'An error occurred during dataset processing'}`,
        variant: 'destructive'
      });
    }
  };  const handleFiles = useCallback(async (files: FileList) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to upload files.',
        variant: 'destructive'
      });
      return;
    }

    for (const file of Array.from(files)) {
      // Validate file type
      const validTypes = ['.csv', '.geojson', '.json'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload CSV or GeoJSON files only.',
          variant: 'destructive'
        });
        continue;
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'File size must be less than 50MB.',
          variant: 'destructive'
        });
        continue;
      }

      // Check if file already exists
      const existenceCheck = await checkFileExists(file.name);
      if (existenceCheck.exists) {
        const shouldReplace = window.confirm(
          `A file named "${file.name}" already exists. Do you want to replace it?`
        );
        
        if (!shouldReplace) {
          continue;
        }
        
        // Delete the existing file
        try {
          await deleteFile(existenceCheck.existingFile.id, file.name);
        } catch (error) {
          console.error('Error deleting existing file:', error);
          toast({
            title: 'Upload failed',
            description: 'Could not replace existing file.',
            variant: 'destructive'
          });
          continue;
        }
      }      const fileId = Date.now().toString() + Math.random().toString(36);
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: fileExtension,
        status: 'uploading',
        progress: 0,
        uploadedAt: new Date()
      };

      addUploadedFile(newFile);

      try {
        // Upload file to Firebase Storage
        const downloadURL = await uploadFileToFirebase(file, fileId);
        // Store file metadata in Firestore without analyzing
        await storeFileMetadata(fileId, downloadURL, file.name, file.size);
        
        updateUploadedFile(fileId, { status: 'ready', downloadURL });
        
        toast({
          title: 'Upload complete',
          description: `${file.name} uploaded successfully. Ready for analysis.`
        });
      } catch (error: any) {
        console.error('Upload error:', error);
        updateUploadedFile(fileId, { status: 'error', error: error.message });
        
        toast({
          title: 'Upload failed',
          description: error.message || 'Failed to upload the file.',
          variant: 'destructive'
        });
      }
    }
  }, [toast, user, uploadFileToFirebase, processDataset, checkFileExists, deleteFile, addUploadedFile, updateUploadedFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-maphera-amber animate-spin" />;
      default:
        return <div className="h-5 w-5 border-2 border-maphera-blue border-t-transparent rounded-full animate-spin" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-roboto font-bold text-gray-900 mb-2">Upload Dataset</h1>
        <p className="text-gray-600 font-open-sans">
          Upload your geospatial datasets for bias analysis. Supported formats: CSV, GeoJSON
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-roboto">Select Files</CardTitle>
              <CardDescription className="font-open-sans">
                Drag and drop files here or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
                  dragActive 
                    ? 'border-maphera-blue bg-maphera-blue/5' 
                    : 'border-gray-300 hover:border-maphera-blue'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-roboto font-medium text-gray-900 mb-2">
                  Upload your datasets
                </h3>
                <p className="text-gray-600 font-open-sans mb-4">
                  CSV or GeoJSON files up to 50MB
                </p>
                <Button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = '.csv,.geojson,.json';
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files) {
                        handleFiles(target.files);
                      }
                    };
                    input.click();
                  }}
                  className="bg-maphera-blue hover:bg-blue-600"
                >
                  Browse Files
                </Button>              </div>
            </CardContent>
          </Card>

          {/* Dataset Context Component */}
          <DatasetContext 
            onContextUpdate={handleContextUpdate}
            placeholder="Describe your dataset: type of data, collection period, geographic focus, known issues, or analysis goals..."
            maxMessages={3}
          />

          {uploadedFiles.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-roboto">Upload History</CardTitle>
                    <CardDescription className="font-open-sans">
                      Track your file uploads and processing status
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshFileList}
                    disabled={isLoadingFiles}
                    className="ml-4"
                  >
                    {isLoadingFiles ? (
                      <div className="h-4 w-4 border-2 border-maphera-blue border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">Refresh</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {file.type === '.csv' ? (
                          <FileText className="h-8 w-8 text-maphera-blue" />
                        ) : (
                          <Map className="h-8 w-8 text-maphera-green" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate font-open-sans">
                          {file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • {file.uploadedAt.toLocaleTimeString()}
                        </p>
                          {file.status === 'uploading' && (
                          <div className="mt-2">
                            <Progress value={file.progress} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">
                              Uploading... {Math.round(file.progress)}%
                            </p>
                          </div>
                        )}
                        
                        {file.status === 'ready' && (
                          <p className="text-xs text-blue-600 mt-1">Ready for analysis</p>
                        )}
                        
                        {file.status === 'processing' && (
                          <p className="text-xs text-maphera-amber mt-1">Analyzing...</p>
                        )}
                        
                        {file.status === 'complete' && (
                          <p className="text-xs text-green-600 mt-1">Analysis complete</p>
                        )}

                        {file.status === 'error' && file.error && (
                          <p className="text-xs text-red-600 mt-1">Error: {file.error}</p>
                        )}
                      </div>
                        <div className="flex items-center space-x-2">
                        <div className="flex-shrink-0">
                          {getStatusIcon(file.status)}
                        </div>
                        
                        {/* Analyze button for ready files */}
                        {file.status === 'ready' && (
                          <Button
                            onClick={() => analyzeDataset(file.id, file.name)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Analyze
                          </Button>
                        )}
                        
                        {/* View results button for completed analyses */}
                        {file.status === 'complete' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to map view with this dataset
                              window.location.href = `/map?dataset=${file.id}`;
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            View Results
                          </Button>
                        )}
                        
                        {(file.status === 'complete' || file.status === 'error' || file.status === 'ready') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={deletingFileId === file.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deletingFileId === file.id ? (
                                  <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete File</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{file.name}"? This action cannot be undone and will remove the file from storage and all associated analysis results.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteFile(file.id, file.name)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="font-roboto">Upload Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium font-roboto mb-2">Supported Formats</h4>
                <ul className="text-sm text-gray-600 space-y-1 font-open-sans">
                  <li>• CSV files with latitude/longitude columns</li>
                  <li>• GeoJSON files with geographic features</li>
                  <li>• Maximum file size: 50MB</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium font-roboto mb-2">Required Fields</h4>
                <ul className="text-sm text-gray-600 space-y-1 font-open-sans">
                  <li>• Latitude and longitude coordinates</li>
                  <li>• Unique identifier for each record</li>
                  <li>• Timestamp (recommended)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium font-roboto mb-2">Analysis Types</h4>
                <ul className="text-sm text-gray-600 space-y-1 font-open-sans">
                  <li>• Coverage gap analysis</li>
                  <li>• Gini coefficient calculation</li>
                  <li>• Regional disparity metrics</li>
                  <li>• Fairness assessments</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-roboto">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 font-open-sans">Total Uploads</span>
                  <span className="font-medium">{uploadedFiles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 font-open-sans">Ready to Analyze</span>
                  <span className="font-medium text-blue-600">
                    {uploadedFiles.filter(f => f.status === 'ready').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 font-open-sans">Completed</span>
                  <span className="font-medium text-green-600">
                    {uploadedFiles.filter(f => f.status === 'complete').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 font-open-sans">Analyzing</span>
                  <span className="font-medium text-maphera-amber">
                    {uploadedFiles.filter(f => f.status === 'processing').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Upload;
