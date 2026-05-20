const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface DocumentResponse {
  id: string;
  filename: string;
  originalFilename: string;
  storageUrl: string;
  fileSizeBytes: number | null;
  pageCount: number | null;
  createdAt: string;
}

function getAuthHeaders(): Record<string, string> {
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

export async function fetchDocuments(searchTerm?: string): Promise<DocumentResponse[]> {
  const url = searchTerm?.trim()
    ? `/api/v1/documents?search=${encodeURIComponent(searchTerm)}`
    : '/api/v1/documents';
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch documents: ${res.statusText}`);
  return res.json();
}

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch('/api/v1/documents/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Upload failed');
  }
  return res.json();
}

export async function mergeDocuments(
  baseDocumentId: string | null,
  baseFile: File | null,
  mergeFile: File
): Promise<DocumentResponse> {
  const formData = new FormData();
  if (baseDocumentId) formData.append('baseDocumentId', baseDocumentId);
  if (baseFile) formData.append('baseFile', baseFile);
  formData.append('mergeFile', mergeFile);
  const res = await apiFetch('/api/v1/documents/merge', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || 'Merge failed');
  }
  return res.json();
}
