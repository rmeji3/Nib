'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'credentials' | 'google';
  token?: string;
  settings?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, name: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserSession: (settings: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isMountLoading, setIsMountLoading] = useState(true);
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('nib_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('nib_user');
      }
    }
    setIsMountLoading(false);
  }, []);

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: any) => {
      const start = Date.now();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/v1/auth/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const elapsed = Date.now() - start;
      if (elapsed < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      }
      
      if (!response.ok) throw new Error('Invalid email or password');
      return response.json();
    },
    onSuccess: (data) => {
      const loggedUser: User = {
        id: data.userId,
        email: data.email,
        name: data.name,
        provider: 'credentials',
        token: data.token,
        settings: data.settings,
      };
      setUser(loggedUser);
      localStorage.setItem('nib_user', JSON.stringify(loggedUser));
      router.push('/home');
    }
  });

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
      
      if (!response.ok) throw new Error('Registration failed. Email might already be in use.');
      return response.json();
    },
    onSuccess: (data) => {
      const loggedUser: User = {
        id: data.userId,
        email: data.email,
        name: data.name,
        provider: 'credentials',
        token: data.token,
        settings: data.settings,
      };
      setUser(loggedUser);
      localStorage.setItem('nib_user', JSON.stringify(loggedUser));
      router.push('/home');
    }
  });

  const signIn = async (email: string, password: string) => await signInMutation.mutateAsync({ email, password });
  const signUp = async (email: string, name: string, password: string) => await signUpMutation.mutateAsync({ email, name, password });

  const isLoading = isMountLoading || signInMutation.isPending || signUpMutation.isPending;

  const signInWithGoogle = async () => {
    // Open the Google simulated consent modal overlay
    setShowGoogleMock(true);
    setGoogleEmail('riya.sen@gmail.com');
    setGoogleName('Riya Sen');
  };

  const handleGoogleMockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail) return;

    setIsGoogleLoading(true);
    // Simulate Google authorization latency
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const mockUser: User = {
      id: 'google_' + Math.random().toString(36).substring(2, 9),
      email: googleEmail,
      name: googleName || googleEmail.split('@')[0],
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(googleName || googleEmail)}`,
      provider: 'google',
    };

    setUser(mockUser);
    localStorage.setItem('nib_user', JSON.stringify(mockUser));
    setIsGoogleLoading(false);
    setShowGoogleMock(false);
    router.push('/home');
  };

  const signOut = async () => {
    setIsMountLoading(true);
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

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signInWithGoogle, signOut, updateUserSession }}>
      {children}

      {/* Google OAuth Simulation Modal */}
      {showGoogleMock && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div 
            className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f12] text-[#e7e9ee] shadow-2xl transition-all duration-300"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(120, 130, 200, 0.15)',
            }}
          >
            {/* Header / Google Logo */}
            <div className="flex flex-col items-center px-8 pt-8 pb-4 text-center">
              <svg className="mb-4 h-8 w-8" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 15 1 12 1 7.24 1 3.2 3.8 1.4 7.96l3.88 3C6.2 8.08 8.84 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.52 12.3c0-.82-.08-1.6-.2-2.38H12v4.5h6.48c-.28 1.48-1.12 2.74-2.38 3.58l3.68 2.86c2.16-2 3.74-4.94 3.74-8.56z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.04c-.24-.72-.38-1.5-.38-2.3a7.82 7.82 0 0 1 .38-2.3L1.4 6.44A11.96 11.96 0 0 0 0 12c0 2 1.1 3.78 2.76 4.96l2.52-2.92z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.96-1.08 7.96-2.92l-3.68-2.86c-1.12.76-2.54 1.22-4.28 1.22-3.16 0-5.8-3.04-6.72-5.92L1.4 15.52A11.97 11.97 0 0 0 12 23z"
                />
              </svg>
              <h2 className="text-xl font-semibold tracking-tight text-white">Sign in with Google</h2>
              <p className="mt-1.5 text-xs text-[var(--text-dim)]">to continue to <span className="font-semibold text-white">Nib</span></p>
            </div>

            {/* Simulated Chooser */}
            <form onSubmit={handleGoogleMockSubmit} className="px-8 pb-8 pt-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#16191f] px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                    placeholder="you@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#16191f] px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                    placeholder="Riya Sen"
                  />
                </div>
              </div>

              {/* Notice */}
              <p className="mt-5 text-[11px] leading-normal text-[var(--text-faint)]">
                This is a simulated OAuth 2.0 interface. Clicking &ldquo;Authorize&rdquo; will generate a mock authenticated session for development purposes.
              </p>

              {/* Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGoogleMock(false)}
                  disabled={isGoogleLoading}
                  className="rounded-lg px-4 py-2.5 text-xs font-medium text-[var(--text-dim)] hover:text-white transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGoogleLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-medium text-white hover:bg-blue-500 transition disabled:opacity-50"
                  style={{ background: '#4285F4' }}
                >
                  {isGoogleLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Authorizing...
                    </span>
                  ) : (
                    'Authorize'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
