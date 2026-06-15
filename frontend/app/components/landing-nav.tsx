'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NibLogo } from './nib-logo';
import { useAuth } from '../features/auth/hooks/use-auth';
import { AnimatedThemeToggle } from '@/components/ui/animated-theme-toggle';

export const NibMark = () => (
  <div className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[var(--text)] text-[var(--bg-base)]">
    <NibLogo size={16} />
  </div>
);

const NAV_LINKS = [
  { label: 'Product', id: 'product' },
  { label: 'Citations', id: 'how' },
  { label: 'Pricing', id: 'pricing' },
];

export function LandingNav() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', `#${id}`);
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-faint)',
      }}
    >
      <div
        className="grid items-center gap-4 px-4 sm:gap-8 sm:px-8 py-[18px]"
        style={{
          gridTemplateColumns: 'auto 1fr auto',
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
        }}
      >
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 no-underline" style={{ color: 'inherit' }}>
          <NibMark />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Nib</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex gap-7 justify-center text-sm text-[var(--text-dim)]">
          {NAV_LINKS.map(({ label, id }) => (
            <a
              key={label}
              href={`#${id}`}
              onClick={(e) => handleSectionClick(e, id)}
              className="hover:text-[var(--text)] transition-colors no-underline"
              style={{ color: 'inherit' }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Right side — always pinned to the 3rd grid column */}
        <div className="flex items-center gap-2 sm:gap-3.5" style={{ gridColumn: 3 }}>
          {user ? (
            <Link
              href="/home"
              className="inline-flex items-center gap-2 rounded-[9px] px-3 sm:px-4 py-2 text-sm font-medium no-underline transition-colors border-none"
              style={{ background: 'var(--text)', color: 'var(--bg-base)' }}
            >
              Workspace
            </Link>
          ) : (
            <>
              <Link href="/signin" className="hidden sm:block text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors no-underline">Sign in</Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-[9px] px-3 sm:px-4 py-2 text-sm font-medium no-underline transition-colors border-none"
                style={{ background: 'var(--text)', color: 'var(--bg-base)' }}
              >
                Try Nib free
              </Link>
            </>
          )}
          <AnimatedThemeToggle />
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)] transition-colors"
          >
            {mobileMenuOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div
          className="md:hidden px-4 pb-4 flex flex-col gap-1"
          style={{ borderTop: '1px solid var(--border-faint)', background: 'var(--bg-base)' }}
        >
          {NAV_LINKS.map(({ label, id }) => (
            <a
              key={label}
              href={`#${id}`}
              onClick={(e) => handleSectionClick(e, id)}
              className="block rounded-lg px-3 py-2.5 text-sm text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)] transition-colors no-underline"
            >
              {label}
            </a>
          ))}
          {!user && (
            <Link
              href="/signin"
              className="block rounded-lg px-3 py-2.5 text-sm text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)] transition-colors no-underline"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
