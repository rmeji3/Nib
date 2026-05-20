'use client';

import { use, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '../../features/auth/components/protected-route';
import { NibLogoSpinner } from '../../components/nib-logo-spinner';
import { useUpload } from '../../features/upload/upload-context';
import { fetchDocument } from '../../../lib/api/documents';

const NibApp = dynamic(() => import('../../features/nib/nib-app'), { ssr: false });

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { documentId, setDocument } = useUpload();

  // Only hit the API when this document isn't already in context
  const needsFetch = documentId !== id;

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

  // Wait until the context actually holds this document before rendering the viewer.
  // This prevents react-pdf from trying to load an undefined source in the render
  // cycle between the query completing and the useEffect calling setDocument.
  const isContextReady = documentId === id;

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
