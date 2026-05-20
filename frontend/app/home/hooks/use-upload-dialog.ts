'use client';

import { useState, useEffect } from 'react';

export function useUploadDialog() {
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState('');

  // Auto-fill name from first file added
  useEffect(() => {
    if (files.length > 0 && !name.trim()) {
      setName(files[0].name.replace(/\.pdf$/i, ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]);

  const addFiles = (incoming: File[]) => {
    const validPdfs = incoming.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    );
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const fresh = validPdfs.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...fresh];
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setFiles([]);
    setName('');
  };

  return { files, name, setName, addFiles, removeFile, reset };
}
