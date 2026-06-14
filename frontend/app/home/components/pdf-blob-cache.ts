import { API_URL, getAuthHeaders } from '../../../lib/api/documents';

/**
 * Session-level blob URL cache shared by all preview components.
 *
 * Blob URLs are created once per documentId and reused across every remount
 * for the lifetime of the page. They are intentionally never revoked during
 * the session — the browser cleans them up on navigation / unload. This
 * eliminates the re-fetch + PDF.js re-render that happens every time a card
 * unmounts and remounts (e.g. when switching library views).
 */
const blobCache = new Map<string, string>();

/** In-flight promises so concurrent mounts of the same doc share one request. */
const pending = new Map<string, Promise<string>>();

export function getCachedBlobUrl(documentId: string): string | undefined {
  return blobCache.get(documentId);
}

export function hasCachedBlobUrl(documentId: string): boolean {
  return blobCache.has(documentId);
}

export function invalidateCachedBlob(documentId: string): void {
  const cached = blobCache.get(documentId);
  if (cached) {
    URL.revokeObjectURL(cached);
    blobCache.delete(documentId);
  }
}

export async function fetchBlobUrl(documentId: string): Promise<string> {
  const cached = blobCache.get(documentId);
  if (cached) return cached;

  const inFlight = pending.get(documentId);
  if (inFlight) return inFlight;

  const promise = fetch(`${API_URL}/api/v1/documents/${documentId}/content`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      blobCache.set(documentId, url);
      pending.delete(documentId);
      return url;
    })
    .catch(err => {
      pending.delete(documentId);
      throw err;
    });

  pending.set(documentId, promise);
  return promise;
}
