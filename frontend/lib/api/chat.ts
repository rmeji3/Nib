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

export interface ApiBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ApiCitation {
  pageNumber: number;
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
  /** Phase 3 — confidence in [0,1] derived from top-k retrieval similarity. */
  confidence: number;
  /** Phase 3 — fraction of answer sentences that carry a [Page N] citation, in [0,1]. */
  groundedness: number;
  /** Phase 3 — true when retrieval was too weak and Gemini was skipped (canned refusal). */
  refused: boolean;
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
