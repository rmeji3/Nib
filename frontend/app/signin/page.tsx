import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { AuthCard } from '../features/auth/components/auth-card';
import { NibLogo } from '../components/nib-logo';

export const metadata: Metadata = {
  title: 'Sign in · Nib',
  description: 'Sign in to access your grounded document insights.',
};

export default function SignInPage() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-between bg-[var(--bg-base)] px-4 py-8 text-[var(--text)] overflow-hidden">


      {/* Header Logo */}
      <header className="relative z-10 flex flex-col items-center gap-2 pt-4">
        <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--text)] text-[var(--bg-base)] transition hover:scale-[1.03]">
          <NibLogo size={20} />
        </Link>
        <span className="text-sm font-semibold tracking-wider text-[var(--text-faint)] uppercase">Nib Workspace</span>
      </header>

      {/* Card Wrapper */}
      <main className="relative z-10 my-auto flex w-full justify-center py-6">
        <AuthCard />
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-[var(--text-faint)]">
        <div className="flex gap-4 justify-center mb-2">
          <Link href="/" className="hover:text-[var(--text)] transition-colors">Back to landing</Link>
          <span>&middot;</span>
          <a href="#" className="hover:text-[var(--text)] transition-colors">Privacy Policy</a>
          <span>&middot;</span>
          <a href="#" className="hover:text-[var(--text)] transition-colors">Security</a>
        </div>
        <span>&copy; 2026 Nib Reader, Inc. All rights reserved.</span>
      </footer>
    </div>
  );
}
