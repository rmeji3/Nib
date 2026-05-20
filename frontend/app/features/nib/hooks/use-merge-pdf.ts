'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mergeDocuments } from '../../../../lib/api/documents';
import { useUpload } from '../../upload/upload-context';

export function useMergePdf() {
  const { documentId, file, setDocument } = useUpload();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mergeFile: File) => mergeDocuments(documentId, file, mergeFile),
    onSuccess: (data) => {
      setDocument(null, data.id, data.storageUrl);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
