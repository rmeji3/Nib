'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChatPanel } from './nib-chat';
import { EvidenceDrawer } from './nib-evidence-drawer';
import { Viewer, ViewerToolbar } from './nib-viewer';
import { useNibState } from './hooks/use-nib-state';
import { useNibChat } from './hooks/use-nib-chat';
import { useIngestionStatus } from './hooks/use-ingestion-status';
import { useUpload } from '../upload/upload-context';

/**
 * Full-page overlay shown while the backend is ingesting the document.
 * Blocks all interaction — user can't see the PDF or chat until indexing
 * completes. This prevents queries against an empty/partial index.
 */
function IngestionOverlay({
  progress,
  pagesProcessed,
  pagesTotal,
  isFailed,
}: {
  progress: number;
  pagesProcessed: number;
  pagesTotal: number | null;
  isFailed: boolean;
}) {
  const stage =
    isFailed
      ? { title: 'Indexing failed', detail: 'Something went wrong during ingestion. Try re-uploading the document.' }
      : pagesTotal === null || pagesTotal === 0
        ? { title: 'Reading PDF', detail: 'Parsing pages and extracting text…' }
        : pagesProcessed >= pagesTotal
          ? { title: 'Embedding & indexing', detail: 'Storing embeddings in the vector database. Almost done.' }
          : {
              title: `Analyzing page ${pagesProcessed + 1} of ${pagesTotal}`,
              detail: 'Running vision analysis on each page — extracting tables, charts, and figures.',
            };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-[var(--bg-base)]">
      {/* Glow background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
          style={{
            width: 600,
            height: 600,
            filter: 'blur(120px)',
            opacity: 0.15,
            background: 'radial-gradient(circle, var(--accent-glow-a), transparent 60%)',
          }}
        />
      </div>

      {/* Pulsing dot + title */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent)]" />
          </span>
          <span className="text-[15px] font-semibold text-[var(--text)]">{stage.title}</span>
        </div>

        {/* Progress bar */}
        {!isFailed && pagesTotal !== null && pagesTotal > 0 && (
          <div className="w-64">
            <div className="mb-2 flex justify-between text-[11px] text-[var(--text-faint)]">
              <span>{pagesProcessed} of {pagesTotal} pages</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <p className="max-w-[300px] text-center text-[12.5px] leading-relaxed text-[var(--text-faint)]">
          {stage.detail}
        </p>

        {isFailed && (
          <a
            href="/home"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] transition hover:opacity-90"
          >
            Back to library
          </a>
        )}
      </div>
    </div>
  );
}

export default function NibApp() {
  const { documentId } = useUpload();

  const {
    splitRatio,
    zoom,
    currentPage,
    totalPages,
    chatMinimized,
    highlight,
    evidenceOpen,
    evidenceCitations,
    evidenceFocusedBlockId,
    setZoom,
    setCurrentPage,
    setTotalPages,
    setChatMinimized,
    scrollContainerRef,
    scrollToPage,
    onCiteClick,
    openEvidence,
    closeEvidence,
    onDividerPointerDown,
    onDividerPointerMove,
    onDividerPointerUp,
  } = useNibState();

  const { messages, busy, sendPrompt, onPickSuggestion } = useNibChat(documentId);
  const { isIndexing, isComplete, isFailed, progress, pagesProcessed, pagesTotal, isLoading: statusLoading } = useIngestionStatus(documentId);

  const chatWidthPct = 100 - splitRatio;

  // ── Full-page gate: block viewer + chat until ingestion finishes ──
  // Also gate on initial status load so the viewer doesn't flash before we
  // know whether ingestion is still running.
  if (statusLoading || isIndexing || isFailed) {
    return (
      <IngestionOverlay
        progress={progress}
        pagesProcessed={pagesProcessed}
        pagesTotal={pagesTotal}
        isFailed={isFailed}
      />
    );
  }

  return (
    <div className="grid h-full grid-rows-[48px_1fr] overflow-hidden">
      <ViewerToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        onJumpPage={scrollToPage}
        zoom={zoom}
        setZoom={setZoom}
        chatMinimized={chatMinimized}
        onToggleChat={() => setChatMinimized((v) => !v)}
      />

      {/* Main content row */}
      <div className="relative flex h-full min-h-0 overflow-hidden">
        {/* Viewer — always rendered, shrinks via margin-right transition */}
        <div
          className="h-full min-h-0 flex-1 overflow-hidden transition-[margin-right] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ marginRight: chatMinimized ? 0 : `${chatWidthPct}%` }}
        >
          <Viewer
            currentPage={currentPage}
            totalPages={totalPages}
            onPageCountChange={setTotalPages}
            setCurrentPage={setCurrentPage}
            zoom={zoom}
            setZoom={setZoom}
            scrollContainerRef={scrollContainerRef}
            highlight={highlight}
          />
        </div>

        {/* Chat panel — slides in from right as absolute overlay */}
        <AnimatePresence>
          {!chatMinimized && (
            <motion.div
              key="chat-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 36, mass: 0.8 }}
              className="absolute bottom-0 right-0 top-0 flex select-text"
              style={{ width: `${chatWidthPct}%` }}
            >
              {/* Resize handle */}
              <div
                className="divider group relative flex w-4 shrink-0 cursor-col-resize items-center justify-center border-x border-white/10 transition-colors hover:bg-[var(--accent-soft)]"
                onPointerDown={onDividerPointerDown}
                onPointerMove={onDividerPointerMove}
                onPointerUp={onDividerPointerUp}
              >
                <div className="h-10 w-[3px] rounded-full bg-white/25 transition-all group-hover:h-16 group-hover:bg-white/60 group-[.dragging]:bg-[var(--accent)]" />
              </div>

              {/* Chat */}
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                <ChatPanel
                  messages={messages}
                  onSendPrompt={sendPrompt}
                  onPickSuggestion={onPickSuggestion}
                  onCiteClick={onCiteClick}
                  onEvidenceOpen={openEvidence}
                  busy={busy}
                  onToggleMinimize={() => setChatMinimized(true)}
                  isIndexing={false}
                  progress={100}
                  pagesProcessed={pagesProcessed}
                  pagesTotal={pagesTotal}
                />
                <EvidenceDrawer
                  citations={evidenceCitations}
                  open={evidenceOpen}
                  onClose={closeEvidence}
                  onJumpTo={(citation) => {
                    onCiteClick(citation);
                  }}
                  focusedBlockId={evidenceFocusedBlockId}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
