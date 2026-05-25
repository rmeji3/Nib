'use client';

import { use, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '../../features/auth/components/protected-route';
import { NibLogoSpinner } from '../../components/nib-logo-spinner';
import { useUpload } from '../../features/upload/upload-context';
import { fetchDocument } from '../../../lib/api/documents';
import { useTrackDocumentOpen } from '../../home/hooks/use-documents';
import { useIngestionStatus } from '../../features/nib/hooks/use-ingestion-status';

const NibApp = dynamic(() => import('../../features/nib/nib-app'), { ssr: false });

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { documentId, setDocument } = useUpload();
  const trackOpen = useTrackDocumentOpen();

  // Only hit the API when this document isn't already in context
  const needsFetch = documentId !== id;
  const isContextReady = documentId === id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument(id),
    enabled: needsFetch,
    staleTime: 50 * 60 * 1000, // 50 min (signed URLs expire in 60 min)
  });

  useEffect(() => {
    if (data && needsFetch) {
      const displayName = data.originalFilename.replace(/\.pdf$/i, '');
      setDocument(null, data.id, data.storageUrl, displayName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Stamp lastOpenedAt once the document is ready in context
  useEffect(() => {
    if (isContextReady) {
      trackOpen.mutate(id);
    }
  // Fire once per mount — intentionally omitting trackOpen from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isContextReady, id]);

  // ── Ingestion status — hoisted to page level so we can gate the viewer ──────
  // Polling starts once the document is in context (valid id available).
  const {
    isIndexing,
    progress,
    pagesProcessed,
    pagesTotal,
    isLoading: ingestionLoading,
  } = useIngestionStatus(isContextReady ? id : null);

  // ── Loading states ────────────────────────────────────────────────────────────
  if (!isContextReady || (needsFetch && isLoading)) {
    return (
      <ProtectedRoute>
        <main className="flex h-[100dvh] items-center justify-center bg-[var(--bg-base)]">
          <NibLogoSpinner size={26} label="Loading document" />
        </main>
      </ProtectedRoute>
    );
  }

  if (needsFetch && isError) {
    return (
      <ProtectedRoute>
        <main className="flex h-[100dvh] items-center justify-center bg-[var(--bg-base)]">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-red-400">Document not found or you don&apos;t have access.</p>
            <a href="/home" className="text-xs text-[var(--text-dim)] underline hover:text-[var(--text)]">
              Back to library
            </a>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  // ── Indexing gate — show preparation screen while PENDING / PROCESSING ────────
  // Only block when we *know* indexing is active (ingestionLoading = true means we
  // haven't heard back yet, so don't flash the preparation screen for already-
  // indexed documents on revisit).
  if (!ingestionLoading && isIndexing) {
    return (
      <ProtectedRoute>
        <main className="flex h-[100dvh] flex-col items-center justify-center gap-6 bg-[var(--bg-base)] px-6 text-center">
          {/* Pulsing accent dot */}
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent)]" />
          </span>

          <div>
            <p className="text-[15px] font-semibold text-[var(--text)]">Preparing your document…</p>
            <p className="mt-1 text-[12.5px] text-[var(--text-faint)]">
              Indexing pages so the AI can answer questions accurately.
            </p>
          </div>

          {/* Progress bar — shown once we know the total page count */}
          {pagesTotal !== null && pagesTotal > 0 && (
            <div className="w-56">
              <div className="mb-2 flex justify-between text-[11px] text-[var(--text-faint)]">
                <span>{pagesProcessed} of {pagesTotal} pages</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="h-[100dvh] overflow-hidden">
        <NibApp />
      </main>
    </ProtectedRoute>
  );
}
