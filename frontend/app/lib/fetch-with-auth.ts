/**
 * Centralized fetch wrapper that:
 *  - Always sends credentials (httpOnly cookie)
 *  - Fires a global `nib:session-expired` event on 401 so the auth provider
 *    can sign the user out from anywhere in the app without circular imports.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/** Dispatched globally when any authenticated request returns 401. */
export const SESSION_EXPIRED_EVENT = 'nib:session-expired';

export async function fetchWithAuth(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }

  return res;
}
