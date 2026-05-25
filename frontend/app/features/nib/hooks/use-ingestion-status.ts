import { useQuery } from '@tanstack/react-query';
import { fetchIngestionStatus, type IngestionStatus } from '../../../../lib/api/documents';

const DONE_STATUSES = new Set(['COMPLETE', 'FAILED', 'NOT_STARTED']);

export function useIngestionStatus(documentId: string | null) {
  const { data, isLoading } = useQuery<IngestionStatus>({
    queryKey: ['ingestion-status', documentId],
    queryFn: () => fetchIngestionStatus(documentId!),
    enabled: !!documentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling once terminal state is reached
      return status && DONE_STATUSES.has(status) ? false : 2000;
    },
    staleTime: 0,
  });

  const status = data?.status ?? 'NOT_STARTED';
  const isIndexing = status === 'PENDING' || status === 'PROCESSING';
  const isComplete = status === 'COMPLETE';
  const isFailed = status === 'FAILED';
  const progress = data?.pagesTotal
    ? Math.round((data.pagesProcessed / data.pagesTotal) * 100)
    : 0;

  return {
    status,
    isIndexing,
    isComplete,
    isFailed,
    pagesTotal: data?.pagesTotal ?? null,
    pagesProcessed: data?.pagesProcessed ?? 0,
    progress,
    isLoading,
  };
}
