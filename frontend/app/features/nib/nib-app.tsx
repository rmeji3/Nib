'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChatPanel } from './nib-chat';
import { EvidenceDrawer } from './nib-evidence-drawer';
import { Viewer, ViewerToolbar } from './nib-viewer';
import { useNibState } from './hooks/use-nib-state';
import { useNibChat } from './hooks/use-nib-chat';
import { usePdfSearch } from './hooks/use-pdf-search';
import { useEffect } from 'react';
import { useIngestionStatus } from './hooks/use-ingestion-status';
import { useUpload } from '../upload/upload-context';

export default function NibApp() {
  const { documentId } = useUpload();

  const {
    splitRatio,
    zoom,
    currentPage,
    totalPages,
    chatMinimized,
    pdf,
    setPdf,
    highlight,
    evidenceOpen,
    evidenceCitations,
    evidenceFocusedBlockId,
    setZoom,
    setCurrentPage,
    setTotalPages,
    setChatMinimized,
    scrollContainerRef,
    scrollToPageRef,
    scrollToPage,
    onCiteClick,
    openEvidence,
    closeEvidence,
    onDividerPointerDown,
    onDividerPointerMove,
    onDividerPointerUp,
  } = useNibState();

  const { messages, busy, sendPrompt, onPickSuggestion } = useNibChat(documentId);
  const searchState = usePdfSearch(pdf);
  const { isIndexing, progress, pagesProcessed, pagesTotal } = useIngestionStatus(documentId);

  useEffect(() => {
    // Jump to match when next/prev is clicked
    if (searchState.currentMatch) {
      scrollToPage(searchState.currentMatch.pageIndex);
    }
  }, [searchState.currentMatch, scrollToPage]);

  // Handle Ctrl+F globally
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        // The toolbar manages the 'showSearch' state implicitly when search query is updated,
        // but since we want to toggle the UI cleanly, it might be better handled inside ViewerToolbar.
        // For now, we can just focus the search input if it exists, or dispatch a custom event.
        window.dispatchEvent(new CustomEvent('nib:open-search'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const chatWidthPct = 100 - splitRatio;

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
        searchQuery={searchState.query}
        setSearchQuery={searchState.search}
        onSearchNext={searchState.nextMatch}
        onSearchPrev={searchState.prevMatch}
        matchCount={searchState.matches.length}
        currentMatchIndex={searchState.currentMatchIndex}
        isSearching={searchState.isSearching}
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
            scrollToPageRef={scrollToPageRef}
            searchQuery={searchState.query}
            setPdf={setPdf}
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
                  isIndexing={isIndexing}
                  progress={progress}
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
