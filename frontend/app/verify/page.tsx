'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NibLogo } from '../components/nib-logo';

type Status = 'loading' | 'success' | 'error';

function VerifyInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against React strict-mode double-invoke
    ran.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    fetch(`${apiUrl}/api/v1/auth/verify?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email confirmed. You can now sign in.');
        } else {
          setStatus('error');
          setMessage(data.message || 'This verification link is invalid or has expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong confirming your email. Please try again.');
      });
  }, [searchParams]);

  return (
    <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-white/[0.01] p-5 sm:p-8 text-center backdrop-blur-md">
      {status === 'loading' && (
        <>
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
          <h1 className="font-serif text-2xl font-medium text-[var(--text)]">Confirming your email…</h1>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl font-medium text-[var(--text)]">Email confirmed</h1>
          <p className="mt-3 text-sm text-[var(--text-dim)]">{message}</p>
          <Link
            href="/signin"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--text)] py-2.5 text-sm font-semibold text-[var(--bg-base)] transition-all hover:opacity-90 active:scale-[0.99]"
          >
            Continue to sign in
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger)]/10">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl font-medium text-[var(--text)]">Verification failed</h1>
          <p className="mt-3 text-sm text-[var(--text-dim)]">{message}</p>
          <Link
            href="/signin"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-[var(--text)] transition-all hover:bg-white/5"
          >
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-between bg-[var(--bg-base)] px-4 py-8 text-[var(--text)]">
      <header className="relative z-10 flex flex-col items-center gap-2 pt-4">
        <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--text)] text-[var(--bg-base)] transition hover:scale-[1.03]">
          <NibLogo size={20} />
        </Link>
        <span className="text-sm font-semibold uppercase tracking-wider text-[var(--text-faint)]">Nib Workspace</span>
      </header>

      <main className="relative z-10 my-auto flex w-full justify-center py-6">
        <Suspense fallback={null}>
          <VerifyInner />
        </Suspense>
      </main>

      <footer className="relative z-10 text-center text-xs text-[var(--text-faint)]">
        <span>&copy; 2026 Nib Reader, Inc. All rights reserved.</span>
      </footer>
    </div>
  );
}
