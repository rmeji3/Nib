import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchSessionMessages,
  getOrCreateSession,
  sendChatQuery,
} from '../../../../lib/api/chat';
import type { ApiCitation } from '../../../../lib/api/chat';
import type {
  AssistantMessage,
  ChatMessage,
  Citation,
  MessageSegment,
  PromptLibraryEntry,
  UserMessage,
} from '../nib-types';

function nextId() {
  return crypto.randomUUID();
}

/** Convert API citations (1-based page numbers) to frontend Citations (0-based for PDF viewer). */
function mapCitations(apiCitations: ApiCitation[]): Citation[] {
  return apiCitations.map((c) => ({
    page: c.pageNumber - 1,
    blockId: `page-${c.pageNumber}`,
    label: `Page ${c.pageNumber}`,
    snippet: c.excerpt,
  }));
}

/**
 * Parse the plain answer string into MessageSegments.
 * Replaces [Page X] markers in the text with { cite: N } references pointing
 * into the citations array, so the UI can render clickable citation chips.
 */
function parseSegments(answer: string, citations: Citation[]): MessageSegment[] {
  // Map 1-based page number → 1-based index in citations array
  const pageToIdx = new Map<number, number>();
  citations.forEach((c, i) => {
    const pageNum = c.page + 1;
    if (!pageToIdx.has(pageNum)) pageToIdx.set(pageNum, i + 1);
  });

  const segments: MessageSegment[] = [];
  const regex = /\[Page (\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(answer)) !== null) {
    if (match.index > lastIndex) segments.push(answer.slice(lastIndex, match.index));
    const pageNum = parseInt(match[1], 10);
    const idx = pageToIdx.get(pageNum);
    segments.push(idx !== undefined ? { cite: idx } : match[0]);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < answer.length) segments.push(answer.slice(lastIndex));
  return segments.length > 0 ? segments : [answer];
}

/** Convert stored API messages into the local ChatMessage format. */
function mapApiMessages(
  apiMessages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations: ApiCitation[] | null;
    createdAt: string;
  }>,
): ChatMessage[] {
  return apiMessages.map((msg) => {
    if (msg.role === 'user') {
      return { id: msg.id, role: 'user', text: msg.content } satisfies UserMessage;
    }
    const citations = mapCitations(msg.citations ?? []);
    const segments = parseSegments(msg.content, citations);
    return {
      id: msg.id,
      role: 'assistant',
      reasoning: [],
      reasoningShown: [],
      segments,
      citations,
      confidence: citations.length > 0 ? 0.85 : 0.5,
      streaming: false,
      streamDone: true,
      streamedText: msg.content,
    } satisfies AssistantMessage;
  });
}

const REASONING_STEPS = [
  'Embedding query with Mistral…',
  'Retrieving relevant passages from pgvector…',
  'Generating grounded response with Gemini…',
] as const;

export function useNibChat(documentId: string | null) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  // Guard against React Strict Mode double-invocation of effects
  const initRef = useRef(false);

  // On mount (or when documentId becomes available), get/create the session
  // and load any existing message history.
  useEffect(() => {
    if (!documentId || initRef.current) return;
    initRef.current = true;

    getOrCreateSession(documentId)
      .then(async (session) => {
        setSessionId(session.id);
        const apiMessages = await fetchSessionMessages(session.id);
        if (apiMessages.length > 0) setMessages(mapApiMessages(apiMessages));
      })
      .catch((err: unknown) => {
        console.error('Failed to initialise chat session:', err);
      });
  }, [documentId]);

  const sendPrompt = useCallback(
    async (text: string) => {
      if (!sessionId || busy) return;

      const userMsg: UserMessage = { id: nextId(), role: 'user', text };
      const pendingId = nextId();

      const pendingMsg: AssistantMessage = {
        id: pendingId,
        role: 'assistant',
        reasoning: [...REASONING_STEPS],
        reasoningShown: [REASONING_STEPS[0]],
        segments: [],
        citations: [],
        confidence: 0.8,
        streaming: true,
        streamDone: false,
        streamedText: '',
      };

      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      setBusy(true);
      setChatError(null);

      // Animate reasoning steps while the network request is in flight
      let stepIndex = 0;
      const stepTimer = window.setInterval(() => {
        stepIndex = Math.min(stepIndex + 1, REASONING_STEPS.length - 1);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId && m.role === 'assistant'
              ? { ...m, reasoningShown: [...REASONING_STEPS].slice(0, stepIndex + 1) }
              : m,
          ),
        );
      }, 800);

      try {
        const response = await sendChatQuery(sessionId, text);
        window.clearInterval(stepTimer);

        const citations = mapCitations(response.citations);
        const segments = parseSegments(response.answer, citations);
        const finalReasoning = [
          'Embedded query with Mistral.',
          `Retrieved ${response.citations.length} source passage${response.citations.length !== 1 ? 's' : ''}.`,
          'Generated grounded response with Gemini.',
        ];

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== pendingId || m.role !== 'assistant') return m;
            return {
              ...m,
              reasoning: finalReasoning,
              reasoningShown: finalReasoning,
              segments,
              citations,
              confidence: citations.length > 0 ? 0.85 : 0.5,
              streaming: false,
              streamDone: true,
              streamedText: response.answer,
            } satisfies AssistantMessage;
          }),
        );
      } catch (err) {
        window.clearInterval(stepTimer);
        const message =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setChatError(message);

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== pendingId || m.role !== 'assistant') return m;
            return {
              ...m,
              reasoning: ['Failed to get a response.'],
              reasoningShown: ['Failed to get a response.'],
              segments: [message],
              citations: [],
              confidence: 0,
              streaming: false,
              streamDone: true,
            } satisfies AssistantMessage;
          }),
        );
      } finally {
        setBusy(false);
      }
    },
    [sessionId, busy],
  );

  const onPickSuggestion = useCallback(
    (prompt: PromptLibraryEntry | { reset: true }) => {
      if ('reset' in prompt) {
        setMessages([]);
        setChatError(null);
        return;
      }
      sendPrompt(prompt.q);
    },
    [sendPrompt],
  );

  return { messages, busy, chatError, sendPrompt, onPickSuggestion };
}
