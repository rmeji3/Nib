'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatPanel, PROMPT_LIBRARY } from './foliate-chat';
import { DOC_PAGES } from './foliate-doc-content';
import type { AssistantMessage, ChatMessage, Citation, PromptAnswer, PromptLibraryEntry, UserMessage } from './foliate-types';
import { Viewer, ViewerToolbar } from './foliate-viewer';

const PANEL_POSITION = 'right';
const CITATION_STYLE = 'cards';

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
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [highlightVersion, setHighlightVersion] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages());
  const [busy, setBusy] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const blockRegistry = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  const registerBlock = useCallback((id: string, ref: React.RefObject<HTMLDivElement | null>) => {
    blockRegistry.current[id] = ref;
  }, []);

  const scrollToPage = useCallback((page: number) => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const pages = container.querySelectorAll<HTMLElement>('.page');
    const target = pages[page];
    if (target) {
      container.scrollTo({ top: target.offsetTop - 24, behavior: 'smooth' });
    }
  }, []);

  const flashBlock = useCallback((blockId: string) => {
    setHighlightedBlockId(blockId);
    setHighlightVersion((value) => value + 1);

    const targetRef = blockRegistry.current[blockId]?.current;
    if (targetRef) {
      targetRef.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    window.setTimeout(() => {
      setHighlightedBlockId((current) => (current === blockId ? null : current));
    }, 4200);
  }, []);

  const onCiteClick = useCallback((citation: Citation) => {
    scrollToPage(citation.page);
    window.setTimeout(() => flashBlock(citation.blockId), 350);
  }, [flashBlock, scrollToPage]);

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

        const firstCitation = answer.citations[0];
        if (firstCitation) {
          window.setTimeout(() => flashBlock(firstCitation.blockId), 200);
        }
      }, 35);
    }, 320);
  }, [flashBlock]);

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
        scrollToPage(Math.min(DOC_PAGES.length - 1, currentPage + 1));
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'k') {
        event.preventDefault();
        scrollToPage(Math.max(0, currentPage - 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentPage, scrollToPage]);

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
      setCurrentPage={setCurrentPage}
      highlightedBlockId={highlightedBlockId}
      highlightVersion={highlightVersion}
      registerBlock={registerBlock}
      zoom={zoom}
      scrollContainerRef={scrollContainerRef}
    />
  );

  const chatPane = (
    <ChatPanel
      messages={messages}
      citationStyle={CITATION_STYLE}
      onSendPrompt={sendPrompt}
      onPickSuggestion={onPickSuggestion}
      onCiteClick={onCiteClick}
      busy={busy}
    />
  );

  return (
    <div className="app">
      <ViewerToolbar
        currentPage={currentPage}
        totalPages={DOC_PAGES.length}
        onJumpPage={scrollToPage}
        zoom={zoom}
        setZoom={setZoom}
        panelPosition={PANEL_POSITION}
        citationStyle={CITATION_STYLE}
      />

      <div className={`main ${PANEL_POSITION}`} style={layoutStyle}>
        {PANEL_POSITION === 'right' ? (
          <>
            {viewerPane}
            <div className="divider" ref={dividerRef} />
            {chatPane}
          </>
        ) : (
          <>
            {chatPane}
            <div className="divider" ref={dividerRef} />
            {viewerPane}
          </>
        )}
      </div>
    </div>
  );
}