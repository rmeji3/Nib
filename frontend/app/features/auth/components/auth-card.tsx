'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/use-auth';
import { OAuthButton } from './oauth-button';
import { NibLogoSpinner } from '../../../components/nib-logo-spinner';

export function AuthCard() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const pathname = usePathname();
  
  const initialMode = pathname === '/signup' ? 'signup' : 'signin';
  const [currentMode, setCurrentMode] = useState<'signin' | 'signup'>(initialMode);
  
  useEffect(() => {
    const routeMode = pathname === '/signup' ? 'signup' : 'signin';
    if (routeMode !== currentMode) {
      setCurrentMode(routeMode);
    }
  }, [pathname]);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent, formMode: 'signin' | 'signup') => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please fill in all fields.');
      }

      if (formMode === 'signup') {
        if (!name) {
          throw new Error('Please enter your name.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await signUp(email, name, password);
        // Not logged in yet — they must confirm their email first.
        setVerificationSentTo(email);
        setIsLoading(false);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationSentTo) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      await fetch(`${apiUrl}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationSentTo }),
      });
    } catch { /* best effort */ }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsOAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setIsOAuthLoading(false);
    }
  };

  const toggleMode = (e: React.MouseEvent, targetMode: 'signin' | 'signup') => {
    e.preventDefault();
    setError(null);
    setVerificationSentTo(null);
    setCurrentMode(targetMode);
    window.history.pushState(null, '', targetMode === 'signup' ? '/signup' : '/signin');
  };

  const cardStyle = {
    boxShadow: '0 0 0 1px rgba(255,255,255,0.02), 0 30px 60px -15px rgba(0,0,0,0.6), 0 0 50px rgba(120,130,200,0.06)',
  };

  const isSignIn = currentMode === 'signin';
  const isSignUp = currentMode === 'signup';

  return (
    <>
      {/* Dynamic Background Glow Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div 
          className="absolute rounded-full mix-blend-screen transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]" 
          style={{ 
            width: 500, 
            height: 500, 
            filter: 'blur(100px)', 
            opacity: 0.16, 
            background: 'radial-gradient(circle, var(--accent-glow-a), transparent 65%)', 
            top: isSignUp ? '10%' : '-10%', 
            left: isSignUp ? '100%' : '-10%',
            transform: isSignUp ? 'translate(-100%, 0)' : 'translate(0, 0)'
          }} 
        />
        <div 
          className="absolute rounded-full mix-blend-screen transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]" 
          style={{ 
            width: 500, 
            height: 500, 
            filter: 'blur(100px)', 
            opacity: 0.14, 
            background: 'radial-gradient(circle, var(--accent-glow-b), transparent 65%)', 
            bottom: isSignUp ? '20%' : '-10%', 
            right: isSignUp ? '80%' : '-10%',
            transform: isSignUp ? 'translate(80%, 0)' : 'translate(0, 0)'
          }} 
        />
        <div 
          className="absolute rounded-full mix-blend-screen transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]" 
          style={{ 
            width: 500, 
            height: 500, 
            filter: 'blur(100px)', 
            opacity: isSignUp ? 0.12 : 0, 
            background: 'radial-gradient(circle, var(--accent-glow-c), transparent 65%)', 
            bottom: '-10%', 
            left: '-10%' 
          }} 
        />
      </div>

      <div 
        className="w-full max-w-[440px] bg-white/[0.01] border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl transition-all duration-300 hover:border-white/15 overflow-hidden"
        style={cardStyle}
      >
        {verificationSentTo ? (
          /* --- CHECK YOUR EMAIL --- */
          <div className="text-center py-2">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h2 className="font-serif text-3xl font-medium tracking-tight text-[var(--text)]">Check your email</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
              We sent a confirmation link to{' '}
              <span className="font-semibold text-[var(--text)]">{verificationSentTo}</span>.
              Click it to activate your account, then sign in.
            </p>
            <a
              href="/signin"
              onClick={(e) => toggleMode(e, 'signin')}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--text)] py-2.5 text-sm font-semibold text-[var(--bg-base)] transition-all hover:opacity-90 active:scale-[0.99]"
            >
              Go to sign in
            </a>
            <p className="mt-5 text-xs text-[var(--text-faint)]">
              Didn&apos;t get it?{' '}
              <button type="button" onClick={handleResendVerification} className="font-semibold text-[var(--text)] hover:underline">
                Resend email
              </button>
            </p>
          </div>
        ) : (
        <div className="relative grid" style={{ gridTemplateColumns: '1fr' }}>

          {/* --- LOADING OVERLAY --- */}
          <div 
            className={`col-start-1 row-start-1 flex flex-col items-center justify-center transition-all duration-500 z-50 ${
              isLoading || isOAuthLoading ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <NibLogoSpinner size={28} label="Authenticating" />
          </div>

          {/* --- SIGN IN FORM --- */}
          <div 
            className={`col-start-1 row-start-1 transition-all duration-[700ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${
              isSignIn && !isLoading && !isOAuthLoading ? 'opacity-100 translate-x-0 z-10 pointer-events-auto' : 'opacity-0 -translate-x-12 z-0 pointer-events-none'
            }`}
          >
          <div className="mb-6 text-center">
            <h2 className="font-serif text-3xl font-medium tracking-tight text-[var(--text)]">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              Sign in to access your grounded document insights.
            </p>
          </div>

          {error && isSignIn && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3.5 py-3 text-xs text-[oklch(0.8_0.12_25)]">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e, 'signin')} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                tabIndex={isSignIn ? 0 : -1}
                disabled={!isSignIn || isLoading || isOAuthLoading}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-white/20 outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
                placeholder="you@domain.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
                  Password
                </label>
                <a href="#" tabIndex={isSignIn ? 0 : -1} className="text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                tabIndex={isSignIn ? 0 : -1}
                disabled={!isSignIn || isLoading || isOAuthLoading}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-white/20 outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              tabIndex={isSignIn ? 0 : -1}
              disabled={!isSignIn || isLoading || isOAuthLoading}
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-[var(--text)] py-2.5 text-sm font-semibold text-[var(--bg-base)] transition-all hover:opacity-90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--bg-base)] px-2 text-[var(--text-faint)]">or</span>
            </div>
          </div>

          <OAuthButton provider="google" onClick={handleGoogleLogin} isLoading={isOAuthLoading} />

          <div className="mt-6 text-center text-xs text-[var(--text-dim)]">
            Don&apos;t have an account?{' '}
            <a 
              href="/signup" 
              onClick={(e) => toggleMode(e, 'signup')}
              tabIndex={isSignIn ? 0 : -1}
              className="font-semibold text-[var(--text)] hover:underline"
            >
              Create one
            </a>
          </div>
        </div>

          {/* --- SIGN UP FORM --- */}
          <div 
            className={`col-start-1 row-start-1 transition-all duration-[700ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${
              isSignUp && !isLoading && !isOAuthLoading ? 'opacity-100 translate-x-0 z-10 pointer-events-auto' : 'opacity-0 translate-x-12 z-0 pointer-events-none'
            }`}
          >
          <div className="mb-6 text-center">
            <h2 className="font-serif text-3xl font-medium tracking-tight text-[var(--text)]">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              Get started with a professional reading workspace.
            </p>
          </div>

          {error && isSignUp && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3.5 py-3 text-xs text-[oklch(0.8_0.12_25)]">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e, 'signup')} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
                Full name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                tabIndex={isSignUp ? 0 : -1}
                disabled={!isSignUp || isLoading || isOAuthLoading}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-white/20 outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
                placeholder="First Last"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                tabIndex={isSignUp ? 0 : -1}
                disabled={!isSignUp || isLoading || isOAuthLoading}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-white/20 outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
                placeholder="you@domain.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                tabIndex={isSignUp ? 0 : -1}
                disabled={!isSignUp || isLoading || isOAuthLoading}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-white/20 outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                tabIndex={isSignUp ? 0 : -1}
                disabled={!isSignUp || isLoading || isOAuthLoading}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-white/20 outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              tabIndex={isSignUp ? 0 : -1}
              disabled={!isSignUp || isLoading || isOAuthLoading}
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-[var(--text)] py-2.5 text-sm font-semibold text-[var(--bg-base)] transition-all hover:opacity-90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? 'Registering...' : 'Create account'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--bg-base)] px-2 text-[var(--text-faint)]">or</span>
            </div>
          </div>

          <OAuthButton provider="google" onClick={handleGoogleLogin} isLoading={isOAuthLoading} />

          <div className="mt-6 text-center text-xs text-[var(--text-dim)]">
            Already have an account?{' '}
            <a 
              href="/signin" 
              onClick={(e) => toggleMode(e, 'signin')}
              tabIndex={isSignUp ? 0 : -1}
              className="font-semibold text-[var(--text)] hover:underline"
            >
              Sign in
            </a>
          </div>
          </div>
        </div>
        )}

      </div>
    </>
  );
}
