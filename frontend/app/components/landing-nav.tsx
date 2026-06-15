'use client';

import Link from 'next/link';
import { NibLogo } from './nib-logo';
import { useAuth } from '../features/auth/hooks/use-auth';
import { AnimatedThemeToggle } from '@/components/ui/animated-theme-toggle';

export const NibMark = () => (
  <div className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[var(--text)] text-[var(--bg-base)]">
    <NibLogo size={16} />
  </div>
);

export function LandingNav() {
  const { user } = useAuth();

  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', `#${id}`);
    }
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
        className="grid items-center gap-8 px-8 py-[18px]"
        style={{
          gridTemplateColumns: 'auto 1fr auto',
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
        }}
      >
        <Link href="/" className="inline-flex items-center gap-2 no-underline" style={{ color: 'inherit' }}>
          <NibMark />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Nib</span>
        </Link>
        <div className="hidden md:flex gap-7 justify-center text-sm text-[var(--text-dim)]">
          {['Product', 'Citations', 'Pricing'].map((l, i) => {
            const id = ['product', 'how', 'pricing'][i];
            return (
              <a key={l} href={`#${id}`} onClick={(e) => handleSectionClick(e, id)} className="hover:text-[var(--text)] transition-colors no-underline" style={{ color: 'inherit' }}>{l}</a>
            );
          })}
        </div>
        <div className="flex items-center gap-3.5">
          {user ? (
            <>
              <Link
                href="/home"
                className="inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-sm font-medium no-underline transition-colors border-none"
                style={{ background: 'var(--text)', color: 'var(--bg-base)' }}
              >
                Workspace
              </Link>
            </>
          ) : (
            <>
              <Link href="/signin" className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors no-underline">Sign in</Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-sm font-medium no-underline transition-colors border-none"
                style={{ background: 'var(--text)', color: 'var(--bg-base)' }}
              >
                Try Nib free
              </Link>
            </>
          )}
          <AnimatedThemeToggle />
        </div>
      </div>
    </nav>
  );
}
