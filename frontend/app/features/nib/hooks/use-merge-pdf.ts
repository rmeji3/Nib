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
      // Force the document page to refetch the new merged PDF content
      queryClient.invalidateQueries({ queryKey: ['document', data.id] });
      // Reset ingestion status so the UI gates on the new ingestion run
      queryClient.invalidateQueries({ queryKey: ['ingestion-status', data.id] });
      router.push(`/document/${data.id}`);
    },
  });
}
