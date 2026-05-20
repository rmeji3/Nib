import { useQuery } from '@tanstack/react-query';
import { fetchDocuments, type DocumentResponse } from '../../../lib/api/documents';

export interface DocumentItem {
  id: string;
  title: string;
  meta: string;
  tag: string;
  storageUrl: string;
  pageCount: number | null;
  fileSizeBytes: number | null;
  createdAt: string;
}

function formatMeta(doc: DocumentResponse): string {
  const parts: string[] = [];
  if (doc.pageCount) parts.push(`${doc.pageCount} p`);
  if (doc.fileSizeBytes) {
    const kb = Math.round(doc.fileSizeBytes / 1024);
    parts.push(kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
  }
  if (doc.createdAt) {
    const date = new Date(doc.createdAt);
    parts.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  }
  return parts.join(' · ');
}

function mapToDocumentItem(doc: DocumentResponse): DocumentItem {
  return {
    id: doc.id,
    title: doc.originalFilename.replace(/\.pdf$/i, ''),
    meta: formatMeta(doc),
    tag: 'PDF',
    storageUrl: doc.storageUrl,
    pageCount: doc.pageCount,
    fileSizeBytes: doc.fileSizeBytes,
    createdAt: doc.createdAt,
  };
}

export function useDocuments(searchTerm: string) {
  return useQuery({
    queryKey: ['documents', searchTerm],
    queryFn: async () => {
      const data = await fetchDocuments(searchTerm || undefined);
      return data.map(mapToDocumentItem);
    },
    staleTime: 30_000,
  });
}
