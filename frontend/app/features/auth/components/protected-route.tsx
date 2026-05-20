'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/use-auth';
import { NibLogo } from '../../../components/nib-logo';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/signin');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text)]">
        <div className="relative flex flex-col items-center gap-4">
          {/* Pulsing logo */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--text)] text-[var(--bg-base)] shadow-lg animate-pulse">
            <NibLogo size={32} />
          </div>
          {/* Subtle loading indicator */}
          <div className="flex items-center gap-2 mt-2">
            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent)]" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent)]" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent)]" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-[var(--text-faint)] tracking-widest uppercase font-semibold">Initializing Session</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
