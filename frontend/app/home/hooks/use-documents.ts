import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDocuments,
  fetchTrashedDocuments,
  fetchStarredDocuments,
  fetchRecentDocuments,
  softDeleteDocument,
  restoreDocument,
  permanentDeleteDocument,
  toggleDocumentStar,
  trackDocumentOpen,
  type DocumentResponse,
} from '../../../lib/api/documents';

export interface DocumentItem {
  id: string;
  title: string;
  meta: string;
  tag: string;
  storageUrl: string | null;
  pageCount: number | null;
  fileSizeBytes: number | null;
  createdAt: string;
  deletedAt: string | null;
  isStarred: boolean;
  lastOpenedAt: string | null;
}

function formatMeta(doc: DocumentResponse): string {
  const parts: string[] = [];
  if (doc.pageCount) parts.push(`${doc.pageCount} p`);
  if (doc.fileSizeBytes) {
    const kb = Math.round(doc.fileSizeBytes / 1024);
    parts.push(kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
  }
  return parts.join(' · ');
}

export function mapToDocumentItem(doc: DocumentResponse): DocumentItem {
  return {
    id: doc.id,
    title: doc.originalFilename.replace(/\.pdf$/i, ''),
    meta: formatMeta(doc),
    tag: 'PDF',
    storageUrl: doc.storageUrl,
    pageCount: doc.pageCount,
    fileSizeBytes: doc.fileSizeBytes,
    createdAt: doc.createdAt,
    deletedAt: doc.deletedAt,
    isStarred: doc.isStarred,
    lastOpenedAt: doc.lastOpenedAt ?? null,
  };
}

export function useDocuments(searchTerm: string) {
  return useInfiniteQuery({
    queryKey: ['documents', searchTerm],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetchDocuments(searchTerm || undefined, pageParam);
      return {
        ...response,
        content: response.content.map(mapToDocumentItem),
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.last) return undefined;
      return lastPage.pageNumber + 1;
    },
    staleTime: 30_000,
  });
}

export function useTrashedDocuments() {
  return useInfiniteQuery({
    queryKey: ['documents', 'trash'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetchTrashedDocuments(pageParam);
      return {
        ...response,
        content: response.content.map(mapToDocumentItem),
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.last) return undefined;
      return lastPage.pageNumber + 1;
    },
    staleTime: 30_000,
  });
}

export function useStarredDocuments() {
  return useInfiniteQuery({
    queryKey: ['documents', 'starred'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetchStarredDocuments(pageParam);
      return {
        ...response,
        content: response.content.map(mapToDocumentItem),
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.last) return undefined;
      return lastPage.pageNumber + 1;
    },
    staleTime: 30_000,
  });
}

export function useSoftDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function usePermanentDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => permanentDeleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useToggleStarDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleDocumentStar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useRecentDocuments() {
  return useInfiniteQuery({
    queryKey: ['documents', 'recent'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetchRecentDocuments(pageParam);
      return {
        ...response,
        content: response.content.map(mapToDocumentItem),
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.last) return undefined;
      return lastPage.pageNumber + 1;
    },
    staleTime: 30_000,
  });
}

export function useTrackDocumentOpen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => trackDocumentOpen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'recent'] });
    },
  });
}
