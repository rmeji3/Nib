'use client';

import dynamic from 'next/dynamic';
import { ProtectedRoute } from '../features/auth/components/protected-route';

const NibApp = dynamic(() => import('../features/nib/nib-app'), {
  ssr: false,
});

export default function FilePage() {
  return (
    <ProtectedRoute>
      <main className="h-[100dvh] overflow-hidden">
        <NibApp />
      </main>
    </ProtectedRoute>
  );
}

