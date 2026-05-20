'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { mergeDocuments } from '../../../../lib/api/documents';
import { useUpload } from '../../upload/upload-context';

export function useMergePdf() {
  const { documentId, file, documentName, setDocument } = useUpload();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (mergeFile: File) => mergeDocuments(documentId, file, mergeFile),
    onSuccess: (data) => {
      setDocument(null, data.id, data.storageUrl, documentName);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      router.push(`/document/${data.id}`);
    },
  });
}
