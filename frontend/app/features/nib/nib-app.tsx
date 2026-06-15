'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChatPanel } from './nib-chat';
import { EvidenceDrawer } from './nib-evidence-drawer';
import { Viewer, ViewerToolbar } from './nib-viewer';
import { useNibState } from './hooks/use-nib-state';
import { useNibChat } from './hooks/use-nib-chat';
import { usePdfSearch } from './hooks/use-pdf-search';
import { useEffect, useState } from 'react';
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

  const {
    sessionId,
    sessions,
    starters,
    messages,
    busy,
    isWaitingForResponse,
    canSubmitPrompt,
    isLoadingMessages,
    deletingSessionId,
    chatError,
    canCreateNewChat,
    sendPrompt,
    onPickSuggestion,
    createNewChat,
    deleteChat,
    regenerateResponse,
    removeMessage,
    reportMessage,
    selectSession,
  } = useNibChat(documentId);
  const searchState = usePdfSearch(pdf);
  const {
    isIndexing,
    isFailed,
    progress,
    pagesProcessed,
    pagesTotal,
    shouldHideDocument,
  } = useIngestionStatus(documentId);

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

  // Mobile: detect small screens to switch to tab-based layout
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // On mobile, chat takes 100% width when open (full-screen tab)
  const effectiveChatWidth = isMobile && !chatMinimized ? 100 : chatWidthPct;

  return (
    <div className={`grid h-full overflow-hidden ${isMobile ? 'grid-rows-[48px_1fr_48px]' : 'grid-rows-[48px_1fr]'}`}>
      <ViewerToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        onJumpPage={(page) => {
          // On mobile, switch to PDF view so the user can see the page change
          if (isMobile && !chatMinimized) setChatMinimized(true);
          // Update toolbar display immediately without waiting for scroll event
          setCurrentPage(page);
          scrollToPage(page);
        }}
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
      <div className={`relative flex h-full min-h-0 overflow-hidden ${isMobile ? 'flex-col' : ''}`}>
        {/* Viewer — always rendered, shrinks via margin-right transition */}
        <div
          className="h-full min-h-0 flex-1 overflow-hidden transition-[margin-right] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ marginRight: chatMinimized ? 0 : `${effectiveChatWidth}%` }}
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
            lockedUntilIndexed={shouldHideDocument}
            indexingFailed={isFailed}
            indexingProgress={progress}
            indexingPagesProcessed={pagesProcessed}
            indexingPagesTotal={pagesTotal}
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
              style={{ width: `${effectiveChatWidth}%` }}
            >
              {/* Resize handle — hidden on mobile where drag-resize makes no sense */}
              <div
                className="divider group relative hidden sm:flex w-4 shrink-0 cursor-col-resize items-center justify-center border-x border-white/10 transition-colors hover:bg-[var(--accent-soft)]"
                onPointerDown={onDividerPointerDown}
                onPointerMove={onDividerPointerMove}
                onPointerUp={onDividerPointerUp}
              >
                <div className="h-10 w-[3px] rounded-full bg-white/25 transition-all group-hover:h-16 group-hover:bg-white/60 group-[.dragging]:bg-[var(--accent)]" />
              </div>

              {/* Chat */}
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                <ChatPanel
                  sessions={sessions}
                  activeSessionId={sessionId}
                  starters={starters}
                  messages={messages}
                  chatError={chatError}
                  isLoadingMessages={isLoadingMessages}
                  canSubmitPrompt={canSubmitPrompt}
                  onSendPrompt={sendPrompt}
                  onPickSuggestion={onPickSuggestion}
                  onNewChat={createNewChat}
                  onSelectSession={(nextSessionId) => {
                    void selectSession(nextSessionId);
                  }}
                  onDeleteSession={deleteChat}
                  onRegenerateResponse={regenerateResponse}
                  onRemoveMessage={removeMessage}
                  onReportMessage={reportMessage}
                  deletingSessionId={deletingSessionId}
                  canCreateNewChat={canCreateNewChat}
                  onCiteClick={onCiteClick}
                  onEvidenceOpen={openEvidence}
                  busy={busy}
                  isWaitingForResponse={isWaitingForResponse}
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

      {/* Mobile PDF/Chat tab bar */}
      {isMobile && (
        <div className="flex h-12 shrink-0 items-stretch border-t border-white/10 bg-[var(--bg-base)]">
          <button
            type="button"
            onClick={() => setChatMinimized(true)}
            className={`flex flex-1 items-center justify-center gap-2 text-[13px] font-medium transition-colors ${
              chatMinimized
                ? 'text-[var(--text)] bg-white/5'
                : 'text-[var(--text-faint)] hover:text-[var(--text-dim)]'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            PDF
          </button>
          <div className="w-px bg-white/10" />
          <button
            type="button"
            onClick={() => setChatMinimized(false)}
            className={`flex flex-1 items-center justify-center gap-2 text-[13px] font-medium transition-colors ${
              !chatMinimized
                ? 'text-[var(--text)] bg-white/5'
                : 'text-[var(--text-faint)] hover:text-[var(--text-dim)]'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat
          </button>
        </div>
      )}
    </div>
  );
}
