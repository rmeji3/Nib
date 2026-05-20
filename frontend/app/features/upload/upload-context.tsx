'use client';

import React, { createContext, useContext, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDocument } from '../../../lib/api/documents';

type UploadContextType = {
  file: File | null;
  documentId: string | null;
  documentUrl: string | null;
  documentName: string | null;
  isUploading: boolean;
  uploadError: string | null;
  /** Begin an upload and navigate to /document/uploading to show the loading screen. */
  startUpload: (files: File[], name?: string) => void;
  setFile: (file: File | null) => void;
  setDocument: (
    file: File | null,
    documentId: string | null,
    documentUrl: string | null,
    name?: string | null,
  ) => void;
};

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [file, setFileState] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const setFile = (f: File | null) => {
    setFileState(f);
    setDocumentId(null);
    setDocumentUrl(null);
    setDocumentName(f ? f.name.replace(/\.pdf$/i, '') : null);
  };

  const setDocument = (
    f: File | null,
    id: string | null,
    url: string | null,
    name?: string | null,
  ) => {
    setFileState(f);
    setDocumentId(id);
    setDocumentUrl(url);
    setDocumentName(name ?? (f ? f.name.replace(/\.pdf$/i, '') : null));
  };

  const uploadMutation = useMutation({
    mutationFn: ({ files, name }: { files: File[]; name?: string }) =>
      uploadDocument(files, name),
    onSuccess: (data, variables) => {
      const localFile = variables.files.length === 1 ? variables.files[0] : null;
      const displayName = data.originalFilename.replace(/\.pdf$/i, '');
      setDocument(localFile, data.id, data.storageUrl, displayName);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const startUpload = (files: File[], name?: string) => {
    uploadMutation.reset(); // clear any previous error
    uploadMutation.mutate({ files, name });
  };

  return (
    <UploadContext.Provider
      value={{
        file,
        documentId,
        documentUrl,
        documentName,
        isUploading: uploadMutation.isPending,
        uploadError: uploadMutation.isError
          ? (uploadMutation.error as Error).message
          : null,
        startUpload,
        setFile,
        setDocument,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
