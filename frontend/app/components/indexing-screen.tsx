'use client';

import { useEffect, useState } from 'react';
import { LogoLoader } from './logo-loader';
import { IndexingProgressBar } from './indexing-progress-bar';
import { ProtectedRoute } from '../features/auth/components/protected-route';
import { useIndexingDisplay } from '../features/nib/hooks/use-indexing-display-progress';

export type IndexingScreenProps = {
  progress?: number;
  pagesProcessed?: number;
  pagesTotal?: number | null;
  /** Backend indexing finished — bar animates to 100%, then `onFinished` fires. */
  isComplete?: boolean;
  onFinished?: () => void;
  title?: string;
  subtitle?: string;
};

export function IndexingScreen({
  pagesProcessed = 0,
  pagesTotal = null,
  isComplete = false,
  onFinished,
  title = 'Preparing your document…',
  subtitle = 'Indexing pages so the AI can answer questions accurately.',
}: IndexingScreenProps) {
  const [hasCalledFinished, setHasCalledFinished] = useState(false);
  const { percent, pagesProcessed: displayPages } = useIndexingDisplay(
    pagesProcessed,
    pagesTotal,
    isComplete,
  );

  useEffect(() => {
    if (!isComplete || !onFinished || hasCalledFinished || percent < 100) return;

    const timer = setTimeout(() => {
      setHasCalledFinished(true);
      onFinished();
    }, 550);

    return () => clearTimeout(timer);
  }, [isComplete, onFinished, hasCalledFinished, percent]);

  return (
    <ProtectedRoute>
      <main className="flex h-[100dvh] flex-col items-center justify-center gap-6 bg-[var(--bg-base)] px-6 text-center">
        <LogoLoader size={72} />

        <div className="max-w-md">
          <div className="mx-auto flex w-fit items-center justify-center font-semibold text-[var(--text)]">
            <span className="text-[15px]">{title}</span>
          </div>
          <p className="mt-2 text-[12.5px] text-[var(--text-faint)]">{subtitle}</p>
        </div>

        <IndexingProgressBar
          display={percent}
          pagesProcessed={displayPages}
          pagesTotal={pagesTotal}
        />
      </main>
    </ProtectedRoute>
  );
}
