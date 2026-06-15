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
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-between px-4 py-8 text-[var(--text)]">

      {/* Fixed base + drifting glow blobs — fills the viewport at any scroll position */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[var(--bg-base)]" aria-hidden>
        <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 720, height: 720, filter: 'blur(120px)', background: 'radial-gradient(circle,var(--accent-glow-a),transparent 60%)', top: -260, left: -200, '--hero-glow-min': 0.3, '--hero-glow-max': 0.58, '--hero-glow-dur': '20s', '--hero-glow-delay': '0s', '--hero-drift-x': '320px', '--hero-drift-y': '220px', '--hero-drift-y2': '80px' } as React.CSSProperties} />
        <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 720, height: 720, filter: 'blur(120px)', background: 'radial-gradient(circle,var(--accent-glow-d),transparent 60%)', top: -160, right: -220, '--hero-glow-min': 0.26, '--hero-glow-max': 0.52, '--hero-glow-dur': '26s', '--hero-glow-delay': '-6s', '--hero-drift-x': '-380px', '--hero-drift-y': '260px', '--hero-drift-y2': '-120px' } as React.CSSProperties} />
        <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 640, height: 640, filter: 'blur(120px)', background: 'radial-gradient(circle,var(--accent-glow-e),transparent 60%)', bottom: -200, left: '20%', '--hero-glow-min': 0.22, '--hero-glow-max': 0.46, '--hero-glow-dur': '24s', '--hero-glow-delay': '-10s', '--hero-drift-x': '300px', '--hero-drift-y': '-220px', '--hero-drift-y2': '160px' } as React.CSSProperties} />
        <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 600, height: 600, filter: 'blur(120px)', background: 'radial-gradient(circle,var(--accent-glow-f),transparent 60%)', bottom: -160, right: '14%', '--hero-glow-min': 0.2, '--hero-glow-max': 0.44, '--hero-glow-dur': '28s', '--hero-glow-delay': '-4s', '--hero-drift-x': '-260px', '--hero-drift-y': '-260px', '--hero-drift-y2': '180px' } as React.CSSProperties} />
      </div>

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
          <Link href="/privacy" className="hover:text-[var(--text)] transition-colors">Privacy Policy</Link>
          <span>&middot;</span>
          <Link href="/security" className="hover:text-[var(--text)] transition-colors">Security</Link>
        </div>
        <span>&copy; 2026 Nib Reader, Inc. All rights reserved.</span>
      </footer>
    </div>
  );
}
