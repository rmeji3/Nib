'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NibLogo } from '../components/nib-logo';

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('This reset link is missing its token.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiUrl}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'This reset link is invalid or has expired.');
      }
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-white/[0.01] p-5 sm:p-8 text-center backdrop-blur-md shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl font-medium text-[var(--text)]">Password updated</h1>
        <p className="mt-3 text-sm text-[var(--text-dim)]">You can now sign in with your new password.</p>
        <Link
          href="/signin"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--text)] py-2.5 text-sm font-semibold text-[var(--bg-base)] transition-all hover:opacity-90 active:scale-[0.99]"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-white/[0.01] p-5 sm:p-8 text-center backdrop-blur-md shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger)]/10">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl font-medium text-[var(--text)]">Invalid link</h1>
        <p className="mt-3 text-sm text-[var(--text-dim)]">This reset link is missing its token. Please request a new one.</p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--text)] py-2.5 text-sm font-semibold text-[var(--bg-base)] transition-all hover:opacity-90 active:scale-[0.99]"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-white/[0.01] p-5 sm:p-8 backdrop-blur-md shadow-2xl">
      <div className="mb-6 text-center">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-[var(--text)]">Choose a new password</h1>
        <p className="mt-2 text-sm text-[var(--text-dim)]">Enter and confirm your new password below.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3.5 py-3 text-xs text-[oklch(0.8_0.12_25)]">
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
            New password
          </label>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none transition focus:border-[var(--border-strong)] focus:ring-1 focus:ring-[var(--border)]"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
            Confirm password
          </label>
          <input
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isLoading}
            className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none transition focus:border-[var(--border-strong)] focus:ring-1 focus:ring-[var(--border)]"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-[var(--text)] py-2.5 text-sm font-semibold text-[var(--bg-base)] transition-all hover:opacity-90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading ? 'Updating...' : 'Reset password'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[var(--text-dim)]">
        <Link href="/signin" className="font-semibold text-[var(--text)] hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-between bg-[var(--bg-base)] px-4 py-8 text-[var(--text)] overflow-hidden">
      {/* Dynamic Background Glow Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div
          className="absolute rounded-full mix-blend-screen"
          style={{ width: 500, height: 500, filter: 'blur(100px)', opacity: 0.16, background: 'radial-gradient(circle, var(--accent-glow-a), transparent 65%)', top: '-10%', left: '-10%' }}
        />
        <div
          className="absolute rounded-full mix-blend-screen"
          style={{ width: 500, height: 500, filter: 'blur(100px)', opacity: 0.14, background: 'radial-gradient(circle, var(--accent-glow-b), transparent 65%)', bottom: '-10%', right: '-10%' }}
        />
      </div>

      <header className="relative z-10 flex flex-col items-center gap-2 pt-4">
        <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--text)] text-[var(--bg-base)] transition hover:scale-[1.03]">
          <NibLogo size={20} />
        </Link>
        <span className="text-sm font-semibold uppercase tracking-wider text-[var(--text-faint)]">Nib Workspace</span>
      </header>

      <main className="relative z-10 my-auto flex w-full justify-center py-6">
        <Suspense fallback={null}>
          <ResetPasswordInner />
        </Suspense>
      </main>

      <footer className="relative z-10 text-center text-xs text-[var(--text-faint)]">
        <span>&copy; 2026 Nib Reader, Inc. All rights reserved.</span>
      </footer>
    </div>
  );
}
