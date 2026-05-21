import { API_URL, getAuthHeaders } from './documents';

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
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
}

export interface ApiCitation {
  pageNumber: number;
  excerpt: string;
}

export interface ChatQueryResponse {
  messageId: string;
  sessionId: string;
  answer: string;
  citations: ApiCitation[];
  modelVersion: string;
  createdAt: string;
}

export interface ApiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: ApiCitation[] | null;
  createdAt: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getOrCreateSession(documentId: string): Promise<ChatSession> {
  const res = await apiFetch(`/api/v1/chat/sessions/document/${documentId}`);
  if (!res.ok) throw new Error(`Failed to get session: ${res.statusText}`);
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
