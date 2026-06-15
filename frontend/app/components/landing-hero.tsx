'use client';

import Link from 'next/link';
import { useAuth } from '../features/auth/hooks/use-auth';
import { ArrowRight } from './landing-shared';
import { NibLogo } from './nib-logo';
import { OcrBlockButton, type OcrBlock } from '../../components/ui/layout-blocks';

export function LandingHero() {
  const { user } = useAuth();
  return (
    <>
      {/* -- Hero -- */}
      <header className="relative w-full pt-[60px] pb-20">
        {/* Glow blobs */}
        <div className="absolute overflow-hidden pointer-events-none z-0" style={{ inset: '-40px 0 0' }} aria-hidden>
          <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 760, height: 760, filter: 'blur(110px)', background: 'radial-gradient(circle,var(--accent-glow-a),transparent 60%)', top: -220, left: -180, '--hero-glow-min': 0.32, '--hero-glow-max': 0.62, '--hero-glow-dur': '20s', '--hero-glow-delay': '0s', '--hero-drift-x': '360px', '--hero-drift-y': '240px', '--hero-drift-y2': '90px' } as React.CSSProperties} />
          <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 760, height: 760, filter: 'blur(110px)', background: 'radial-gradient(circle,var(--accent-glow-b),transparent 60%)', top: -140, right: -220, '--hero-glow-min': 0.28, '--hero-glow-max': 0.56, '--hero-glow-dur': '24s', '--hero-glow-delay': '-6s', '--hero-drift-x': '-420px', '--hero-drift-y': '300px', '--hero-drift-y2': '-130px' } as React.CSSProperties} />
          <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 700, height: 700, filter: 'blur(110px)', background: 'radial-gradient(circle,var(--accent-glow-d),transparent 60%)', top: 180, left: '8%', '--hero-glow-min': 0.24, '--hero-glow-max': 0.52, '--hero-glow-dur': '27s', '--hero-glow-delay': '-12s', '--hero-drift-x': '440px', '--hero-drift-y': '-260px', '--hero-drift-y2': '200px' } as React.CSSProperties} />
          <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 660, height: 660, filter: 'blur(110px)', background: 'radial-gradient(circle,var(--accent-glow-e),transparent 60%)', top: 200, right: '6%', '--hero-glow-min': 0.2, '--hero-glow-max': 0.46, '--hero-glow-dur': '22s', '--hero-glow-delay': '-9s', '--hero-drift-x': '-340px', '--hero-drift-y': '-220px', '--hero-drift-y2': '180px' } as React.CSSProperties} />
          <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 620, height: 620, filter: 'blur(120px)', background: 'radial-gradient(circle,var(--accent-glow-f),transparent 60%)', top: 60, left: '38%', '--hero-glow-min': 0.18, '--hero-glow-max': 0.42, '--hero-glow-dur': '26s', '--hero-glow-delay': '-4s', '--hero-drift-x': '320px', '--hero-drift-y': '340px', '--hero-drift-y2': '-240px' } as React.CSSProperties} />
          <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 640, height: 640, filter: 'blur(115px)', background: 'radial-gradient(circle,var(--accent-glow-g),transparent 60%)', top: -80, left: '20%', '--hero-glow-min': 0.2, '--hero-glow-max': 0.48, '--hero-glow-dur': '23s', '--hero-glow-delay': '-15s', '--hero-drift-x': '-300px', '--hero-drift-y': '280px', '--hero-drift-y2': '-160px' } as React.CSSProperties} />
          <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 600, height: 600, filter: 'blur(115px)', background: 'radial-gradient(circle,var(--accent-glow-h),transparent 60%)', top: 120, right: '24%', '--hero-glow-min': 0.18, '--hero-glow-max': 0.44, '--hero-glow-dur': '29s', '--hero-glow-delay': '-18s', '--hero-drift-x': '380px', '--hero-drift-y': '-300px', '--hero-drift-y2': '220px' } as React.CSSProperties} />
          <div className="hero-glow-blob absolute rounded-full mix-blend-screen" style={{ width: 580, height: 580, filter: 'blur(120px)', background: 'radial-gradient(circle,var(--accent-glow-i),transparent 60%)', top: -160, right: '34%', '--hero-glow-min': 0.16, '--hero-glow-max': 0.4, '--hero-glow-dur': '31s', '--hero-glow-delay': '-7s', '--hero-drift-x': '-360px', '--hero-drift-y': '320px', '--hero-drift-y2': '-200px' } as React.CSSProperties} />
        </div>

        <div className="px-4 sm:px-8" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          {/* Inner */}
          <div className="relative z-[1] max-w-[880px] mx-auto text-center pt-10 pb-7">
            <h1 className="m-0 mb-[22px] font-medium tracking-[-0.025em]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(40px,6vw,76px)', lineHeight: 1.05, textWrap: 'balance' } as React.CSSProperties}>
              The PDF reader that actually reads&nbsp;back.
            </h1>

            <p className="mx-auto mb-8 m-0 text-[var(--text-dim)]" style={{ fontSize: 'clamp(16px,1.6vw,19px)', lineHeight: 1.5, maxWidth: 640, textWrap: 'pretty' } as React.CSSProperties}>
              A calm, professional document reader with a research-grade AI built in.
              Ask anything (about a chart, a table, or a buried footnote)
              and get answers grounded in the exact page, with citations you can click to verify.
            </p>

            <div className="flex gap-3 justify-center mb-7 flex-wrap">
              <Link href={user ? "/file" : "/signup"} className="inline-flex items-center gap-2 rounded-[9px] px-5 py-3 text-[15px] font-medium no-underline transition-colors" style={{ background: 'var(--text)', color: 'var(--bg-base)' }}>
                Open the reader <ArrowRight />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 rounded-[9px] px-5 py-3 text-[15px] font-medium no-underline" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                See how it works
              </a>
            </div>

            <div className="text-[13px] text-[var(--text-faint)]">
              <b className="font-medium" style={{ color: 'var(--text-dim)' }}>Never trains</b> on your documents
            </div>
          </div>

          {/* Product preview window */}
          <div className="relative z-[1] mt-8 mx-auto hidden sm:block" style={{ maxWidth: 1080, perspective: 1600 }}>
            <div
              className="overflow-hidden rounded-[14px]"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-window)',
                transform: 'rotateX(2deg)',
                transformOrigin: 'center top',
              }}
            >
              {/* Chrome bar */}
              <div className="grid items-center px-3.5 py-2.5" style={{ gridTemplateColumns: 'auto 1fr auto', borderBottom: '1px solid var(--border-faint)', background: 'rgba(255,255,255,0.015)' }}>
                <div className="flex gap-1.5">
                  {['oklch(0.62 0.16 25)', 'oklch(0.78 0.12 85)', 'oklch(0.74 0.13 145)'].map((c, i) => (
                    <span key={i} className="rounded-full" style={{ width: 10, height: 10, background: c }} />
                  ))}
                </div>
                <span className="text-center text-xs text-[var(--text-faint)]">nib.app/document/AdaptiveLiquidCooling.pdf</span>
                <span />
              </div>

              {/* Two-pane body */}
              <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr]" style={{ minHeight: 380 }}>
                {/* Paper side */}
                <div className="p-9 relative" style={{ background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font-doc)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[22px] font-semibold tracking-[-0.01em] m-0">Adaptive Liquid Cooling</div>
                  <div className="text-sm font-normal italic mb-4 mt-1" style={{ color: 'var(--ink-dim)' }}>for High-Density GPU Clusters</div>
                  <div className="text-[10px] mb-6" style={{ color: 'var(--ink-dim)' }}>R. Vasquez · K. Sato · M. Okonkwo · D. Liang</div>
                  <div className="text-[11px] leading-[1.55] px-3.5 py-2.5 mb-[18px]" style={{ borderLeft: '2px solid var(--ink-dim)', background: 'rgba(0,0,0,0.02)' }}>
                    Modern accelerator deployments routinely exceed 40&thinsp;kW per rack, with B200-class systems approaching{' '}
                    <span className="rounded-sm px-[2px]" style={{ background: 'rgba(245,184,110,0.32)', boxShadow: '0 0 0 1px rgba(245,184,110,0.5)' }}>80&thinsp;kW</span>
                    {' '}under sustained inference loads. We describe a hybrid rear-door + direct-to-chip liquid cooling architecture.
                  </div>
                  <div className="text-[13px] font-semibold mb-1.5">2. System Architecture</div>
                  <div className="text-[10.5px] leading-[1.55] mb-3.5" style={{ textAlign: 'justify', hyphens: 'auto' } as React.CSSProperties}>
                    The deployed topology is a two-stage loop. A primary facility loop carries water at 18–22&thinsp;°C from rooftop dry coolers to a row-end coolant distribution unit (CDU).
                  </div>
                  <div className="p-2" style={{ border: '1px solid var(--paper-line)', background: '#fbf8f0' }}>
                    <svg viewBox="0 0 240 100" width="100%" height="80">
                      <rect x="6" y="14" width="38" height="22" fill="#e2dccd" stroke="#5e574a" strokeWidth=".6" />
                      <rect x="100" y="38" width="48" height="28" fill="none" stroke="#5e574a" strokeWidth=".8" />
                      <rect x="190" y="20" width="42" height="60" fill="#f4f0e6" stroke="#5e574a" strokeWidth=".6" />
                      <path d="M44 22 Q72 22 100 50" stroke="#7d8aa8" strokeWidth=".9" fill="none" />
                      <path d="M44 30 Q72 30 100 60" stroke="#a85a4a" strokeWidth=".9" fill="none" strokeDasharray="2 2" />
                      <path d="M148 50 L190 40" stroke="#7d8aa8" strokeWidth=".9" fill="none" />
                      <path d="M148 60 L190 70" stroke="#a85a4a" strokeWidth=".9" fill="none" strokeDasharray="2 2" />
                      <text x="124" y="32" fontFamily="serif" fontSize="6" fill="#2a2620" textAnchor="middle" fontWeight="600">CDU</text>
                      <text x="25" y="46" fontFamily="serif" fontSize="5" fill="#5e574a" textAnchor="middle">Dry cooler</text>
                      <text x="211" y="94" fontFamily="serif" fontSize="5" fill="#5e574a" textAnchor="middle">Rack + RDHx</text>
                    </svg>
                    <div className="text-[9px] italic text-center mt-1" style={{ color: 'var(--ink-dim)' }}>Figure 1. Two-stage cooling loop.</div>
                  </div>
                </div>

                {/* Chat side */}
                <div className="hidden md:flex flex-col gap-3 p-[18px] pb-3.5" style={{ background: 'var(--bg-surface)' }}>
                  <div className="flex items-center gap-2 text-[13px] font-semibold mb-1">
                    Ask this document
                  </div>
                  <div className="msg msg-user">
                    <div className="msg-bubble !text-[13px] !max-w-[90%]">
                      What&apos;s the highest peak thermal load?
                    </div>
                  </div>
                  <div className="msg msg-assistant !max-w-full">
                    <div className="msg-byline flex items-center gap-[7px] text-[11.5px] font-medium text-[var(--text-faint)]">
                      <span className="msg-byline-logo" aria-hidden="true">
                        <NibLogo size={12} />
                      </span>
                      Nib Assistant
                    </div>
                    <div className="msg-bubble !text-[13px] !p-0">
                      Rack <strong>R6</strong> (8 x B200) reaches the highest peak load at{' '}
                      <strong>62.4 kW</strong>
                      <span className="cite-inline">1</span>
                      , exceeding the original 32 kW design budget by 95%.
                    </div>
                    <div className="mt-1 w-full max-w-[90%]">
                      <OcrBlockButton
                        block={{
                          id: '1',
                          type: 'table',
                          text: 'R6 · 8 x B200 · Peak 62.4 kW (Feb 28, 9-day window).',
                          page: 4,
                          pageWidth: 1,
                          pageHeight: 1,
                          confidence: 0.99
                        } as OcrBlock}
                        sourceNumber={1}
                        isActive={false}
                        onFocusBlock={() => {}}
                      />
                    </div>
                  </div>
                  <div className="mt-auto pt-2">
                    <div className="composer-inner group">
                      <div className="composer-input-beam-frame">
                        <div className="composer-input-box relative rounded-xl border border-[var(--border-strong)] bg-[var(--bg-base)]">
                          <div className="w-full resize-none bg-transparent px-3.5 pb-2 pr-11 pt-3 text-[13.5px] leading-[1.4] text-[var(--text-faint)] select-none">
                            Ask anything about this document…
                          </div>
                          <button className="send-btn absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-faint)]" disabled>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="22" y1="2" x2="11" y2="13"></line>
                              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
