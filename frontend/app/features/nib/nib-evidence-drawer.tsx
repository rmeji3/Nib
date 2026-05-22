'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Citation } from './nib-types';
import { Icon } from './nib-viewer';

/**
 * Side-panel evidence viewer.
 *
 * Slides in from the right edge of the chat panel when the user opens
 * "Evidence" on an assistant message. Shows each cited page's vision summary
 * and text excerpt with a Jump-to-page action.
 *
 * Designed to sit inside the chat column (not the viewport) so it never
 * overlaps the PDF viewer — width is bounded by the chat panel's own width.
 */
export function EvidenceDrawer({
  citations,
  open,
  onClose,
  onJumpTo,
  focusedBlockId,
}: {
  citations: Citation[];
  open: boolean;
  onClose: () => void;
  onJumpTo: (citation: Citation) => void;
  focusedBlockId: string | null;
}) {
  // Scroll the focused citation into view when the drawer opens
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !focusedBlockId) return;
    // Wait one frame for the spring to start so the focused element exists
    const id = window.requestAnimationFrame(() => {
      const el = bodyRef.current?.querySelector<HTMLElement>(
        `[data-evidence-block-id="${focusedBlockId}"]`,
      );
      if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, focusedBlockId]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="evidence-drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 340, damping: 36, mass: 0.7 }}
          className="absolute inset-y-0 right-0 z-20 flex w-[340px] flex-col border-l border-white/10 bg-[var(--bg-base)] shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.6)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-text)]">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                  <path d="M10 3v3h3" />
                </svg>
              </span>
              <h3 className="text-[13px] font-semibold text-[var(--text)]">
                Evidence
                <span className="ml-1.5 text-[var(--text-dim)] font-normal">
                  · {citations.length} source{citations.length !== 1 ? 's' : ''}
                </span>
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              title="Close evidence"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-dim)] transition hover:bg-white/5 hover:text-[var(--text)]"
            >
              <Icon name="close" />
            </button>
          </div>

          {/* Body */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-3">
            {citations.length === 0 ? (
              <div className="py-12 text-center text-[12px] text-[var(--text-dim)]">
                No citations in this answer.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {citations.map((citation, index) => (
                  <EvidenceRow
                    key={`${citation.blockId}-${index}`}
                    citation={citation}
                    index={index + 1}
                    focused={citation.blockId === focusedBlockId}
                    onJumpTo={onJumpTo}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EvidenceRow({
  citation,
  index,
  focused,
  onJumpTo,
}: {
  citation: Citation;
  index: number;
  focused: boolean;
  onJumpTo: (citation: Citation) => void;
}) {
  const [expanded, setExpanded] = useState(focused);

  const hasVisual = !!citation.visualSummary && citation.visualSummary.length > 0;
  const hasText = !!citation.textExcerpt && citation.textExcerpt.length > 0;

  return (
    <article
      data-evidence-block-id={citation.blockId}
      className={`rounded-lg border bg-[var(--bg-surface)] p-3 transition-colors ${
        focused
          ? 'border-[var(--citation-line)] [box-shadow:0_0_16px_-4px_var(--citation)]'
          : 'border-white/10'
      }`}
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-[var(--accent-soft)] px-1.5 font-semibold text-[var(--accent-text)]">
            {index}
          </span>
          <span className="font-medium text-[var(--text)]">{citation.label}</span>
        </div>
        <button
          type="button"
          onClick={() => onJumpTo(citation)}
          className="inline-flex h-6 items-center gap-1 rounded border border-white/10 px-2 text-[11px] text-[var(--text-dim)] transition hover:border-white/20 hover:bg-white/5 hover:text-[var(--text)]"
          title="Jump to page"
        >
          Jump
          <Icon name="arrow-right" />
        </button>
      </header>

      {hasVisual && (
        <EvidenceField
          label="Visual"
          content={citation.visualSummary!}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
      )}
      {hasText && (
        <EvidenceField
          label="Text"
          content={citation.textExcerpt!}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
      )}
      {!hasVisual && !hasText && (
        <p className="text-[11.5px] text-[var(--text-dim)] italic">
          No excerpt captured for this page.
        </p>
      )}
    </article>
  );
}

const CLAMP_CHARS = 240;

function EvidenceField({
  label,
  content,
  expanded,
  onToggle,
}: {
  label: string;
  content: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tooLong = content.length > CLAMP_CHARS;
  const shown = tooLong && !expanded ? content.slice(0, CLAMP_CHARS) + '…' : content;

  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
        {label}
      </div>
      <p className="whitespace-pre-line text-[11.5px] leading-[1.55] text-[var(--text-dim)]">
        {shown}
      </p>
      {tooLong && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 text-[10.5px] font-medium text-[var(--accent-text)] hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
