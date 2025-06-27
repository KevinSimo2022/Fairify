import { useState, useEffect, useCallback } from 'react';

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

const STORAGE_KEY = 'maphera-uploaded-files';

export const useUploadState = (userId?: string) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (!userId) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
      if (stored) {
        const parsedFiles = JSON.parse(stored).map((file: any) => ({
          ...file,
          uploadedAt: new Date(file.uploadedAt)
        }));
        setUploadedFiles(parsedFiles);
      }
    } catch (error) {
      console.error('Error loading upload state from localStorage:', error);
    }
  }, [userId]);

  // Save to localStorage whenever uploadedFiles changes
  useEffect(() => {
    if (!userId || uploadedFiles.length === 0) return;
    
    try {
      localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(uploadedFiles));
    } catch (error) {
      console.error('Error saving upload state to localStorage:', error);
    }
  }, [uploadedFiles, userId]);

  const updateUploadedFiles = useCallback((updater: (prev: UploadedFile[]) => UploadedFile[]) => {
    setUploadedFiles(updater);
  }, []);

  const addUploadedFile = useCallback((file: UploadedFile) => {
    setUploadedFiles(prev => [...prev, file]);
  }, []);

  const updateUploadedFile = useCallback((fileId: string, updates: Partial<UploadedFile>) => {
    setUploadedFiles(prev => 
      prev.map(f => 
        f.id === fileId 
          ? { ...f, ...updates }
          : f
      )
    );
  }, []);

  const removeUploadedFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const clearUploadedFiles = useCallback(() => {
    setUploadedFiles([]);
    if (userId) {
      localStorage.removeItem(`${STORAGE_KEY}-${userId}`);
    }
  }, [userId]);

  return {
    uploadedFiles,
    setUploadedFiles: updateUploadedFiles,
    addUploadedFile,
    updateUploadedFile,
    removeUploadedFile,
    clearUploadedFiles
  };
};
