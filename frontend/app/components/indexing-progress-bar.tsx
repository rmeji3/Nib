'use client';

type IndexingProgressBarProps = {
  display: number;
  pagesProcessed: number;
  pagesTotal: number | null;
  className?: string;
};

export function IndexingProgressBar({
  display,
  pagesProcessed,
  pagesTotal,
  className,
}: IndexingProgressBarProps) {
  const hasPages = pagesTotal !== null && pagesTotal > 0;
  const percent = Math.round(display);

  return (
    <div className={['w-56', className].filter(Boolean).join(' ')}>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-[11px]">
        <span className="font-medium text-[var(--text-dim)]">
          Indexing pages…
        </span>
        <span className="text-[12px] font-semibold tabular-nums tracking-tight">
          {percent}%
        </span>
      </div>
      <div
        className="indexing-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={hasPages ? `${pagesProcessed} of ${pagesTotal} pages indexed` : 'Indexing progress'}
      >
        <div className="indexing-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
