'use client';

import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDocument } from '../../../../lib/api/documents';
import { useUpload } from '../../upload/upload-context';

export function useNibUpload() {
  const { file, documentId, setDocument } = useUpload();
  const triggeredFileRef = useRef<File | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (f: File) => uploadDocument(f),
    onSuccess: (data) => {
      setDocument(null, data.id, data.storageUrl);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Auto-upload when a local file is set with no backend document ID yet
  useEffect(() => {
    if (
      file &&
      !documentId &&
      triggeredFileRef.current !== file &&
      !mutation.isPending
    ) {
      triggeredFileRef.current = file;
      mutation.mutate(file);
    }
  }, [file, documentId, mutation]);

  return {
    isUploading: mutation.isPending,
    uploadError: mutation.error as Error | null,
  };
}
