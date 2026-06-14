import { API_URL, getAuthHeaders, type PagedResponse, type DocumentResponse } from './documents';

export interface CollectionSummary {
  id: string;
  name: string;
  documentCount: number;
  createdAt: string;
}

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

export async function fetchCollections(): Promise<CollectionSummary[]> {
  const res = await apiFetch('/api/v1/collections');
  if (!res.ok) throw new Error(`Failed to fetch collections: ${res.statusText}`);
  return res.json();
}

export async function createCollection(name: string): Promise<CollectionSummary> {
  const res = await apiFetch('/api/v1/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Create failed');
  }
  return res.json();
}

export async function renameCollection(id: string, name: string): Promise<CollectionSummary> {
  const res = await apiFetch(`/api/v1/collections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Rename failed');
  }
  return res.json();
}

export async function deleteCollection(id: string): Promise<void> {
  const res = await apiFetch(`/api/v1/collections/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Delete failed');
  }
}

export async function fetchCollectionDocuments(
  collectionId: string,
  page = 0
): Promise<PagedResponse<DocumentResponse>> {
  const res = await apiFetch(`/api/v1/collections/${collectionId}/documents?page=${page}`);
  if (!res.ok) throw new Error(`Failed to fetch collection documents: ${res.statusText}`);
  return res.json();
}

export async function addToCollection(collectionId: string, documentIds: string[]): Promise<void> {
  const res = await apiFetch(`/api/v1/collections/${collectionId}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Add failed');
  }
}

export async function removeFromCollection(collectionId: string, documentId: string): Promise<void> {
  const res = await apiFetch(`/api/v1/collections/${collectionId}/documents/${documentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Remove failed');
  }
}
