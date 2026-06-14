'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { fetchWithAuth, SESSION_EXPIRED_EVENT } from '@/app/lib/fetch-with-auth';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'credentials' | 'google';
  settings?: string;
  subscriptionTier?: string;
  subscriptionPeriodEnd?: string; // ISO date string — when the current paid period ends
  subscriptionCancelAtPeriodEnd?: boolean; // true = canceled, PRO until periodEnd then reverts to Free
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, name: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserSession: (settings: string) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Loads the Google Identity Services script once and resolves when it's ready. */
let googleScriptPromise: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        googleScriptPromise = null;
        reject(new Error('Failed to load Google sign-in.'));
      };
      document.head.appendChild(script);
    });
  }
  return googleScriptPromise;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isMountLoading, setIsMountLoading] = useState(true);

  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('nib_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Background sync — cookie is sent automatically, no Authorization header needed
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        fetch(`${apiUrl}/api/v1/auth/me`, { credentials: 'include' })
          .then(res => {
            if (res.status === 401) {
              // Cookie already expired — clear stale local data silently
              setUser(null);
              localStorage.removeItem('nib_user');
              setIsMountLoading(false);
              return null;
            }
            if (!res.ok) throw new Error('Session check failed');
            return res.json();
          })
          .then(data => {
            if (!data) return;
            const updated = {
              ...parsedUser,
              subscriptionTier: data.subscriptionTier,
              subscriptionPeriodEnd: data.subscriptionPeriodEnd,
              subscriptionCancelAtPeriodEnd: data.subscriptionCancelAtPeriodEnd,
            };
            setUser(updated);
            localStorage.setItem('nib_user', JSON.stringify(updated));
          })
          .catch(err => {
            console.error('Background session sync failed', err);
          })
          .finally(() => setIsMountLoading(false));
        return; // setIsMountLoading(false) is handled in .finally
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('nib_user');
      }
    }
    setIsMountLoading(false);
  }, []);

  // ── Auto-logout when any API call returns 401 ───────────────────────────
  const handleSessionExpired = useCallback(() => {
    setUser(null);
    localStorage.removeItem('nib_user');
    router.push('/?reason=session_expired');
  }, [router]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [handleSessionExpired]);

  // Shared post-authentication handler for both credentials and Google sign-in.
  const handleAuthSuccess = useCallback(async (data: any, provider: 'credentials' | 'google') => {
    const loggedUser: User = {
      id: data.userId,
      email: data.email,
      name: data.name,
      provider,
      settings: data.settings,
      subscriptionTier: data.subscriptionTier,
      subscriptionPeriodEnd: data.subscriptionPeriodEnd,
      subscriptionCancelAtPeriodEnd: data.subscriptionCancelAtPeriodEnd,
    };
    setUser(loggedUser);
    localStorage.setItem('nib_user', JSON.stringify(loggedUser));

    // If the user came from the landing "Go Pro" CTA while logged out, send them
    // straight to Stripe checkout after sign-in instead of the home screen.
    if (localStorage.getItem('nib_post_auth_intent') === 'pro') {
      localStorage.removeItem('nib_post_auth_intent');
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const res = await fetch(`${apiUrl}/api/stripe/create-checkout-session`, {
          method: 'POST',
          credentials: 'include',
        });
        const d = await res.json();
        if (res.ok && d.url) {
          window.location.href = d.url;
          return;
        }
      } catch { /* fall through to home */ }
    }
    router.push('/home');
  }, [router]);

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: any) => {
      const start = Date.now();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/v1/auth/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // backend sets httpOnly cookie
        body: JSON.stringify({ email, password }),
      });

      const elapsed = Date.now() - start;
      if (elapsed < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      }

      if (!response.ok) {
        let msg = 'Invalid email or password';
        try {
          const err = await response.json();
          if (err?.message) msg = err.message; // e.g. EMAIL_NOT_VERIFIED message
        } catch { /* keep default */ }
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: (data) => handleAuthSuccess(data, 'credentials'),
  });

  // Returns the success payload ({ message, email }); does NOT log the user in —
  // they must confirm their email first.
  const signUpMutation = useMutation({
    mutationFn: async ({ email, name, password }: any) => {
      const start = Date.now();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const elapsed = Date.now() - start;
      if (elapsed < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      }

      if (!response.ok) {
        let msg = 'Registration failed. Email might already be in use.';
        try {
          const err = await response.json();
          if (err?.message) msg = err.message;
        } catch { /* keep default */ }
        throw new Error(msg);
      }
      return response.json();
    },
  });

  const signIn = async (email: string, password: string) => await signInMutation.mutateAsync({ email, password });
  const signUp = async (email: string, name: string, password: string) => await signUpMutation.mutateAsync({ email, name, password });

  const isLoading = isMountLoading || signInMutation.isPending || signUpMutation.isPending;

  const signInWithGoogle = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google sign-in is not configured.');
    }

    await loadGoogleScript();

    // Google Identity Services popup auth-code flow. We receive a one-time code and
    // exchange it server-side for the user's identity (and our session cookie).
    await new Promise<void>((resolve, reject) => {
      const google = (window as any).google;
      const codeClient = google.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: 'openid email profile',
        ux_mode: 'popup',
        callback: async (resp: any) => {
          if (resp.error || !resp.code) {
            reject(new Error('Google sign-in was cancelled.'));
            return;
          }
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
            const res = await fetch(`${apiUrl}/api/v1/auth/google`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ code: resp.code }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.message || 'Google sign-in failed.');
            }
            const data = await res.json();
            await handleAuthSuccess(data, 'google');
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
      codeClient.requestCode();
    });
  };

  const signOut = async () => {
    setIsMountLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      await fetch(`${apiUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include', // sends the cookie so the server can clear it
      });
    } catch (_) {
      // Best-effort — clear local state regardless
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    setUser(null);
    localStorage.removeItem('nib_user');
    setIsMountLoading(false);
    router.push('/');
  };

  const updateUserSession = (settings: string) => {
    if (user) {
      const updatedUser = { ...user, settings };
      setUser(updatedUser);
      localStorage.setItem('nib_user', JSON.stringify(updatedUser));
    }
  };

  const refreshSession = async () => {
    try {
      // Cookie is sent automatically — no Authorization header needed
      const res = await fetchWithAuth('/api/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(prev => {
          if (!prev) return prev;
          const updatedUser: User = {
            ...prev,
            subscriptionTier: data.subscriptionTier,
            subscriptionPeriodEnd: data.subscriptionPeriodEnd,
            subscriptionCancelAtPeriodEnd: data.subscriptionCancelAtPeriodEnd,
          };
          localStorage.setItem('nib_user', JSON.stringify(updatedUser));
          return updatedUser;
        });
      }
    } catch (error) {
      console.error('Failed to refresh session', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signInWithGoogle, signOut, updateUserSession, refreshSession }}>
      {children}

    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
