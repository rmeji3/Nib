'use client';

import Link from 'next/link';
import { useAuth } from '../features/auth/hooks/use-auth';
import { ArrowRight } from './landing-shared';

export function LandingCTA() {
  const { user } = useAuth();
  return (
    <>
      {/* -- CTA -- */}
      <section className="relative text-center w-full py-16 md:py-[120px]">
        <div className="absolute inset-0 pointer-events-none -z-[1]" style={{ background: 'radial-gradient(circle at 30% 50%,var(--accent-glow-a),transparent 55%),radial-gradient(circle at 70% 50%,var(--accent-glow-b),transparent 55%)', filter: 'blur(80px)', opacity: 0.18 }} />
        <div className="px-4 sm:px-8" style={{ maxWidth: 880, margin: '0 auto' }}>
          <h2 className="font-medium tracking-[-0.025em] m-0 mb-[18px]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.05, textWrap: 'balance' } as React.CSSProperties}>
            Read the dense&nbsp;stuff.<br />Trust the&nbsp;answer.
          </h2>
          <p className="text-[17px] m-0 mb-8" style={{ color: 'var(--text-dim)' }}>Open Nib with a sample whitepaper loaded. No sign-up.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href={user ? "/file" : "/signup"} className="inline-flex items-center gap-2 rounded-[9px] px-5 py-3 text-[15px] font-medium no-underline" style={{ background: 'var(--text)', color: 'var(--bg-base)' }}>
              Open the reader <ArrowRight />
            </Link>
            <a href="#" className="inline-flex items-center gap-2 rounded-[9px] px-5 py-3 text-[15px] font-medium no-underline" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              Read the security overview
            </a>
          </div>
        </div>
      </section>

    </>
  );
}
