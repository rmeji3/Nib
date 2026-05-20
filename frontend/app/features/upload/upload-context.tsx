'use client';

import React, { createContext, useContext, useState } from 'react';

type UploadContextType = {
  file: File | null;
  documentId: string | null;
  documentUrl: string | null;
  setFile: (file: File | null) => void;
  setDocument: (file: File | null, documentId: string | null, documentUrl: string | null) => void;
};

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [file, setFileState] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  const setFile = (f: File | null) => {
    setFileState(f);
    setDocumentId(null);
    setDocumentUrl(null);
  };

  const setDocument = (f: File | null, id: string | null, url: string | null) => {
    setFileState(f);
    setDocumentId(id);
    setDocumentUrl(url);
  };

  return (
    <UploadContext.Provider value={{ file, documentId, documentUrl, setFile, setDocument }}>
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
