import { API_URL, getAuthHeaders } from './documents';

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  documentId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ChatStarter {
  prompt: string;
  icon: string;
}

export interface ApiBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ApiCitation {
  pageNumber: number;
  sourceId: string | null;
  blockId: string | null;
  documentId: string | null;
  blockType: string | null;
  chunkIndex: number | null;
  evidenceType: string | null;
  /** Excerpt from a text block — usable for PDF text-layer search highlighting. Null when no usable text block exists. */
  textExcerpt: string | null;
  /** Gemini Vision description of the page — shown in the evidence drawer. Null when vision was disabled or failed. */
  visualSummary: string | null;
  /** Bounding box on the page in PDF user units, top-left origin. Null for blocks ingested before the bbox pipeline. */
  bbox: ApiBBox | null;
  /** Page width in the same units as bbox. Null when bbox is null. */
  pageWidth: number | null;
  /** Page height in the same units as bbox. Null when bbox is null. */
  pageHeight: number | null;
}

export interface ChatQueryResponse {
  messageId: string;
  sessionId: string;
  answer: string;
  citations: ApiCitation[];
  modelVersion: string;
  createdAt: string;
  confidence: number;
  groundedness: number;
  refused: boolean;
}

export interface ApiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: ApiCitation[] | null;
  createdAt: string;
  confidence: number | null;
  groundedness: number | null;
  reported: boolean;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getOrCreateSession(documentId: string): Promise<ChatSession> {
  const res = await apiFetch(`/api/v1/chat/sessions/document/${documentId}`);
  if (!res.ok) throw new Error(`Failed to get session: ${res.statusText}`);
  return res.json();
}

export async function listChatSessions(documentId: string): Promise<ChatSession[]> {
  const res = await apiFetch(`/api/v1/chat/sessions/document/${documentId}/all`);
  if (!res.ok) throw new Error(`Failed to list chat sessions: ${res.statusText}`);
  return res.json();
}

export async function createChatSession(documentId: string): Promise<ChatSession> {
  const res = await apiFetch(`/api/v1/chat/sessions/document/${documentId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to create chat session: ${res.statusText}`);
  return res.json();
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const res = await apiFetch(`/api/v1/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete chat session: ${res.statusText}`);
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  const res = await apiFetch(`/api/v1/chat/messages/${messageId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete chat message: ${res.statusText}`);
}

export async function reportChatMessage(messageId: string, note?: string): Promise<void> {
  const res = await apiFetch(`/api/v1/chat/messages/${messageId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'report', note }),
  });
  if (!res.ok) throw new Error(`Failed to report chat message: ${res.statusText}`);
}

export async function fetchConversationStarters(documentId: string): Promise<ChatStarter[]> {
  const res = await apiFetch(`/api/v1/chat/sessions/document/${documentId}/starters`);
  if (!res.ok) throw new Error(`Failed to fetch conversation starters: ${res.statusText}`);
  return res.json();
}

export async function sendChatQuery(
  sessionId: string,
  question: string
): Promise<ChatQueryResponse> {
  const res = await apiFetch(`/api/v1/chat/sessions/${sessionId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Chat query failed');
  }
  return res.json();
}

export async function fetchSessionMessages(sessionId: string): Promise<ApiChatMessage[]> {
  const res = await apiFetch(`/api/v1/chat/sessions/${sessionId}/messages`);
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.statusText}`);
  return res.json();
}
