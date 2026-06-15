'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../features/auth/hooks/use-auth';

const planFeatures: Record<string, string[]> = {
  Reader: ['50 pages per month', '3 active documents', 'Text & basic table extraction', 'Citations, inline only'],
  Professional: ['2,000 pages per month', 'Unlimited documents', 'Full multimodal extraction', 'All three citation styles', 'Confidence indicators & refusal', 'Export annotated PDFs'],
};

export function LandingPricing() {
  const { user } = useAuth();
  const router = useRouter();
  const [isProLoading, setIsProLoading] = useState(false);

  // Go Pro: logged-in users go straight to Stripe checkout; logged-out users are sent
  // to sign up (with a stored intent that resumes checkout after they verify + sign in).
  const handleGoPro = async () => {
    if (!user) {
      localStorage.setItem('nib_post_auth_intent', 'pro');
      router.push('/signup');
      return;
    }
    setIsProLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiUrl}/api/stripe/create-checkout-session`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      // Already Pro (or other error) — send them to the pricing/manage page.
      router.push('/settings/pricing');
    } catch {
      router.push('/settings/pricing');
    } finally {
      setIsProLoading(false);
    }
  };

  return (
    <>
      {/* -- Pricing -- */}
      <section id="pricing" className="w-full py-16 md:py-[100px]">
        <div className="px-4 sm:px-8" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          <div className="max-w-[720px] mx-auto mb-14 text-center">
            <div className="text-[12.5px] font-medium tracking-[0.06em] uppercase mb-4" style={{ color: 'var(--accent-text)' }}>Pricing</div>
            <h2 className="font-medium tracking-[-0.02em] m-0 mb-[18px]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.1, textWrap: 'balance' } as React.CSSProperties}>
              Honest pricing. No per-page surprises.
            </h2>
            <p className="text-[17px] leading-[1.55] m-0" style={{ color: 'var(--text-dim)' }}>Start free. Move up only when you need it.</p>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 max-w-[740px] mx-auto">
            {[
              { name: 'Reader',       price: '$0',  period: '/month',           tag: 'For curious individuals.',  featured: false, cta: 'Start free' },
              { name: 'Professional', price: '$12', period: '/month',           tag: 'For working researchers.',  featured: true,  cta: 'Go Pro' },
            ].map((plan) => (
              <div
                key={plan.name}
                className="flex flex-col gap-2 rounded-[14px] px-[26px] pb-6 pt-7 relative"
                style={{
                  background: plan.featured ? 'linear-gradient(180deg,var(--accent-soft),transparent 40%),var(--bg-surface)' : 'var(--bg-surface)',
                  border: `1px solid ${plan.featured ? 'var(--accent-line)' : 'var(--border-faint)'}`,
                  boxShadow: plan.featured ? '0 20px 50px -20px oklch(0.55 0.1 240/0.3)' : 'none',
                }}
              >
                {plan.featured && (
                  <span className="absolute -top-[10px] right-[22px] text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--accent-text)', color: 'var(--bg-base)' }}>
                    Most popular
                  </span>
                )}
                <div className="text-[20px] font-semibold tracking-[-0.01em]" style={{ fontFamily: 'var(--font-doc)' }}>{plan.name}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-medium tracking-[-0.025em]" style={{ fontFamily: 'var(--font-doc)', fontSize: 44 }}>{plan.price}</span>
                  <small className="text-[13px]" style={{ color: 'var(--text-faint)' }}>{plan.period}</small>
                </div>
                <div className="text-[13.5px] mb-3.5" style={{ color: 'var(--text-dim)' }}>{plan.tag}</div>
                <ul className="list-none p-0 m-0 mb-[22px] flex flex-col gap-2.5 flex-1">
                  {planFeatures[plan.name].map((f) => (
                    <li key={f} className="text-sm pl-[22px] relative" style={{ color: 'var(--text-dim)' }}>
                      <svg className="absolute left-0 top-[3px]" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#86b8d0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7.2 5.8 10 11 4.2" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.featured ? (
                  <button
                    onClick={handleGoPro}
                    disabled={isProLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-medium no-underline transition-colors mt-auto disabled:opacity-60 disabled:cursor-wait"
                    style={{ background: 'var(--text)', color: 'var(--bg-base)' }}
                  >
                    {isProLoading ? 'Redirecting…' : plan.cta}
                  </button>
                ) : (
                  <Link
                    href={user ? "/home" : "/signup"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-medium no-underline transition-colors mt-auto"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
