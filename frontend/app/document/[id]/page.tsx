'use client';

import { use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '../../features/auth/components/protected-route';
import { NibLogoSpinner } from '../../components/nib-logo-spinner';
import { IndexingScreen } from '../../components/indexing-screen';
import { useUpload } from '../../features/upload/upload-context';
import { fetchDocument } from '../../../lib/api/documents';
import { useTrackDocumentOpen } from '../../home/hooks/use-documents';
import { useIngestionStatus } from '../../features/nib/hooks/use-ingestion-status';

const NibApp = dynamic(() => import('../../features/nib/nib-app'), { ssr: false });

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { documentId, setDocument } = useUpload();
  const trackOpen = useTrackDocumentOpen();

  const [indexingGateActive, setIndexingGateActive] = useState(false);
  const [indexingDismissed, setIndexingDismissed] = useState(false);

  // Only hit the API when this document isn't already in context
  const needsFetch = documentId !== id;
  const isContextReady = documentId === id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument(id),
    enabled: needsFetch,
    staleTime: 50 * 60 * 1000, // 50 min (signed URLs expire in 60 min)
  });
  const isStorageMissing = needsFetch && !!data && !data.storageUrl;

  useEffect(() => {
    if (data?.storageUrl && needsFetch) {
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

  const {
    isIndexing,
    isComplete,
    isFailed,
    pagesProcessed,
    pagesTotal,
    isLoading: ingestionLoading,
  } = useIngestionStatus(isContextReady ? id : null);

  // Activate the indexing gate once we know indexing is in progress (not on revisit
  // of already-indexed docs where the first poll returns COMPLETE immediately).
  useEffect(() => {
    if (isContextReady && !ingestionLoading && isIndexing) {
      setIndexingGateActive(true);
    }
  }, [isContextReady, ingestionLoading, isIndexing]);

  // Failed indexing should fall through to the viewer error state, not stall the gate.
  useEffect(() => {
    if (indexingGateActive && !ingestionLoading && isFailed) {
      setIndexingDismissed(true);
      setIndexingGateActive(false);
    }
  }, [indexingGateActive, ingestionLoading, isFailed]);

  const showIndexingGate = indexingGateActive && !indexingDismissed;
  const indexingDone = showIndexingGate && !isIndexing && !isFailed;

  // ── Loading states ────────────────────────────────────────────────────────────
  if (isStorageMissing) {
    return (
      <ProtectedRoute>
        <main className="flex h-[100dvh] items-center justify-center bg-[var(--bg-base)]">
          <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
            <p className="text-sm text-red-400">This document record exists, but its storage file is missing.</p>
            <p className="text-xs leading-5 text-[var(--text-dim)]">
              Delete this stale library item or re-upload the PDF to open it again.
            </p>
            <a href="/home" className="text-xs text-[var(--text-dim)] underline hover:text-[var(--text)]">
              Back to library
            </a>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

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

  if (showIndexingGate) {
    return (
      <IndexingScreen
        pagesProcessed={pagesProcessed}
        pagesTotal={pagesTotal}
        isComplete={indexingDone && isComplete}
        onFinished={
          indexingDone && isComplete
            ? () => {
                setIndexingDismissed(true);
                setIndexingGateActive(false);
              }
            : undefined
        }
      />
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
