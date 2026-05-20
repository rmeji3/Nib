'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../features/auth/components/protected-route';
import { NibLogoSpinner } from '../../components/nib-logo-spinner';
import { useUpload } from '../../features/upload/upload-context';

export default function UploadingPage() {
  const { isUploading, uploadError, documentId } = useUpload();
  const router = useRouter();

  // Once upload finishes, redirect to the document or back home on error
  useEffect(() => {
    if (!isUploading) {
      if (documentId) {
        router.replace(`/document/${documentId}`);
      } else if (!uploadError) {
        // Upload hasn't started yet (e.g., page refreshed) — go home
        router.replace('/home');
      }
      // If uploadError: stay on page to show the error
    }
  }, [isUploading, documentId, uploadError, router]);

  return (
    <ProtectedRoute>
      <main className="flex h-[100dvh] flex-col items-center justify-center gap-6 bg-[var(--bg-base)]">
        {uploadError ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
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
        ) : (
          <div className="flex flex-col items-center gap-5 text-center">
            <NibLogoSpinner size={28} />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Uploading your document…</p>
              <p className="mt-1 text-xs text-[var(--text-faint)]">This will only take a moment.</p>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
