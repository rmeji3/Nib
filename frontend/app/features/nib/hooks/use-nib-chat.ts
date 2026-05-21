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

// Case-insensitive — catches [Page 1], [page 1], [PAGE 1]
const PAGE_REF_RE = /\[Page (\d+)\]/gi;

/**
 * Single source of truth for converting an answer string + backend API citations
 * into the { segments, citations } pair the UI needs.
 *
 * Why not rely on response.citations alone?
 * The backend extracts citations only for pages that appeared in the top-k
 * vector-search results. If Gemini cites a page that wasn't retrieved, the
 * backend drops it — leaving [Page N] as an un-mappable marker in the text.
 *
 * This function solves it by scanning the answer text directly:
 *  1. Finds every [Page N] marker in the text (case-insensitive).
 *  2. Builds the citations array from those page numbers (order of first appearance).
 *  3. Fills in excerpt snippets from apiCitations when the backend has them.
 *  4. Replaces every [Page N] with a { cite: idx } segment → clickable chip.
 */
function buildMessageContent(
  answer: string,
  apiCitations: ApiCitation[],
): { segments: MessageSegment[]; citations: Citation[] } {
  // Build excerpt lookup: 1-based page number → excerpt text from backend
  const excerptByPage = new Map<number, string>();
  apiCitations.forEach((c) => {
    if (!excerptByPage.has(c.pageNumber)) excerptByPage.set(c.pageNumber, c.excerpt);
  });

  // First pass: collect unique page numbers in order of first appearance
  const pageOrder: number[] = [];
  const seen = new Set<number>();
  for (const m of answer.matchAll(PAGE_REF_RE)) {
    const n = parseInt(m[1], 10);
    if (!seen.has(n)) { seen.add(n); pageOrder.push(n); }
  }

  // Build citations array — one entry per unique cited page
  const citations: Citation[] = pageOrder.map((pageNum) => ({
    page: pageNum - 1,                           // 0-indexed for the PDF viewer
    blockId: `page-${pageNum}`,
    label: `Page ${pageNum}`,
    snippet: excerptByPage.get(pageNum) ?? '',
  }));

  // Map page number → 1-based citation index (used by MessageSegments)
  const pageToIdx = new Map<number, number>();
  pageOrder.forEach((n, i) => pageToIdx.set(n, i + 1));

  // Second pass: build segments, replacing [Page N] with { cite: idx }
  const segments: MessageSegment[] = [];
  const re = new RegExp(PAGE_REF_RE.source, PAGE_REF_RE.flags); // fresh instance
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(answer)) !== null) {
    if (m.index > lastIndex) segments.push(answer.slice(lastIndex, m.index));
    const pageNum = parseInt(m[1], 10);
    const idx = pageToIdx.get(pageNum);
    segments.push(idx !== undefined ? { cite: idx } : m[0]);
    lastIndex = re.lastIndex;
  }

  if (lastIndex < answer.length) segments.push(answer.slice(lastIndex));
  return { segments: segments.length > 0 ? segments : [answer], citations };
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
    const { segments, citations } = buildMessageContent(msg.content, msg.citations ?? []);
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

        const { segments, citations } = buildMessageContent(response.answer, response.citations);
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
