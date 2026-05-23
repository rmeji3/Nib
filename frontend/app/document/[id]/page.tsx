'use client';

import { use, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '../../features/auth/components/protected-route';
import { NibLogoSpinner } from '../../components/nib-logo-spinner';
import { useUpload } from '../../features/upload/upload-context';
import { fetchDocument } from '../../../lib/api/documents';
import { useTrackDocumentOpen } from '../../home/hooks/use-documents';

const NibApp = dynamic(() => import('../../features/nib/nib-app'), { ssr: false });

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { documentId, setDocument } = useUpload();
  const trackOpen = useTrackDocumentOpen();

  // Only hit the API when this document isn't already in context
  const needsFetch = documentId !== id;
  // Must be declared before the effects that reference it
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

  return (
    <ProtectedRoute>
      <main className="h-[100dvh] overflow-hidden">
        <NibApp />
      </main>
    </ProtectedRoute>
  );
}
