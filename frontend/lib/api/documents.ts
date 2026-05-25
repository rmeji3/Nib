export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface DocumentResponse {
  id: string;
  filename: string;
  originalFilename: string;
  storageUrl: string;
  fileSizeBytes: number | null;
  pageCount: number | null;
  createdAt: string;
  deletedAt: string | null;
  isStarred: boolean;
  lastOpenedAt: string | null;
}

export interface PagedResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem('nib_user');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ? { Authorization: `Bearer ${parsed.token}` } : {};
  } catch {
    return {};
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

export async function fetchDocuments(searchTerm?: string, page = 0): Promise<PagedResponse<DocumentResponse>> {
  const url = searchTerm?.trim()
    ? `/api/v1/documents?search=${encodeURIComponent(searchTerm)}&page=${page}`
    : `/api/v1/documents?page=${page}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch documents: ${res.statusText}`);
  return res.json();
}

export async function fetchDocument(id: string): Promise<DocumentResponse> {
  const res = await apiFetch(`/api/v1/documents/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch document: ${res.statusText}`);
  return res.json();
}

/** Upload one or more PDFs. If multiple files are provided they are merged server-side. */
export async function uploadDocument(files: File[], name?: string): Promise<DocumentResponse> {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  if (name?.trim()) formData.append('name', name.trim());
  const res = await apiFetch('/api/v1/documents/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Upload failed');
  }
  return res.json();
}

export async function renameDocument(id: string, name: string): Promise<DocumentResponse> {
  const res = await apiFetch(`/api/v1/documents/${id}`, {
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

export async function fetchTrashedDocuments(page = 0): Promise<PagedResponse<DocumentResponse>> {
  const res = await apiFetch(`/api/v1/documents/trash?page=${page}`);
  if (!res.ok) throw new Error(`Failed to fetch trash: ${res.statusText}`);
  return res.json();
}

export async function fetchStarredDocuments(page = 0): Promise<PagedResponse<DocumentResponse>> {
  const res = await apiFetch(`/api/v1/documents/starred?page=${page}`);
  if (!res.ok) throw new Error(`Failed to fetch starred documents: ${res.statusText}`);
  return res.json();
}

export async function toggleDocumentStar(id: string): Promise<DocumentResponse> {
  const res = await apiFetch(`/api/v1/documents/${id}/star`, { method: 'PATCH' });
  if (!res.ok) throw new Error(`Failed to toggle star: ${res.statusText}`);
  return res.json();
}

/** Move a document to trash (soft delete). */
export async function softDeleteDocument(id: string): Promise<void> {
  const res = await apiFetch(`/api/v1/documents/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Delete failed');
  }
}

/** Restore a trashed document back to the library. */
export async function restoreDocument(id: string): Promise<DocumentResponse> {
  const res = await apiFetch(`/api/v1/documents/${id}/restore`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Restore failed');
  }
  return res.json();
}

/** Permanently delete a document from DB and storage. */
export async function permanentDeleteDocument(id: string): Promise<void> {
  const res = await apiFetch(`/api/v1/documents/${id}/permanent`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Permanent delete failed');
  }
}

export async function fetchRecentDocuments(page = 0): Promise<PagedResponse<DocumentResponse>> {
  const res = await apiFetch(`/api/v1/documents/recent?page=${page}`);
  if (!res.ok) throw new Error(`Failed to fetch recent documents: ${res.statusText}`);
  return res.json();
}

export async function trackDocumentOpen(id: string): Promise<DocumentResponse> {
  const res = await apiFetch(`/api/v1/documents/${id}/open`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to record open: ${res.statusText}`);
  return res.json();
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

export interface IngestionStatus {
  jobId: string | null;
  documentId: string;
  status: 'NOT_STARTED' | 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  pagesTotal: number | null;
  pagesProcessed: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export async function fetchIngestionStatus(documentId: string): Promise<IngestionStatus> {
  const res = await apiFetch(`/api/v1/documents/${documentId}/status`);
  if (!res.ok) throw new Error(`Failed to fetch ingestion status: ${res.statusText}`);
  return res.json();
}

/** Merge one or more PDFs into an existing document (or a freshly uploaded base file).
 *  Accepts 1–N merge files so the user can combine 3+ PDFs in a single request. */
export async function mergeDocuments(
  baseDocumentId: string | null,
  baseFile: File | null,
  mergeFiles: File[]
): Promise<DocumentResponse> {
  const formData = new FormData();
  if (baseDocumentId) formData.append('baseDocumentId', baseDocumentId);
  if (baseFile) formData.append('baseFile', baseFile);
  // Backend @RequestParam("mergeFiles") List<MultipartFile> — append each file separately
  mergeFiles.forEach((f) => formData.append('mergeFiles', f));
  const res = await apiFetch('/api/v1/documents/merge', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Merge failed');
  }
  return res.json();
}
