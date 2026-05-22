import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCollections,
  createCollection,
  renameCollection,
  deleteCollection,
  fetchCollectionDocuments,
  addToCollection,
  removeFromCollection,
  type CollectionSummary,
} from '../../../lib/api/collections';
import { mapToDocumentItem } from './use-documents';

export type { CollectionSummary };

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
    staleTime: 30_000,
  });
}

export function useCollectionDocuments(collectionId: string) {
  return useInfiniteQuery({
    queryKey: ['collections', collectionId, 'documents'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetchCollectionDocuments(collectionId, pageParam);
      return {
        ...response,
        content: response.content.map(mapToDocumentItem),
      };
    },
    enabled: !!collectionId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.pageNumber + 1),
    staleTime: 30_000,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCollection(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useRenameCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameCollection(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useAddToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, documentIds }: { collectionId: string; documentIds: string[] }) =>
      addToCollection(collectionId, documentIds),
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['collections', collectionId, 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useRemoveFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, documentId }: { collectionId: string; documentId: string }) =>
      removeFromCollection(collectionId, documentId),
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['collections', collectionId, 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}
