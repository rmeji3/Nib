'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatPanel, PROMPT_LIBRARY } from './foliate-chat';
import type { AssistantMessage, ChatMessage, Citation, PromptAnswer, PromptLibraryEntry, UserMessage } from './foliate-types';
import { Icon, Viewer, ViewerToolbar } from './foliate-viewer';

const PANEL_POSITION = 'right';

let messageId = 1;

function nextId() {
  return `m${messageId++}`;
}

function seedMessages(): ChatMessage[] {
  const answer = PROMPT_LIBRARY[0].a;
  return [
    { id: nextId(), role: 'user', text: PROMPT_LIBRARY[0].q },
    {
      id: nextId(),
      role: 'assistant',
      reasoning: answer.reasoning,
      reasoningShown: answer.reasoning,
      segments: answer.segments,
      citations: answer.citations,
      confidence: answer.confidence,
      streaming: false,
      streamDone: true,
      streamedText: answer.segments.map((segment) => typeof segment === 'string' ? segment : 'strong' in segment ? segment.strong : '').join(''),
    },
  ];
}

function genericAnswer(): PromptAnswer {
  return {
    reasoning: [
      'Embedding query...',
      'Retrieving top-k chunks from 24 indexed blocks.',
      'Reranking by relevance + extraction confidence.',
      'Drafting grounded response.',
    ],
    segments: [
      'I could not find a strong direct match for that in the indexed document. The whitepaper covers the cooling architecture (§2, p.3), per-rack thermal envelopes (Table 1, p.4), throughput vs. flow rate (Figure 3, p.5), and the adaptive flow policy',
      { cite: 1 },
      '. Try one of the suggested questions below, or rephrase to point at a specific section.',
    ],
    citations: [
      { page: 0, blockId: 'p1-abstract', label: 'Abstract, p.1', snippet: 'Modern accelerator deployments routinely exceed 40 kW per rack...' },
    ],
    confidence: 0.45,
  };
}

export default function FoliateApp() {
  const [splitRatio, setSplitRatio] = useState(60);
  const [zoom, setZoom] = useState(0.9);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(6);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages());
  const [busy, setBusy] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToPage = useCallback((page: number) => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const pages = container.querySelectorAll<HTMLElement>('.pdf-page-wrap');
    const target = pages[page];
    if (target) {
      container.scrollTo({ top: target.offsetTop - 24, behavior: 'smooth' });
    }
  }, []);

  const onCiteClick = useCallback((citation: Citation) => {
    scrollToPage(citation.page);
    setCurrentPage(citation.page);
  }, [scrollToPage]);

  const sendPrompt = useCallback((text: string) => {
    const userMessage: UserMessage = { id: nextId(), role: 'user', text };
    const matchedPrompt = PROMPT_LIBRARY.find((prompt) => prompt.q.toLowerCase() === text.toLowerCase())
      ?? PROMPT_LIBRARY.find((prompt) =>
        text.toLowerCase().split(/\s+/).filter((word) => word.length > 3).some((word) => prompt.q.toLowerCase().includes(word)),
      );
    const answer = matchedPrompt?.a ?? genericAnswer();
    const assistantId = nextId();
    const assistantMessage: AssistantMessage = {
      id: assistantId,
      role: 'assistant',
      reasoning: answer.reasoning,
      reasoningShown: [],
      segments: answer.segments,
      citations: answer.citations,
      confidence: answer.confidence,
      streaming: true,
      streamDone: false,
      streamedText: '',
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setBusy(true);

    let stepIndex = 0;
    const stepInterval = window.setInterval(() => {
      stepIndex += 1;
      setMessages((current) => current.map((message) => {
        if (message.id !== assistantId || message.role !== 'assistant') {
          return message;
        }
        return { ...message, reasoningShown: answer.reasoning.slice(0, stepIndex) };
      }));

      if (stepIndex < answer.reasoning.length) {
        return;
      }

      window.clearInterval(stepInterval);
      const fullText = answer.segments.map((segment) => typeof segment === 'string' ? segment : 'strong' in segment ? segment.strong : '').join('');
      let streamedLength = 0;
      const chunk = Math.max(2, Math.floor(fullText.length / 35));

      const textInterval = window.setInterval(() => {
        streamedLength = Math.min(fullText.length, streamedLength + chunk);

        setMessages((current) => current.map((message) => {
          if (message.id !== assistantId || message.role !== 'assistant') {
            return message;
          }
          return { ...message, streamedText: fullText.slice(0, streamedLength) };
        }));

        if (streamedLength < fullText.length) {
          return;
        }

        window.clearInterval(textInterval);
        setMessages((current) => current.map((message) => {
          if (message.id !== assistantId || message.role !== 'assistant') {
            return message;
          }
          return { ...message, streaming: false, streamDone: true };
        }));
        setBusy(false);

      }, 35);
    }, 320);
  }, []);

  const onPickSuggestion = useCallback((prompt: PromptLibraryEntry | { reset: true }) => {
    if ('reset' in prompt) {
      setMessages([]);
      setBusy(false);
      return;
    }
    sendPrompt(prompt.q);
  }, [sendPrompt]);

  const dividerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const divider = dividerRef.current;
    if (!divider) {
      return;
    }

    let dragging = false;
    const onMouseDown = (event: MouseEvent) => {
      dragging = true;
      divider.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      event.preventDefault();
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!dragging) {
        return;
      }
      let splitRatio = (event.clientX / window.innerWidth) * 100;
      if (PANEL_POSITION === 'left') {
        splitRatio = 100 - splitRatio;
      }
      splitRatio = Math.max(28, Math.min(78, splitRatio));
      setSplitRatio(Math.round(splitRatio));
    };
    const onMouseUp = () => {
      if (!dragging) {
        return;
      }
      dragging = false;
      divider.classList.remove('dragging');
      document.body.style.cursor = '';
    };

    divider.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      divider.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'j') {
        event.preventDefault();
        scrollToPage(Math.min(totalPages - 1, currentPage + 1));
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'k') {
        event.preventDefault();
        scrollToPage(Math.max(0, currentPage - 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentPage, scrollToPage, totalPages]);

  const layoutStyle = useMemo(
    () => ({
      '--viewer-frac': `${splitRatio}fr`,
      '--chat-frac': `${100 - splitRatio}fr`,
    }) as React.CSSProperties,
    [splitRatio],
  );

  const viewerPane = (
    <Viewer
      currentPage={currentPage}
      totalPages={totalPages}
      onPageCountChange={setTotalPages}
      setCurrentPage={setCurrentPage}
      zoom={zoom}
      scrollContainerRef={scrollContainerRef}
    />
  );

  const chatPane = (
    <ChatPanel
      messages={messages}
      onSendPrompt={sendPrompt}
      onPickSuggestion={onPickSuggestion}
      onCiteClick={onCiteClick}
      busy={busy}
      onToggleMinimize={() => setChatMinimized(true)}
    />
  );

  return (
    <div className="grid h-full grid-rows-[48px_1fr]">
      <ViewerToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        onJumpPage={scrollToPage}
        zoom={zoom}
        setZoom={setZoom}
      />

      {chatMinimized ? (
        <div className="relative h-full min-h-0">
          {viewerPane}
          <button
            className="absolute right-4 top-4 inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-[var(--bg-surface)] px-3 text-sm text-[var(--text)] shadow-[var(--shadow-pop)]"
            onClick={() => setChatMinimized(false)}
            title="Show chat"
            type="button"
          >
            <Icon name="sparkles" />
            Chat
          </button>
        </div>
      ) : (
        <div className="grid h-full min-h-0" style={{ ...layoutStyle, gridTemplateColumns: `${splitRatio}fr 5px ${100 - splitRatio}fr` }}>
          {PANEL_POSITION === 'right' ? (
            <>
              {viewerPane}
              <div className="divider cursor-col-resize border-x border-white/10 hover:bg-[var(--accent-soft)]" ref={dividerRef} />
              {chatPane}
            </>
          ) : (
            <>
              {chatPane}
              <div className="divider cursor-col-resize border-x border-white/10 hover:bg-[var(--accent-soft)]" ref={dividerRef} />
              {viewerPane}
            </>
          )}
        </div>
      )}
    </div>
  );
}