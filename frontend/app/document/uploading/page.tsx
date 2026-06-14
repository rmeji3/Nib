'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../features/auth/components/protected-route';
import { IndexingScreen } from '../../components/indexing-screen';
import { useUpload } from '../../features/upload/upload-context';
import { useIngestionStatus } from '../../features/nib/hooks/use-ingestion-status';

export default function UploadingPage() {
  const { isUploading, uploadError, documentId } = useUpload();
  const router = useRouter();

  const {
    isComplete,
    isFailed,
    pagesProcessed,
    pagesTotal,
  } = useIngestionStatus(isUploading ? null : documentId);

  const goToDocument = useCallback(() => {
    if (documentId) {
      router.replace(`/document/${documentId}`);
    }
  }, [documentId, router]);

  // Refreshed without an active upload — return home
  useEffect(() => {
    if (!isUploading && !documentId && !uploadError) {
      router.replace('/home');
    }
  }, [isUploading, documentId, uploadError, router]);

  // Indexing failed — open the doc page so the viewer can show the error state
  useEffect(() => {
    if (!isUploading && documentId && isFailed) {
      router.replace(`/document/${documentId}`);
    }
  }, [isUploading, documentId, isFailed, router]);

  if (uploadError) {
    return (
      <ProtectedRoute>
        <main className="flex h-[100dvh] flex-col items-center justify-center gap-6 bg-[var(--bg-base)]">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Upload failed</p>
              <p className="mt-1 text-xs text-[var(--text-faint)]">{uploadError}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/home')}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[var(--text)] px-4 text-sm font-medium text-[var(--bg-base)] transition hover:opacity-90"
            >
              Back to library
            </button>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <IndexingScreen
      pagesProcessed={pagesProcessed}
      pagesTotal={pagesTotal}
      isComplete={!isUploading && isComplete}
      onFinished={!isUploading && isComplete ? goToDocument : undefined}
      title={isUploading ? 'Uploading your document…' : 'Preparing your document…'}
      subtitle={
        isUploading
          ? 'This will only take a moment.'
          : 'Indexing pages so the AI can answer questions accurately.'
      }
    />
  );
}
