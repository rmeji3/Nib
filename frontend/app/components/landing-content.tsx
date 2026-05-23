'use client';

import { useState } from 'react';
import Link from 'next/link';

import { NibLogo } from './nib-logo';
import { useAuth } from '../features/auth/hooks/use-auth';

const NibMark = () => (
  <div className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[var(--text)] text-[var(--bg-base)]">
    <NibLogo size={16} />
  </div>
);

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);


const mmRows = [
  { tag: 'TEXT',    tagCls: 'text-[oklch(0.85_0.04_240)] bg-[oklch(0.4_0.05_240/0.25)]', name: 'Section 2.1 Heat-Path Split',                 meta: 'p.3 · 8 sentences' },
  { tag: 'TABLE',   tagCls: 'text-[oklch(0.86_0.09_150)] bg-[oklch(0.4_0.08_150/0.25)]', name: 'Per-rack thermal envelopes',            meta: 'p.4 · 6 rows x 6 cols' },
  { tag: 'CHART',   tagCls: 'text-[oklch(0.86_0.1_60)]   bg-[oklch(0.4_0.08_60/0.25)]',  name: 'Throughput vs. flow rate',             meta: 'p.5 · 2 series' },
  { tag: 'FIGURE',  tagCls: 'text-[oklch(0.85_0.09_310)] bg-[oklch(0.4_0.08_310/0.25)]', name: 'Two-stage cooling loop',               meta: 'p.3 · schematic' },
  { tag: 'CAPTION', tagCls: 'text-[oklch(0.82_0.05_30)]  bg-[oklch(0.4_0.06_30/0.25)]',  name: '"Figure 1: Two-stage cooling loop..."', meta: 'p.3 · refs Section 2' },
  { tag: 'TEXT',    tagCls: 'text-[oklch(0.85_0.04_240)] bg-[oklch(0.4_0.05_240/0.25)]', name: '5. Conclusion',                        meta: 'p.6 · 4 sentences' },
];

const planFeatures: Record<string, string[]> = {
  Reader: ['50 pages per month', '3 active documents', 'Text & basic table extraction', 'Citations, inline only'],
  Professional: ['2,000 pages per month', 'Unlimited documents', 'Full multimodal extraction', 'All three citation styles', 'Confidence indicators & refusal', 'Export annotated PDFs'],
  Team: ['Everything in Professional', 'Shared document libraries', 'SSO & SCIM'],
};

export default function LandingPage() {
  const [activeCite, setActiveCite] = useState<number | null>(null);
  const { user } = useAuth();

  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '15.5px', lineHeight: 1.5, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>

      {/* -- Nav -- */}
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
          <a href="#" className="inline-flex items-center gap-2 no-underline" style={{ color: 'inherit' }}>
            <NibMark />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">Nib</span>
          </a>
          <div className="hidden md:flex gap-7 justify-center text-sm text-[var(--text-dim)]">
            {['Product', 'Citations', 'Pricing', 'Changelog'].map((l, i) => (
              <a key={l} href={['#product', '#how', '#pricing', '#changelog'][i]} className="hover:text-[var(--text)] transition-colors no-underline" style={{ color: 'inherit' }}>{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3.5">
            {user ? (
              <Link
                href="/home"
                className="inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-sm font-medium no-underline transition-colors border-none"
                style={{ background: 'var(--text)', color: 'var(--bg-base)' }}
              >
                Workspace
              </Link>
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
          </div>
        </div>
      </nav>

      {/* -- Hero -- */}
      <header className="relative w-full pt-[60px] pb-20">
        {/* Glow blobs */}
        <div className="absolute overflow-hidden pointer-events-none z-0" style={{ inset: '-40px 0 0' }} aria-hidden>
          <div className="absolute rounded-full mix-blend-screen" style={{ width: 720, height: 720, filter: 'blur(120px)', opacity: 0.32, background: 'radial-gradient(circle,var(--accent-glow-a),transparent 60%)', top: -200, left: -160 }} />
          <div className="absolute rounded-full mix-blend-screen" style={{ width: 720, height: 720, filter: 'blur(120px)', opacity: 0.28, background: 'radial-gradient(circle,var(--accent-glow-b),transparent 60%)', top: -120, right: -200 }} />
          <div className="absolute rounded-full mix-blend-screen" style={{ width: 720, height: 720, filter: 'blur(120px)', opacity: 0.22, background: 'radial-gradient(circle,var(--accent-glow-c),transparent 60%)', top: 240, left: '30%' }} />
        </div>

        <div className="px-8" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
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
          <div className="relative z-[1] mt-8 mx-auto" style={{ maxWidth: 1080, perspective: 1600 }}>
            <div
              className="overflow-hidden rounded-[14px]"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04),0 50px 100px -40px rgba(0,0,0,0.7),0 24px 60px -24px rgba(120,130,200,0.18)',
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
                <span className="text-center text-xs text-[var(--text-faint)]">nib.app/d/hl-tr-2025-014</span>
                <span />
              </div>

              {/* Two-pane body */}
              <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', minHeight: 480 }}>
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
                <div className="flex flex-col gap-3 p-[18px] pb-3.5" style={{ background: 'var(--bg-surface)' }}>
                  <div className="flex items-center gap-2 text-[13px] font-semibold mb-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'oklch(0.78 0.13 160)', boxShadow: '0 0 8px oklch(0.78 0.13 160)' }} />
                    Ask this document
                  </div>
                  <div className="self-end max-w-[90%] text-[13px] rounded-xl rounded-br-[4px] px-3 py-2.5" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}>
                    What&apos;s the highest peak thermal load?
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="inline-flex items-center gap-[7px] text-[11.5px] font-medium text-[var(--text-faint)]">
                      <span className="rounded-[2px] inline-block" style={{ width: 7, height: 7, background: 'var(--text-dim)' }} />
                      Nib
                    </div>
                    <div className="text-[13px] leading-[1.5]">
                      Rack <strong>R6</strong> (8 x B200) reaches the highest peak load at{' '}
                      <strong>62.4 kW</strong>
                      <span className="inline-flex items-center justify-center rounded-[4px] px-1 text-[10.5px] font-semibold mx-0.5 align-[1px]" style={{ minWidth: 16, height: 16, background: 'var(--citation-soft)', border: '1px solid var(--citation-line)', color: 'var(--citation-text)' }}>1</span>
                      , exceeding the original 32 kW design budget by 95%.
                    </div>
                    <div className="grid items-center gap-2.5 px-2.5 py-2 rounded-lg" style={{ gridTemplateColumns: 'auto 1fr auto', background: 'var(--bg-base)', border: '1px solid var(--border-faint)', color: 'var(--text-faint)' }}>
                      <span className="inline-flex items-center justify-center rounded-[5px] text-xs font-semibold" style={{ width: 22, height: 22, background: 'var(--citation-soft)', color: 'var(--citation-text)' }}>1</span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-[12.5px] font-medium" style={{ color: 'var(--text)' }}>Table 1, p.4</span>
                        <span className="text-[11.5px] overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontFamily: 'var(--font-doc)', color: 'var(--text-dim)' }}>R6 · 8 x B200 · Peak 62.4 kW (Feb 28, 9-day window).</span>
                      </span>
                      <ArrowRight />
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[13px]" style={{ border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-faint)' }}>
                    <span>Ask a follow-up...</span>
                    <span className="inline-flex items-center justify-center rounded-[6px] text-[11px]" style={{ width: 22, height: 22, background: 'var(--text)', color: 'var(--bg-base)' }}>↵</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* -- Features & Citations Showcase -- */}
      <section id="product" className="w-full py-24 border-y border-white/5 relative bg-[linear-gradient(180deg,rgba(17,20,26,0.2)_0%,transparent_100%)]">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scanline {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .animate-scan {
            animation: scanline 5s linear infinite;
          }
          @keyframes float-slower {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          .animate-float {
            animation: float-slower 6s ease-in-out infinite;
          }
        `}} />

        <div className="px-8" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          
          {/* Section Header */}
          <div className="max-w-[720px] mx-auto mb-20 text-center">
            <div className="text-[12.5px] font-medium tracking-[0.06em] uppercase mb-4" style={{ color: 'var(--accent-text)' }}>Why Nib</div>
            <h2 className="font-medium tracking-[-0.02em] m-0 mb-[18px]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.1, textWrap: 'balance' } as React.CSSProperties}>
              Built for documents that actually matter.
            </h2>
            <p className="text-[17px] leading-[1.55] m-0" style={{ color: 'var(--text-dim)' }}>
              Research papers, financial filings, technical specs, contracts. Anything where getting the wrong answer is worse than no answer at all.
            </p>
          </div>

          {/* Alternating Feature Rows */}
          <div className="flex flex-col gap-28">

            {/* Row 1: Sees charts, tables & figures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div className="flex flex-col gap-4">
                <div className="text-xs font-bold tracking-wider text-[var(--accent-text)] uppercase">01 · Multimodal Processing</div>
                <h3 className="m-0 font-semibold tracking-[-0.01em] text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-doc)' }}>
                  Sees charts, tables & figures
                </h3>
                <p className="text-[15.5px] leading-[1.6] m-0 text-[var(--text-dim)]">
                  Most PDF chat tools embed only extracted text and hallucinate the rest. Nib runs vision extraction over every visual block—including chart axes, table cells, and figure captions—and grounds answers in what's actually drawn on the page.
                </p>
                <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-3">
                  {[
                    ['Visual Bounding Boxes', 'Maps paragraphs, tables, and figures directly to pixel coordinates on the page.'],
                    ['Structured Grid Recognition', 'Reads complex multi-column layouts and tabular cells without reflow corruption.']
                  ].map(([title, desc]) => (
                    <li key={title} className="flex gap-3 text-sm leading-[1.5] text-[var(--text-dim)]">
                      <span className="relative rounded-[4px] shrink-0 w-4 h-4 mt-0.5 bg-[var(--accent-soft)] border border-[var(--accent-line)]">
                        <span className="absolute rounded-[1.5px] inset-0.5 bg-[var(--accent-text)]" />
                      </span>
                      <span>
                        <strong className="font-semibold text-[var(--text)]">{title}: </strong>
                        {desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual mockup for Row 1 */}
              <div className="relative aspect-[4/3] w-full max-w-[480px] mx-auto rounded-xl border border-white/10 bg-[var(--bg-surface)] p-5 shadow-2xl flex flex-col justify-between overflow-hidden animate-float">
                {/* Simulated scan line */}
                <div className="absolute left-0 w-full h-[2px] bg-[var(--accent)] shadow-[0_0_10px_var(--accent)] opacity-60 animate-scan z-10" />
                
                {/* Replicated page content */}
                <div className="rounded-lg bg-[var(--paper)] text-[var(--ink)] p-5 h-full flex flex-col gap-3 relative shadow-inner overflow-hidden select-none">
                  <div className="h-2 w-1/3 bg-[var(--ink-dim)]/20 rounded mb-1" />
                  <div className="flex flex-col gap-1.5">
                    <div className="h-1.5 w-full bg-[var(--ink-dim)]/10 rounded" />
                    <div className="h-1.5 w-full bg-[var(--ink-dim)]/10 rounded" />
                    <div className="h-1.5 w-5/6 bg-[var(--ink-dim)]/10 rounded" />
                  </div>

                  {/* Simulated Table Block */}
                  <div className="relative border border-[var(--paper-line)] bg-white/40 p-2.5 rounded-md mt-1 border-dashed">
                    {/* Bounding box marker */}
                    <div className="absolute inset-0 border border-[var(--accent)] bg-[var(--accent-soft)]/20 z-0" />
                    <span className="absolute -top-[9px] -left-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-[var(--accent-text)] text-[var(--bg-base)] z-20 shadow-sm">
                      TABLE 1
                    </span>
                    <div className="relative z-10 flex flex-col gap-1">
                      <div className="grid grid-cols-3 gap-2 border-b border-[var(--paper-line)] pb-1 font-mono text-[7px] text-[var(--ink-dim)]">
                        <span>RACK</span>
                        <span>LOAD (PEAK)</span>
                        <span>STATUS</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-mono text-[6.5px] text-[var(--ink)]">
                        <span>R4 (H200)</span>
                        <span>38.2 kW</span>
                        <span className="text-[var(--success)]">Nominal</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-mono text-[6.5px] text-[var(--ink)]">
                        <span className="font-bold">R6 (B200)</span>
                        <span className="font-bold">62.4 kW</span>
                        <span className="text-[var(--danger)] font-bold">Surge</span>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Text Paragraph */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="h-1.5 w-full bg-[var(--ink-dim)]/10 rounded" />
                    <div className="h-1.5 w-3/4 bg-[var(--ink-dim)]/10 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Citations you can click */}
            <div id="how" className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
              {/* Visual mockup for Row 2 (the interactive Citation cards) */}
              <div className="order-2 md:order-1 relative aspect-[4/3] w-full max-w-[480px] mx-auto rounded-xl border border-white/10 bg-[var(--bg-surface)] p-5 shadow-2xl flex flex-col justify-center overflow-hidden">
                <div className="flex flex-col gap-4">
                  {/* Assistant response mockup */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-[7px] text-[11px] font-medium text-[var(--text-faint)]">
                      <span className="rounded-[2px] inline-block w-1.5 h-1.5 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                      Nib Assistant
                    </div>
                    <div className="text-[13.5px] leading-[1.55] text-[var(--text)] rounded-xl border border-white/5 bg-[var(--bg-base)] p-4">
                      Rack <strong className="text-[var(--text)]">R6 (8 × B200)</strong> reaches the highest peak thermal load at{' '}
                      <strong className="text-[var(--text)]">62.4 kW</strong>
                      <span
                        className={`inline-flex items-center justify-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold mx-1 align-[1.5px] cursor-pointer transition-all duration-150 ${activeCite === 1 ? 'scale-110 bg-[var(--citation-text)] text-[var(--bg-base)] ring-2 ring-[var(--citation)]' : 'bg-[var(--citation-soft)] border border-[var(--citation-line)] text-[var(--citation-text)]'}`}
                        onMouseEnter={() => setActiveCite(1)}
                        onMouseLeave={() => setActiveCite(null)}
                      >
                        1
                      </span>.
                      The H200 racks top out at{' '}
                      <strong>38.2 kW</strong>
                      <span
                        className={`inline-flex items-center justify-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold mx-1 align-[1.5px] cursor-pointer transition-all duration-150 ${activeCite === 2 ? 'scale-110 bg-[var(--citation-text)] text-[var(--bg-base)] ring-2 ring-[var(--citation)]' : 'bg-[var(--citation-soft)] border border-[var(--citation-line)] text-[var(--citation-text)]'}`}
                        onMouseEnter={() => setActiveCite(2)}
                        onMouseLeave={() => setActiveCite(null)}
                      >
                        2
                      </span>, which is still inside the silicon throttle threshold.
                    </div>
                  </div>

                  {/* Combined citation cards below */}
                  <div className="flex flex-col gap-2">
                    {[
                      { idx: 1, label: 'Table 1, p.4', snippet: 'R6 · 8 x B200 · Peak 62.4 kW (commissioned Feb 28, 9-day window).' },
                      { idx: 2, label: '§3, p.4', snippet: 'R6 exceeds the original 32 kW per-rack design budget by 95%...' }
                    ].map((cite) => (
                      <div
                        key={cite.idx}
                        className={`grid gap-3 items-center rounded-lg border px-3 py-2.5 transition-all duration-200 cursor-pointer ${activeCite === cite.idx ? 'border-[var(--citation-line)] bg-[var(--citation-soft)]/20 scale-[1.01]' : 'border-white/5 bg-[var(--bg-base)]/40 hover:bg-[var(--bg-base)]'}`}
                        style={{ gridTemplateColumns: 'auto 1fr auto' }}
                        onMouseEnter={() => setActiveCite(cite.idx)}
                        onMouseLeave={() => setActiveCite(null)}
                      >
                        <span className={`inline-flex items-center justify-center rounded-[5px] text-xs font-semibold w-6 h-6 transition-colors duration-150 ${activeCite === cite.idx ? 'bg-[var(--citation-text)] text-[var(--bg-base)]' : 'bg-[var(--citation-soft)] text-[var(--citation-text)]'}`}>
                          {cite.idx}
                        </span>
                        <span className="flex flex-col min-w-0">
                          <span className="text-[12.5px] font-medium text-[var(--text)]">{cite.label}</span>
                          <span className="text-xs text-[var(--text-dim)] overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontFamily: 'var(--font-doc)' }}>
                            {cite.snippet}
                          </span>
                        </span>
                        <ArrowRight />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Text for Row 2 */}
              <div className="order-1 md:order-2 flex flex-col gap-4">
                <div className="text-xs font-bold tracking-wider text-[var(--accent-text)] uppercase">02 · Grounded Proof</div>
                <h3 className="m-0 font-semibold tracking-[-0.01em] text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-doc)' }}>
                  Citations you can click
                </h3>
                <p className="text-[15.5px] leading-[1.6] m-0 text-[var(--text-dim)]">
                  Every claim points back to a block on a page. Click the chip inside the text bubble to immediately jump to the exact paragraph, table row, or figure region. Skim the source card for verification, and trust the reading flow.
                </p>
                <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-3">
                  {[
                    ['Provenance Mapping', 'Pointers map directly to document coordinates, showing you where text, tables, and captions reside.'],
                    ['Contextual Snippets', 'Hovering over citation markers displays the source text instantly without switching views.']
                  ].map(([title, desc]) => (
                    <li key={title} className="flex gap-3 text-sm leading-[1.5] text-[var(--text-dim)]">
                      <span className="relative rounded-[4px] shrink-0 w-4 h-4 mt-0.5 bg-[var(--accent-soft)] border border-[var(--accent-line)]">
                        <span className="absolute rounded-[1.5px] inset-0.5 bg-[var(--accent-text)]" />
                      </span>
                      <span>
                        <strong className="font-semibold text-[var(--text)]">{title}: </strong>
                        {desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Row 3: Refuses to guess */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div className="flex flex-col gap-4">
                <div className="text-xs font-bold tracking-wider text-[var(--accent-text)] uppercase">03 · Active Alignment</div>
                <h3 className="m-0 font-semibold tracking-[-0.01em] text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-doc)' }}>
                  Refuses to guess
                </h3>
                <p className="text-[15.5px] leading-[1.6] m-0 text-[var(--text-dim)]">
                  When evidence is thin, Nib says so. A confidence indicator shows you when the model would be reaching, and the UI prompts you to narrow the question instead of fabricating a guess.
                </p>
                <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-3">
                  {[
                    ['Evidence Gating', 'Declines to generate claims when direct corroborative source passages are missing.'],
                    ['Alternative Guidance', 'Instead of fabricating an answer, the interface suggests valid queries within adjacent indexing blocks.']
                  ].map(([title, desc]) => (
                    <li key={title} className="flex gap-3 text-sm leading-[1.5] text-[var(--text-dim)]">
                      <span className="relative rounded-[4px] shrink-0 w-4 h-4 mt-0.5 bg-[var(--accent-soft)] border border-[var(--accent-line)]">
                        <span className="absolute rounded-[1.5px] inset-0.5 bg-[var(--accent-text)]" />
                      </span>
                      <span>
                        <strong className="font-semibold text-[var(--text)]">{title}: </strong>
                        {desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual mockup for Row 3 */}
              <div className="relative aspect-[4/3] w-full max-w-[480px] mx-auto rounded-xl border border-white/10 bg-[var(--bg-surface)] p-5 shadow-2xl flex flex-col justify-between overflow-hidden animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="flex flex-col gap-3 h-full justify-center">
                  
                  {/* User query */}
                  <div className="self-end max-w-[85%] text-xs text-[var(--text)] rounded-xl rounded-br-[3px] border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3.5 py-2.5 shadow-sm">
                    Does the CDU secondary loop support pure water?
                  </div>

                  {/* Refusal warning */}
                  <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
                    <svg className="shrink-0" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 1v14M8 12h.01M8 15h.01" strokeLinecap="round"/>
                      <circle cx="8" cy="8" r="7" />
                    </svg>
                    <span>Factual density: Low (35%) · Refused to extrapolate</span>
                  </div>

                  {/* Assistant response */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-[7px] text-[11px] font-medium text-[var(--text-faint)]">
                      <span className="rounded-[2px] inline-block w-1.5 h-1.5 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                      Nib Assistant
                    </div>
                    <div className="text-[13px] leading-[1.5] text-[var(--text-dim)] rounded-xl border border-white/5 bg-[var(--bg-base)] p-3">
                      I could not find direct verification in the text that pure water is supported. The secondary loop is described as using a treated propylene-glycol mixture to prevent scaling and freezing.
                    </div>
                  </div>

                  {/* Alternative suggestions */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider">Try asking:</span>
                    <div className="flex gap-2">
                      <button type="button" className="text-[10.5px] border border-white/10 rounded-md bg-[var(--bg-base)] px-2.5 py-1.5 text-[var(--text)] text-left hover:bg-[var(--bg-hover)] transition-colors">
                        What loop mixture is recommended?
                      </button>
                      <button type="button" className="text-[10.5px] border border-white/10 rounded-md bg-[var(--bg-base)] px-2.5 py-1.5 text-[var(--text)] text-left hover:bg-[var(--bg-hover)] transition-colors">
                        Explain loop architecture
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* -- Multimodal -- */}
      <section className="py-[100px] px-8" style={{ background: 'linear-gradient(180deg,transparent,rgba(255,255,255,0.012))' }}>
        <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          <div className="grid gap-16 items-center" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="text-[12.5px] font-medium tracking-[0.06em] uppercase mb-3.5" style={{ color: 'var(--accent-text)' }}>Multimodal by design</div>
              <h2 className="font-medium tracking-[-0.02em] m-0 mb-[18px] text-left" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.1, textWrap: 'balance' } as React.CSSProperties}>
                If you can see it in the PDF,<br />Nib can answer about it.
              </h2>
              <p className="text-[17px] leading-[1.55] m-0 mb-7 text-left" style={{ color: 'var(--text-dim)' }}>
                Tables. Bar charts. Axis labels. Hand-drawn schematics. Photographs of equipment. Captions printed three columns away from their figure. Nib indexes them all as first-class blocks, not afterthoughts.
              </p>
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                {[
                  ['Tables', 'are extracted as structured grids. Ask about a single cell or a column trend.'],
                  ['Charts & graphs', 'have their axes, legends, and key inflections parsed and indexed.'],
                  ['Figures', 'get vision-model summaries paired with their caption text.'],
                  ['Equations & footnotes', 'are linked back to their referencing paragraph.'],
                ].map(([bold, rest]) => (
                  <li key={bold} className="grid gap-3.5 items-start text-[15px] leading-[1.5]" style={{ gridTemplateColumns: 'auto 1fr', color: 'var(--text-dim)' }}>
                    <span className="relative rounded-[4px] shrink-0" style={{ width: 16, height: 16, marginTop: 3, background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}>
                      <span className="absolute rounded-[1.5px]" style={{ inset: 3, background: 'var(--accent-text)' }} />
                    </span>
                    <span><b className="font-semibold" style={{ color: 'var(--text)' }}>{bold}</b> {rest}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-[14px]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-faint)', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.6)' }}>
              <div className="px-[22px] py-[18px] flex flex-col gap-0.5" style={{ borderBottom: '1px solid var(--border-faint)', background: 'rgba(255,255,255,0.014)' }}>
                <span className="text-sm font-semibold">Block-level provenance</span>
                <span className="text-[12.5px]" style={{ color: 'var(--text-faint)' }}>What Nib stores for every page</span>
              </div>
              <div className="flex flex-col">
                {mmRows.map((row, i) => (
                  <div
                    key={i}
                    className="grid gap-3.5 items-center px-[22px] py-[11px] text-[13.5px]"
                    style={{ gridTemplateColumns: '88px 1fr auto', borderTop: i === 0 ? 'none' : '1px solid var(--border-faint)' }}
                  >
                    <span className={`text-[10px] font-bold tracking-[0.06em] px-[7px] py-[3px] rounded-[4px] text-center ${row.tagCls}`}>{row.tag}</span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontFamily: 'var(--font-doc)', fontSize: 14.5, color: 'var(--text)' }}>{row.name}</span>
                    <span className="text-[12.5px] tabular-nums" style={{ color: 'var(--text-faint)' }}>{row.meta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -- Pricing -- */}
      <section id="pricing" className="w-full py-[100px]">
        <div className="px-8" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          <div className="max-w-[720px] mx-auto mb-14 text-center">
            <div className="text-[12.5px] font-medium tracking-[0.06em] uppercase mb-4" style={{ color: 'var(--accent-text)' }}>Pricing</div>
            <h2 className="font-medium tracking-[-0.02em] m-0 mb-[18px]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.1, textWrap: 'balance' } as React.CSSProperties}>
              Honest pricing. No per-page surprises.
            </h2>
            <p className="text-[17px] leading-[1.55] m-0" style={{ color: 'var(--text-dim)' }}>Start free. Move up only when you need it.</p>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {[
              { name: 'Reader',       price: '$0',  period: '/month',           tag: 'For curious individuals.',  featured: false, cta: 'Start free' },
              { name: 'Professional', price: '$24', period: '/month',           tag: 'For working researchers.',  featured: true,  cta: 'Start 14-day trial' },
              { name: 'Team',         price: '$18', period: '/user / month',    tag: 'For research groups.',      featured: false, cta: 'Talk to sales' },
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
                <Link
                  href={user ? "/home" : "/signup"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-medium no-underline transition-colors mt-auto"
                  style={plan.featured ? { background: 'var(--text)', color: 'var(--bg-base)' } : { background: 'rgba(255,255,255,0.04)', color: 'var(--text)', border: '1px solid var(--border)' }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- CTA -- */}
      <section className="relative text-center w-full py-[120px]">
        <div className="absolute inset-0 pointer-events-none -z-[1]" style={{ background: 'radial-gradient(circle at 30% 50%,var(--accent-glow-a),transparent 55%),radial-gradient(circle at 70% 50%,var(--accent-glow-b),transparent 55%)', filter: 'blur(80px)', opacity: 0.18 }} />
        <div className="px-8" style={{ maxWidth: 880, margin: '0 auto' }}>
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

      {/* -- Footer -- */}
      <footer className="px-8 pt-[60px] pb-8" style={{ borderTop: '1px solid var(--border-faint)', background: 'rgba(255,255,255,0.012)' }}>
        <div className="grid gap-10 mb-10" style={{ maxWidth: 'var(--maxw)', margin: '0 auto 40px', gridTemplateColumns: '1.6fr 1fr 1fr 1fr' }}>
          <div>
            <a href="#" className="inline-flex items-center gap-2 no-underline" style={{ color: 'inherit' }}>
              <NibMark />
              <span className="text-[17px] font-semibold tracking-[-0.02em]">Nib</span>
            </a>
            <p className="text-[13.5px] max-w-[280px] mt-3 mb-0" style={{ color: 'var(--text-faint)' }}>A calmer way to read the documents that matter.</p>
          </div>
          {[
            { heading: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
            { heading: 'Company', links: ['About', 'Careers', 'Press', 'Contact'] },
            { heading: 'Trust', links: ['Security', 'Privacy', 'SOC 2', 'Data handling'] },
          ].map((col) => (
            <div key={col.heading} className="flex flex-col gap-2.5">
              <h4 className="text-[12.5px] font-semibold m-0 mb-2 tracking-[-0.005em]" style={{ color: 'var(--text)' }}>{col.heading}</h4>
              {col.links.map((l) => (
                <a key={l} href="#" className="text-[13.5px] no-underline transition-colors hover:text-[var(--text)]" style={{ color: 'var(--text-faint)' }}>{l}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-6 text-[12.5px]" style={{ maxWidth: 'var(--maxw)', margin: '0 auto', borderTop: '1px solid var(--border-faint)', color: 'var(--text-faint)' }}>
          <span>© 2026 Nib Reader, Inc.</span>
          <span>Made with care in Brooklyn &amp; Lisbon.</span>
        </div>
      </footer>

    </div>
  );
}
