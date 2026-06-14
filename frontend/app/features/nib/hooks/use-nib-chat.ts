import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createChatSession,
  deleteChatMessage,
  deleteChatSession,
  fetchConversationStarters,
  fetchSessionMessages,
  getOrCreateSession,
  listChatSessions,
  reportChatMessage,
  sendChatQuery,
} from '../../../../lib/api/chat';
import { useIngestionStatus } from './use-ingestion-status';
import type { ApiChatMessage, ApiCitation, ChatSession } from '../../../../lib/api/chat';
import type {
  AssistantMessage,
  ChatMessage,
  ConversationStarter,
  Citation,
  MessageSegment,
  UserMessage,
} from '../nib-types';

function nextId() {
  return crypto.randomUUID();
}

const CITATION_REF_RE = /\[(B(\d+)|Page (\d+))\]/gi;

/**
 * Gemini sometimes combines citations like [Page 1, Page 2] instead of writing
 * [Page 1][Page 2]. This expands them into individual tags so PAGE_REF_RE can
 * match each one normally.
 */
function expandCombinedCitations(answer: string): string {
  return answer
    .replace(/\[Page \d+(?:,\s*Page \d+)+\]/gi, (match) => {
      const nums = match.match(/\d+/g) ?? [];
      return nums.map((n) => `[Page ${n}]`).join('');
    })
    .replace(/\[B\d+(?:,\s*B\d+)+\]/gi, (match) => {
      const sourceIds = match.match(/B\d+/gi) ?? [];
      return sourceIds.map((sourceId) => `[${sourceId.toUpperCase()}]`).join('');
    });
}

function normalizeAnswerFormatting(answer: string): string {
  return answer
    .replace(/\r\n/g, '\n')
    .replace(/(^|\n)\s*\*\s+/g, '$1- ')
    .replace(/([^\n])\s+\*\s+/g, '$1\n- ')
    .replace(/([.!?])\s+[-•]\s+/g, '$1\n- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeSnippet(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function snippetsRepresentSameEvidence(left: string, right: string): boolean {
  const normalizedLeft = normalizeSnippet(left);
  const normalizedRight = normalizeSnippet(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  const minLength = Math.min(normalizedLeft.length, normalizedRight.length);
  if (minLength < 32) return false;
  return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
}

/**
 * Single source of truth for converting an answer string + backend API citations
 * into the { segments, citations } pair the UI needs. The backend now prefers
 * exact block citations like [B1], while older answers may still contain [Page 1].
 */
function buildMessageContent(
  answer: string,
  apiCitations: ApiCitation[],
): { segments: MessageSegment[]; citations: Citation[] } {
  // Normalize combined citations before any processing
  const normalizedAnswer = normalizeAnswerFormatting(expandCombinedCitations(answer));

  const bySource = new Map<string, ApiCitation>();
  const byPage = new Map<number, ApiCitation>();
  apiCitations.forEach((c) => {
    if (c.sourceId) bySource.set(c.sourceId.toUpperCase(), c);
    if (!byPage.has(c.pageNumber)) byPage.set(c.pageNumber, c);
  });

  const citations: Citation[] = [];
  const citationIndex = new Map<string, number>();

  const addCitation = (key: string, label: string, pageNum: number, api?: ApiCitation) => {
    const existing = citationIndex.get(key);
    if (existing !== undefined) return existing;

    const snippet = api?.textExcerpt ?? '';
    const duplicateIndex = citations.findIndex((citation) => {
      if (api?.blockId && citation.blockId === api.blockId) return true;
      if (citation.page !== pageNum - 1) return false;
      return snippetsRepresentSameEvidence(
        snippet,
        citation.textExcerpt ?? citation.snippet ?? '',
      );
    });
    if (duplicateIndex >= 0) {
      const displayIndex = duplicateIndex + 1;
      citationIndex.set(key, displayIndex);
      return displayIndex;
    }

    citations.push({
      number: citations.length + 1,
      page: pageNum - 1,                           // 0-indexed for the PDF viewer
      blockId: api?.blockId ?? `page-${pageNum}`,
      label,
      snippet,
      textExcerpt: api?.textExcerpt ?? null,

      bbox: api?.bbox ?? null,
      pageWidth: api?.pageWidth ?? null,
      pageHeight: api?.pageHeight ?? null,
      blockType: api?.blockType ?? null,
    });
    const displayIndex = citations.length;
    citationIndex.set(key, displayIndex);
    return displayIndex;
  };

  for (const match of normalizedAnswer.matchAll(CITATION_REF_RE)) {
    if (match[2]) {
      const sourceId = `B${match[2]}`;
      const api = bySource.get(sourceId);
      if (!api) continue;
      addCitation(sourceId, `${sourceId} · Page ${api.pageNumber}`, api.pageNumber, api);
      continue;
    }

    const pageNum = parseInt(match[3], 10);
    const api = byPage.get(pageNum);
    addCitation(`Page ${pageNum}`, `Page ${pageNum}`, pageNum, api);
  }

  // Second pass: build segments on the normalised answer, replacing citations with chips.
  const segments: MessageSegment[] = [];
  const re = new RegExp(CITATION_REF_RE.source, CITATION_REF_RE.flags); // fresh instance
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(normalizedAnswer)) !== null) {
    if (m.index > lastIndex) segments.push(normalizedAnswer.slice(lastIndex, m.index));
    const idx = m[2]
      ? citationIndex.get(`B${m[2]}`)
      : citationIndex.get(`Page ${parseInt(m[3], 10)}`);
    if (idx !== undefined) {
      const last = segments[segments.length - 1];
      const repeatsPreviousChip =
        typeof last === 'object' &&
        last !== null &&
        'cite' in last &&
        last.cite === idx;
      if (!repeatsPreviousChip) {
        segments.push({ cite: idx });
      }
    } else {
      segments.push(m[0]);
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < normalizedAnswer.length) segments.push(normalizedAnswer.slice(lastIndex));
  return { segments: segments.length > 0 ? segments : [normalizedAnswer], citations };
}

/** Convert stored API messages into the local ChatMessage format. */
function mapApiMessages(
  apiMessages: ApiChatMessage[],
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
      confidence: msg.confidence,
      reported: msg.reported,
      streaming: false,
      streamDone: true,
      streamedText: msg.content,
      animate: false,
    } satisfies AssistantMessage;
  });
}

const DEFAULT_STARTERS: ConversationStarter[] = [
  { q: 'Give me the executive summary.', icon: 'sparkles' },
  { q: 'What are the most important details in this document?', icon: 'search' },
  { q: 'What should I pay attention to in tables or visuals?', icon: 'sparkles' },
  { q: 'Walk me through the document page by page.', icon: 'search' },
];

function normalizeStarters(
  starterRows: Array<{ prompt: string; icon: string }>,
): ConversationStarter[] {
  const normalized = starterRows
    .map((starter) => ({
      q: starter.prompt.trim(),
      icon: starter.icon.trim() || 'sparkles',
    }))
    .filter((starter) => starter.q.length > 0);

  return normalized.length > 0 ? normalized : DEFAULT_STARTERS;
}

function apiMessagesSignature(
  apiMessages: Pick<ApiChatMessage, 'id' | 'role' | 'content' | 'createdAt'>[],
): string {
  return apiMessages
    .map((message) => `${message.id}:${message.role}:${message.createdAt}:${message.content.length}`)
    .join('|');
}

function localMessagesSignature(messages: ChatMessage[]): string {
  return messages
    .map((message) => {
      if (message.role === 'user') {
        return `${message.id}:user:${message.text.length}`;
      }
      return `${message.id}:assistant:${(message.streamedText ?? '').length}:${message.streaming ? 'streaming' : 'done'}`;
    })
    .join('|');
}

async function createSessionForDocument(documentId: string): Promise<ChatSession> {
  return createChatSession(documentId).catch(() => getOrCreateSession(documentId));
}

interface QueuedPrompt {
  text: string;
  userMessageId: string;
  assistantMessageId: string;
}

function createPendingAssistantMessage(id: string, queued: boolean): AssistantMessage {
  return {
    id,
    role: 'assistant',
    reasoning: [],
    reasoningShown: [],
    segments: [],
    citations: [],
    confidence: null,
    streaming: true,
    streamDone: false,
    queued,
    streamedText: '',
  };
}

function activeSessionStorageKey(documentId: string) {
  return `nib:active-chat-session:${documentId}`;
}

function writeStoredSessionId(documentId: string, nextSessionId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(activeSessionStorageKey(documentId), nextSessionId);
}

function clearStoredSessionId(documentId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(activeSessionStorageKey(documentId));
}

export function useNibChat(documentId: string | null) {
  const queryClient = useQueryClient();
  const { isComplete: isIndexingComplete } = useIngestionStatus(documentId);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localChatError, setLocalChatError] = useState<string | null>(null);
  const [queueVersion, setQueueVersion] = useState(0);
  const pendingAssistantIdRef = useRef<string | null>(null);
  const queuedPromptsRef = useRef<QueuedPrompt[]>([]);
  const processingQueuedPromptRef = useRef(false);
  const previousDocumentIdRef = useRef<string | null>(null);
  const hydratedMessagesKeyRef = useRef<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ['chat-sessions', documentId],
    queryFn: () => listChatSessions(documentId!),
    enabled: Boolean(documentId),
    staleTime: 10_000,
  });

  const startersQuery = useQuery({
    queryKey: ['chat-starters', documentId],
    queryFn: () => fetchConversationStarters(documentId!),
    enabled: Boolean(documentId) && isIndexingComplete,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (previousDocumentIdRef.current === documentId) return;
    previousDocumentIdRef.current = documentId;
    queueMicrotask(() => {
      pendingAssistantIdRef.current = null;
      queuedPromptsRef.current = [];
      processingQueuedPromptRef.current = false;
      hydratedMessagesKeyRef.current = null;
      setSessionId(null);
      setMessages([]);
      setLocalChatError(null);
      setQueueVersion((version) => version + 1);
    });
  }, [documentId]);

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const starters = useMemo(() => {
    if (!isIndexingComplete) return [];
    if (startersQuery.isLoading || startersQuery.isFetching) return [];
    return normalizeStarters(startersQuery.data ?? []);
  }, [
    isIndexingComplete,
    startersQuery.data,
    startersQuery.isLoading,
    startersQuery.isFetching,
  ]);

  useEffect(() => {
    if (documentId && sessionId) {
      writeStoredSessionId(documentId, sessionId);
    }
  }, [documentId, sessionId]);

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: () => fetchSessionMessages(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 10_000,
  });
  const queryError =
    sessionsQuery.error instanceof Error
      ? sessionsQuery.error.message
      : messagesQuery.error instanceof Error
        ? messagesQuery.error.message
        : null;
  const chatError = localChatError ?? queryError;

  useEffect(() => {
    if (!messagesQuery.data || pendingAssistantIdRef.current || queuedPromptsRef.current.length > 0) return;
    const nextSignature = apiMessagesSignature(messagesQuery.data);
    const nextHydrationKey = `${sessionId ?? 'none'}:${nextSignature}`;
    if (hydratedMessagesKeyRef.current === nextHydrationKey) return;
    hydratedMessagesKeyRef.current = nextHydrationKey;

    queueMicrotask(() => {
      setMessages((prev) => {
        const mapped = mapApiMessages(messagesQuery.data);
        return localMessagesSignature(prev) === localMessagesSignature(mapped) ? prev : mapped;
      });
    });
  }, [messagesQuery.data, sessionId]);

  const createSessionMutation = useMutation({
    mutationFn: (nextDocumentId: string) => createSessionForDocument(nextDocumentId),
    onSuccess: (session) => {
      queryClient.setQueryData<ChatSession[]>(['chat-sessions', session.documentId], (prev) => {
        const previous = prev ?? [];
        if (previous.some((item) => item.id === session.id)) return previous;
        return [session, ...previous];
      });
      setSessionId(session.id);
      setMessages((prev) =>
        pendingAssistantIdRef.current || queuedPromptsRef.current.length > 0 ? prev : [],
      );
      setLocalChatError(null);
      writeStoredSessionId(session.documentId, session.id);
    },
  });

  const sendQueryMutation = useMutation({
    mutationFn: ({ activeSessionId, text }: { activeSessionId: string; text: string }) =>
      sendChatQuery(activeSessionId, text),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (targetSessionId: string) => deleteChatSession(targetSessionId),
    onSuccess: (_data, deletedSessionId) => {
      if (documentId) {
        queryClient.setQueryData<ChatSession[]>(['chat-sessions', documentId], (prev) =>
          prev?.filter((session) => session.id !== deletedSessionId) ?? prev,
        );
      }
      queryClient.removeQueries({ queryKey: ['chat-messages', deletedSessionId] });
      if (sessionId === deletedSessionId) {
        pendingAssistantIdRef.current = null;
        queuedPromptsRef.current = [];
        processingQueuedPromptRef.current = false;
        hydratedMessagesKeyRef.current = null;
        setSessionId(null);
        setMessages([]);
        setQueueVersion((version) => version + 1);
        if (documentId) clearStoredSessionId(documentId);
      }
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Could not delete this chat. Please try again.';
      setLocalChatError(message);
    },
    onSettled: async () => {
      if (documentId) {
        await queryClient.invalidateQueries({ queryKey: ['chat-sessions', documentId] });
      }
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => deleteChatMessage(messageId),
    onSuccess: (_data, messageId) => {
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
      if (sessionId) {
        queryClient.removeQueries({ queryKey: ['chat-messages', sessionId] });
        void queryClient.invalidateQueries({ queryKey: ['chat-sessions', documentId] });
      }
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Could not delete this message. Please try again.';
      setLocalChatError(message);
    },
  });

  const reportMessageMutation = useMutation({
    mutationFn: (messageId: string) => reportChatMessage(messageId),
    onSuccess: (_data, messageId) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== messageId || message.role !== 'assistant') return message;
          return { ...message, reported: true };
        }),
      );
      if (sessionId) {
        void queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      }
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Could not report this answer. Please try again.';
      setLocalChatError(message);
    },
  });

  const activeSession = sessions.find((session) => session.id === sessionId) ?? null;
  const busy = createSessionMutation.isPending || sendQueryMutation.isPending || deleteSessionMutation.isPending;
  const isWaitingForResponse = sendQueryMutation.isPending || processingQueuedPromptRef.current;
  const canSubmitPrompt = Boolean(documentId && !deleteSessionMutation.isPending);
  const isLoadingMessages = Boolean(
    sessionId &&
    messages.length === 0 &&
    (activeSession?.messageCount ?? 0) > 0 &&
    messagesQuery.isLoading,
  );
  const deletingSessionId = deleteSessionMutation.isPending
    ? deleteSessionMutation.variables ?? null
    : null;
  const currentChatIsEmpty = messages.length === 0 && (activeSession?.messageCount ?? 0) === 0;
  // Always allow pressing "New chat" (unless busy). If an empty chat already
  // exists we just navigate to it rather than stacking another empty session.
  const canCreateNewChat = Boolean(documentId && !busy);

  const selectSession = useCallback(
    (nextSessionId: string) => {
      if (nextSessionId === sessionId || busy) return;
      setSessionId(nextSessionId);
      setLocalChatError(null);
      pendingAssistantIdRef.current = null;
      queuedPromptsRef.current = [];
      processingQueuedPromptRef.current = false;
      const cachedMessages = queryClient.getQueryData<ApiChatMessage[]>(['chat-messages', nextSessionId]);
      hydratedMessagesKeyRef.current = cachedMessages
        ? `${nextSessionId}:${apiMessagesSignature(cachedMessages)}`
        : null;
      setMessages((prev) => {
        const mapped = cachedMessages ? mapApiMessages(cachedMessages) : [];
        return localMessagesSignature(prev) === localMessagesSignature(mapped) ? prev : mapped;
      });
    },
    [busy, queryClient, sessionId],
  );

  const createNewChat = useCallback(async () => {
    if (!documentId || busy) return;
    // Already in an empty chat — nothing to create, just stay here.
    if (sessionId !== null && currentChatIsEmpty) return;
    // Reuse an existing empty session instead of stacking duplicate blank chats.
    const emptySession = sessions.find((session) => session.messageCount === 0);
    if (emptySession && emptySession.id !== sessionId) {
      selectSession(emptySession.id);
      return;
    }
    pendingAssistantIdRef.current = null;
    queuedPromptsRef.current = [];
    processingQueuedPromptRef.current = false;
    hydratedMessagesKeyRef.current = null;
    setSessionId(null);
    setMessages([]);
    setLocalChatError(null);
    setQueueVersion((version) => version + 1);
    await createSessionMutation.mutateAsync(documentId);
  }, [busy, createSessionMutation, currentChatIsEmpty, documentId, selectSession, sessionId, sessions]);

  const deleteChat = useCallback(
    async (targetSessionId: string) => {
      if (!documentId || deleteSessionMutation.isPending) return;
      setLocalChatError(null);
      await deleteSessionMutation.mutateAsync(targetSessionId);
    },
    [deleteSessionMutation, documentId],
  );

  const ensureActiveSession = useCallback(async () => {
    if (sessionId) return sessionId;
    if (!documentId) return null;

    const session = await createSessionMutation.mutateAsync(documentId);
    return session.id;
  }, [createSessionMutation, documentId, sessionId]);

  const bumpSessionAfterMessage = useCallback((activeSessionId: string, firstQuestion: string) => {
    if (!documentId) return;
    queryClient.setQueryData<ChatSession[]>(['chat-sessions', documentId], (prev) => {
      if (!prev) return prev;
      const updated = prev.map((session) => {
        if (session.id !== activeSessionId) return session;
        const hasExistingMessages = session.messageCount > 0;
        return {
          ...session,
          title: hasExistingMessages || (session.title && session.title !== 'New chat')
            ? session.title
            : firstQuestion.length > 64
              ? `${firstQuestion.slice(0, 61)}...`
              : firstQuestion,
          updatedAt: new Date().toISOString(),
          messageCount: session.messageCount + 2,
        };
      });
      return updated.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    });
  }, [documentId, queryClient]);

  const processPrompt = useCallback(
    async (prompt: QueuedPrompt) => {
      if (!documentId) return;

      processingQueuedPromptRef.current = true;
      pendingAssistantIdRef.current = prompt.assistantMessageId;
      setLocalChatError(null);
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== prompt.assistantMessageId || message.role !== 'assistant') return message;
          return {
            ...message,
            queued: false,
            streaming: true,
            streamDone: false,
            reasoning: [],
            reasoningShown: [],
            segments: [],
            citations: [],
            confidence: null,
            streamedText: '',
            animate: false,
          } satisfies AssistantMessage;
        }),
      );

      let activeSessionId: string | null;
      try {
        activeSessionId = await ensureActiveSession();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not start a chat. Please try again.';
        setLocalChatError(message);
        setMessages((prev) =>
          prev.map((item) => {
            if (item.id !== prompt.assistantMessageId || item.role !== 'assistant') return item;
            return {
              ...item,
              queued: false,
              reasoning: ['Failed to start this chat.'],
              reasoningShown: ['Failed to start this chat.'],
              segments: [message],
              citations: [],
              confidence: 0,
              streaming: false,
              streamDone: true,
              streamedText: message,
              animate: true,
            } satisfies AssistantMessage;
          }),
        );
        pendingAssistantIdRef.current = null;
        processingQueuedPromptRef.current = false;
        setQueueVersion((version) => version + 1);
        return;
      }
      if (!activeSessionId) {
        pendingAssistantIdRef.current = null;
        processingQueuedPromptRef.current = false;
        setQueueVersion((version) => version + 1);
        return;
      }

      try {
        const response = await sendQueryMutation.mutateAsync({
          activeSessionId,
          text: prompt.text,
        });

        const { segments, citations } = buildMessageContent(response.answer, response.citations);
        const finalReasoning = [
          'Embedded query with Mistral.',
          `Retrieved ${response.citations.length} cited source${response.citations.length !== 1 ? 's' : ''}.`,
          'Generated grounded response with Gemini.',
        ];

        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== prompt.assistantMessageId || message.role !== 'assistant') return message;
            return {
              ...message,
              queued: false,
              reasoning: finalReasoning,
              reasoningShown: finalReasoning,
              segments,
              citations,
              confidence: response.confidence,
              streaming: false,
              streamDone: true,
              streamedText: response.answer,
              animate: true,
            } satisfies AssistantMessage;
          }),
        );
        bumpSessionAfterMessage(activeSessionId, prompt.text);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['chat-sessions', documentId] }),
          queryClient.invalidateQueries({ queryKey: ['chat-messages', activeSessionId] }),
        ]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setLocalChatError(message);

        setMessages((prev) =>
          prev.map((item) => {
            if (item.id !== prompt.assistantMessageId || item.role !== 'assistant') return item;
            return {
              ...item,
              queued: false,
              reasoning: ['Failed to get a response.'],
              reasoningShown: ['Failed to get a response.'],
              segments: [message],
              citations: [],
              confidence: 0,
              streaming: false,
              streamDone: true,
              streamedText: message,
              animate: true,
            } satisfies AssistantMessage;
          }),
        );
      } finally {
        pendingAssistantIdRef.current = null;
        processingQueuedPromptRef.current = false;
        setQueueVersion((version) => version + 1);
      }
    },
    [
      bumpSessionAfterMessage,
      documentId,
      ensureActiveSession,
      queryClient,
      sendQueryMutation,
    ],
  );

  const sendPrompt = useCallback(
    async (text: string) => {
      if (!documentId || deleteSessionMutation.isPending) return;

      const prompt: QueuedPrompt = {
        text,
        userMessageId: nextId(),
        assistantMessageId: nextId(),
      };
      const userMsg: UserMessage = { id: prompt.userMessageId, role: 'user', text };
      const shouldQueue =
        sendQueryMutation.isPending ||
        createSessionMutation.isPending ||
        isLoadingMessages ||
        processingQueuedPromptRef.current;

      setMessages((prev) => [
        ...prev,
        userMsg,
        createPendingAssistantMessage(prompt.assistantMessageId, shouldQueue),
      ]);

      if (shouldQueue) {
        queuedPromptsRef.current.push(prompt);
        setQueueVersion((version) => version + 1);
        return;
      }

      void processPrompt(prompt);
    },
    [
      createSessionMutation.isPending,
      deleteSessionMutation.isPending,
      documentId,
      isLoadingMessages,
      processPrompt,
      sendQueryMutation.isPending,
    ],
  );

  useEffect(() => {
    if (
      !canSubmitPrompt ||
      sendQueryMutation.isPending ||
      createSessionMutation.isPending ||
      isLoadingMessages ||
      processingQueuedPromptRef.current
    ) {
      return;
    }

    const nextPrompt = queuedPromptsRef.current.shift();
    if (!nextPrompt) return;
    void processPrompt(nextPrompt);
  }, [
    canSubmitPrompt,
    createSessionMutation.isPending,
    isLoadingMessages,
    processPrompt,
    queueVersion,
    sendQueryMutation.isPending,
  ]);

  const regenerateResponse = useCallback(
    async (assistantMessageId: string) => {
      if (busy || !sessionId || !documentId) return;
      const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId);
      if (assistantIndex <= 0 || messages[assistantIndex]?.role !== 'assistant') return;

      const previousUserMessage = [...messages.slice(0, assistantIndex)]
        .reverse()
        .find((message): message is UserMessage => message.role === 'user');
      if (!previousUserMessage) return;

      pendingAssistantIdRef.current = assistantMessageId;
      setLocalChatError(null);
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== assistantMessageId || message.role !== 'assistant') return message;
          return {
            ...message,
            reasoning: [],
            reasoningShown: [],
            segments: [],
            citations: [],
            confidence: null,
            streaming: true,
            streamDone: false,
            streamedText: '',
            animate: false,
          } satisfies AssistantMessage;
        }),
      );

      try {
        const response = await sendQueryMutation.mutateAsync({
          activeSessionId: sessionId,
          text: previousUserMessage.text,
        });
        const { segments, citations } = buildMessageContent(response.answer, response.citations);
        const finalReasoning = [
          'Reused the previous prompt.',
          `Retrieved ${response.citations.length} cited source${response.citations.length !== 1 ? 's' : ''}.`,
          'Generated a refreshed grounded response.',
        ];

        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== assistantMessageId || message.role !== 'assistant') return message;
            return {
              ...message,
              reasoning: finalReasoning,
              reasoningShown: finalReasoning,
              segments,
              citations,
              confidence: response.confidence,
              streaming: false,
              streamDone: true,
              streamedText: response.answer,
              animate: true,
            } satisfies AssistantMessage;
          }),
        );
        await queryClient.invalidateQueries({ queryKey: ['chat-sessions', documentId] });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setLocalChatError(message);
        setMessages((prev) =>
          prev.map((item) => {
            if (item.id !== assistantMessageId || item.role !== 'assistant') return item;
            return {
              ...item,
              reasoning: ['Failed to regenerate this response.'],
              reasoningShown: ['Failed to regenerate this response.'],
              segments: [message],
              citations: [],
              confidence: 0,
              streaming: false,
              streamDone: true,
              streamedText: message,
              animate: true,
            } satisfies AssistantMessage;
          }),
        );
      } finally {
        pendingAssistantIdRef.current = null;
      }
    },
    [busy, documentId, messages, queryClient, sendQueryMutation, sessionId],
  );

  const removeMessage = useCallback(async (messageId: string) => {
    if (deleteMessageMutation.isPending) return;
    setLocalChatError(null);
    await deleteMessageMutation.mutateAsync(messageId);
  }, [deleteMessageMutation]);

  const reportMessage = useCallback(async (messageId: string) => {
    if (reportMessageMutation.isPending) return;
    setLocalChatError(null);
    await reportMessageMutation.mutateAsync(messageId);
  }, [reportMessageMutation]);

  const onPickSuggestion = useCallback(
    (prompt: ConversationStarter | { reset: true }) => {
      if ('reset' in prompt) {
        void createNewChat();
        return;
      }
      sendPrompt(prompt.q);
    },
    [createNewChat, sendPrompt],
  );

  return {
    sessionId,
    sessions,
    activeSession,
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
  };
}
