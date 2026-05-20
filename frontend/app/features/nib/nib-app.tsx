'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChatPanel } from './nib-chat';
import { Viewer, ViewerToolbar } from './nib-viewer';
import { useNibState } from './hooks/use-nib-state';
import { useNibChat } from './hooks/use-nib-chat';

export default function NibApp() {
  const {
    splitRatio,
    zoom,
    currentPage,
    totalPages,
    chatMinimized,
    setZoom,
    setCurrentPage,
    setTotalPages,
    setChatMinimized,
    scrollContainerRef,
    scrollToPage,
    onCiteClick,
    onDividerPointerDown,
    onDividerPointerMove,
    onDividerPointerUp,
  } = useNibState();

  const { messages, busy, sendPrompt, onPickSuggestion } = useNibChat();

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
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ChatPanel
                  messages={messages}
                  onSendPrompt={sendPrompt}
                  onPickSuggestion={onPickSuggestion}
                  onCiteClick={onCiteClick}
                  busy={busy}
                  onToggleMinimize={() => setChatMinimized(true)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
