'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/use-auth';
import { NibLogoSpinner } from '../../../components/nib-logo-spinner';

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
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-base)]">
        <NibLogoSpinner size={28} label="Initializing session" />
      </div>
    );
  }

  return <>{children}</>;
}
