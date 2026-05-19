'use client';

import { useState } from 'react';
import Link from 'next/link';

const NibMark = () => (
  <div className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[var(--text)] text-[var(--bg-base)]">
    <svg viewBox="0 0 24 24" width="19" height="19">
      <path d="M4 20 L18 6 L20 8 L8 22 L4 24 Z" fill="currentColor" />
      <path d="M4 20 L8 22" stroke="currentColor" strokeWidth="1.4" opacity=".4" />
    </svg>
  </div>
);

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

const tabItems = [
  { id: 'inline', num: '01', title: 'Inline chips', desc: 'Numbered chips in the prose. Scannable and compact.' },
  { id: 'cards', num: '02', title: 'Source cards', desc: 'Expanded source cards under each answer. Best for skimming evidence.' },
  { id: 'dots', num: '03', title: 'Subtle dots', desc: "Minimal markers that don't break the reading flow. Hover for preview." },
];

function CitationChip({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[5px] px-[5px] text-[11px] font-semibold mx-[2px] align-[1px]"
      style={{ minWidth: 18, height: 18, background: 'var(--citation-soft)', border: '1px solid var(--citation-line)', color: 'var(--citation-text)' }}
    >
      {n}
    </span>
  );
}

function CitationPip() {
  return (
    <span
      className="inline-block rounded-full mx-1 align-[1px]"
      style={{ width: 7, height: 7, background: 'var(--citation)' }}
    />
  );
}

function HowTabs() {
  const [active, setActive] = useState('inline');
  return (
    <div className="grid gap-9" style={{ gridTemplateColumns: '360px 1fr' }}>
      {/* Rail */}
      <div className="flex flex-col gap-1.5">
        {tabItems.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`grid gap-3 items-start text-left rounded-xl px-[18px] py-[18px] cursor-pointer transition-all duration-150 border ${
                isActive
                  ? 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text)]'
                  : 'bg-transparent border-transparent text-[var(--text-dim)] hover:bg-[var(--bg-surface)]'
              }`}
              style={{ gridTemplateColumns: '36px 1fr', font: 'inherit' }}
            >
              <span className="pt-[1px] text-sm italic text-[var(--accent-text)]" style={{ fontFamily: 'var(--font-doc)' }}>
                {tab.num}
              </span>
              <span className="flex flex-col gap-1">
                <span className={`text-base font-semibold tracking-[-0.005em] ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-dim)]'}`}>
                  {tab.title}
                </span>
                <span className="text-[13.5px] leading-[1.45] text-[var(--text-faint)]">{tab.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Preview panel */}
      <div
        className="rounded-2xl p-7 min-h-[280px] relative"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-faint)' }}
      >
        {active === 'inline' && (
          <div>
            <div className="flex items-center gap-[7px] text-[11.5px] font-medium text-[var(--text-faint)] mb-2">
              <span className="rounded-[2px] inline-block" style={{ width: 7, height: 7, background: 'var(--text-dim)' }} />
              Nib
            </div>
            <div className="text-[15px] leading-[1.6] text-[var(--text)]">
              Figure 3 plots throughput against secondary coolant flow rate, swept from 1.0 to 3.6&nbsp;L/min
              <CitationChip n={1} />. The curve shows a pronounced <strong>knee at 2.4 L/min</strong>
              <CitationChip n={1} />, which the paper adopts as the steady-state setpoint
              <CitationChip n={2} />.
            </div>
          </div>
        )}

        {active === 'cards' && (
          <div>
            <div className="flex items-center gap-[7px] text-[11.5px] font-medium text-[var(--text-faint)] mb-2">
              <span className="rounded-[2px] inline-block" style={{ width: 7, height: 7, background: 'var(--text-dim)' }} />
              Nib
            </div>
            <div className="text-[15px] leading-[1.6] text-[var(--text)]">
              Figure 3 plots throughput against secondary coolant flow rate, swept from 1.0 to 3.6&nbsp;L/min
              <CitationChip n={1} />. The curve shows a pronounced <strong>knee at 2.4 L/min</strong>
              <CitationChip n={1} />.
            </div>
            <div className="flex flex-col gap-2 mt-[18px]">
              {[
                { idx: 1, where: 'Figure 3, p.5', snippet: 'Sustained training throughput as a function of secondary coolant flow rate. Knee at 2.4 L/min…' },
                { idx: 2, where: '§4, p.5', snippet: 'We adopt 2.4 L/min as the nominal setpoint for steady-state operation…' },
              ].map((card) => (
                <div
                  key={card.idx}
                  className="grid gap-3 items-center rounded-[9px] px-3 py-2.5 text-[var(--text-faint)]"
                  style={{ gridTemplateColumns: 'auto 1fr auto', background: 'var(--bg-base)', border: '1px solid var(--border-faint)' }}
                >
                  <span className="inline-flex items-center justify-center rounded-[5px] text-xs font-semibold" style={{ width: 24, height: 24, background: 'var(--citation-soft)', color: 'var(--citation-text)' }}>
                    {card.idx}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-[13px] font-medium text-[var(--text)]">{card.where}</span>
                    <span className="text-xs text-[var(--text-dim)] overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontFamily: 'var(--font-doc)' }}>
                      {card.snippet}
                    </span>
                  </span>
                  <ArrowRight />
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'dots' && (
          <div>
            <div className="flex items-center gap-[7px] text-[11.5px] font-medium text-[var(--text-faint)] mb-2">
              <span className="rounded-[2px] inline-block" style={{ width: 7, height: 7, background: 'var(--text-dim)' }} />
              Nib
            </div>
            <div className="text-[15px] leading-[1.6] text-[var(--text)]">
              Figure 3 plots throughput against secondary coolant flow rate, swept from 1.0 to 3.6&nbsp;L/min
              <CitationPip />. The curve shows a pronounced <strong>knee at 2.4 L/min</strong>
              <CitationPip />, which the paper adopts as the steady-state setpoint
              <CitationPip />.
            </div>
            <div className="text-[12.5px] text-[var(--text-faint)] mt-[22px] pt-3.5" style={{ borderTop: '1px dashed var(--border-faint)' }}>
              Hover any dot to see the source · click to jump to the page.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const feats = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h14l4 4v10a1 1 0 0 1-1 1H3z" /><path d="M9 5v6h8" /><path d="M7 16h10" />
      </svg>
    ),
    title: 'Sees charts, tables & figures',
    body: "Most PDF chat tools embed only extracted text and hallucinate the rest. Nib runs vision extraction over every visual block — chart axes, table cells, figure captions — and grounds answers in what's actually drawn on the page.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="14" height="16" rx="1" /><path d="M7 9h6M7 13h6M7 17h4" /><circle cx="19" cy="6" r="2.4" fill="currentColor" />
      </svg>
    ),
    title: 'Citations you can click',
    body: 'Every claim points back to a block on a page. Click the chip, jump to the exact paragraph, table row, or figure region. Skim the source for five seconds, then trust the answer.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /><circle cx="12" cy="12" r="3.2" />
      </svg>
    ),
    title: 'Refuses to guess',
    body: 'When evidence is thin, Nib says so. A confidence indicator shows you when the model would be reaching, and the UI prompts you to narrow the question instead of fabricating an answer.',
  },
];

const mmRows = [
  { tag: 'TEXT',    tagCls: 'text-[oklch(0.85_0.04_240)] bg-[oklch(0.4_0.05_240/0.25)]', name: '§2.1 Heat-Path Split',                 meta: 'p.3 · 8 sentences' },
  { tag: 'TABLE',   tagCls: 'text-[oklch(0.86_0.09_150)] bg-[oklch(0.4_0.08_150/0.25)]', name: 'Per-rack thermal envelopes',            meta: 'p.4 · 6 rows × 6 cols' },
  { tag: 'CHART',   tagCls: 'text-[oklch(0.86_0.1_60)]   bg-[oklch(0.4_0.08_60/0.25)]',  name: 'Throughput vs. flow rate',             meta: 'p.5 · 2 series' },
  { tag: 'FIGURE',  tagCls: 'text-[oklch(0.85_0.09_310)] bg-[oklch(0.4_0.08_310/0.25)]', name: 'Two-stage cooling loop',               meta: 'p.3 · schematic' },
  { tag: 'CAPTION', tagCls: 'text-[oklch(0.82_0.05_30)]  bg-[oklch(0.4_0.06_30/0.25)]',  name: '"Figure 1: Two-stage cooling loop…"', meta: 'p.3 · refs §2' },
  { tag: 'TEXT',    tagCls: 'text-[oklch(0.85_0.04_240)] bg-[oklch(0.4_0.05_240/0.25)]', name: '5. Conclusion',                        meta: 'p.6 · 4 sentences' },
];

const planFeatures: Record<string, string[]> = {
  Reader: ['50 pages per month', '3 active documents', 'Text & basic table extraction', 'Citations, inline only'],
  Professional: ['2,000 pages per month', 'Unlimited documents', 'Full multimodal extraction', 'All three citation styles', 'Confidence indicators & refusal', 'Export annotated PDFs'],
  Team: ['Everything in Professional', 'Shared document libraries', 'SSO & SCIM', 'SOC 2 audit log access', 'Region-locked processing'],
};

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '15.5px', lineHeight: 1.5, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 grid items-center gap-8 px-8 py-[18px]"
        style={{
          gridTemplateColumns: 'auto 1fr auto',
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
          background: 'rgba(10,12,16,0.65)',
          borderBottom: '1px solid var(--border-faint)',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        }}
      >
        <a href="#" className="inline-flex items-center gap-2 no-underline" style={{ color: 'inherit' }}>
          <NibMark />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Nib</span>
        </a>
        <div className="hidden md:flex gap-7 justify-center text-sm text-[var(--text-dim)]">
          {['Product', 'How it works', 'Pricing', 'Changelog'].map((l, i) => (
            <a key={l} href={['#product', '#how', '#pricing', '#changelog'][i]} className="hover:text-[var(--text)] transition-colors no-underline" style={{ color: 'inherit' }}>{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-3.5">
          <a href="#" className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors no-underline">Sign in</a>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-sm font-medium no-underline transition-colors border-none"
            style={{ background: 'var(--text)', color: 'var(--bg-base)' }}
          >
            Try Nib free
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="relative px-8 pt-[60px] pb-20" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
        {/* Glow blobs */}
        <div className="absolute overflow-hidden pointer-events-none z-0" style={{ inset: '-40px 0 0' }} aria-hidden>
          <div className="absolute rounded-full mix-blend-screen" style={{ width: 720, height: 720, filter: 'blur(120px)', opacity: 0.32, background: 'radial-gradient(circle,var(--accent-glow-a),transparent 60%)', top: -200, left: -160 }} />
          <div className="absolute rounded-full mix-blend-screen" style={{ width: 720, height: 720, filter: 'blur(120px)', opacity: 0.28, background: 'radial-gradient(circle,var(--accent-glow-b),transparent 60%)', top: -120, right: -200 }} />
          <div className="absolute rounded-full mix-blend-screen" style={{ width: 720, height: 720, filter: 'blur(120px)', opacity: 0.22, background: 'radial-gradient(circle,var(--accent-glow-c),transparent 60%)', top: 240, left: '30%' }} />
        </div>

        {/* Inner */}
        <div className="relative z-[1] max-w-[880px] mx-auto text-center pt-10 pb-7">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] text-[var(--text-dim)] mb-7" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-faint)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-glow-c)', boxShadow: '0 0 8px var(--accent-glow-c)' }} />
            Nib 1.0 · grounded multimodal reading
          </div>

          <h1 className="m-0 mb-[22px] font-medium tracking-[-0.025em]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(40px,6vw,76px)', lineHeight: 1.05, textWrap: 'balance' } as React.CSSProperties}>
            The PDF reader that{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent-text)' }}>actually</em>
            {' '}reads&nbsp;back.
          </h1>

          <p className="mx-auto mb-8 m-0 text-[var(--text-dim)]" style={{ fontSize: 'clamp(16px,1.6vw,19px)', lineHeight: 1.5, maxWidth: 640, textWrap: 'pretty' } as React.CSSProperties}>
            A calm, professional document reader with a research-grade AI built in.
            Ask anything — about a chart, a table, a buried footnote —
            and get answers grounded in the exact page, with citations you can click to verify.
          </p>

          <div className="flex gap-3 justify-center mb-7 flex-wrap">
            <Link href="/file" className="inline-flex items-center gap-2 rounded-[9px] px-5 py-3 text-[15px] font-medium no-underline transition-colors" style={{ background: 'var(--text)', color: 'var(--bg-base)' }}>
              Open the reader <ArrowRight />
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 rounded-[9px] px-5 py-3 text-[15px] font-medium no-underline" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              See how it works
            </a>
          </div>

          <div className="text-[13px] text-[var(--text-faint)]">
            <b className="font-medium" style={{ color: 'var(--text-dim)' }}>SOC 2</b> Type II
            <span className="mx-2.5" style={{ color: 'var(--text-mute)' }}>·</span>
            <b className="font-medium" style={{ color: 'var(--text-dim)' }}>Region-locked</b> processing
            <span className="mx-2.5" style={{ color: 'var(--text-mute)' }}>·</span>
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
                    Rack <strong>R6</strong> (8 × B200) reaches the highest peak load at{' '}
                    <strong>62.4 kW</strong>
                    <span className="inline-flex items-center justify-center rounded-[4px] px-1 text-[10.5px] font-semibold mx-0.5 align-[1px]" style={{ minWidth: 16, height: 16, background: 'var(--citation-soft)', border: '1px solid var(--citation-line)', color: 'var(--citation-text)' }}>1</span>
                    , exceeding the original 32 kW design budget by 95%.
                  </div>
                  <div className="grid items-center gap-2.5 px-2.5 py-2 rounded-lg" style={{ gridTemplateColumns: 'auto 1fr auto', background: 'var(--bg-base)', border: '1px solid var(--border-faint)', color: 'var(--text-faint)' }}>
                    <span className="inline-flex items-center justify-center rounded-[5px] text-xs font-semibold" style={{ width: 22, height: 22, background: 'var(--citation-soft)', color: 'var(--citation-text)' }}>1</span>
                    <span className="flex flex-col min-w-0">
                      <span className="text-[12.5px] font-medium" style={{ color: 'var(--text)' }}>Table 1, p.4</span>
                      <span className="text-[11.5px] overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontFamily: 'var(--font-doc)', color: 'var(--text-dim)' }}>R6 · 8 × B200 · Peak 62.4 kW (Feb 28, 9-day window).</span>
                    </span>
                    <ArrowRight />
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[13px]" style={{ border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-faint)' }}>
                  <span>Ask a follow-up…</span>
                  <span className="inline-flex items-center justify-center rounded-[6px] text-[11px]" style={{ width: 22, height: 22, background: 'var(--text)', color: 'var(--bg-base)' }}>↵</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="relative z-[1] mt-[60px] text-center">
          <span className="block text-xs tracking-[0.04em] mb-[18px]" style={{ color: 'var(--text-faint)' }}>Used by research teams at</span>
          <div className="flex justify-center flex-wrap gap-9 font-semibold text-[15px] opacity-70" style={{ color: 'var(--text-faint)', fontVariant: 'small-caps' }}>
            {['Hyperline Labs', 'Arvex Bio', 'Northwind Capital', 'MERIDIAN', 'Quanta Research', 'Brink & Hall'].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="product" className="px-8 py-[100px]" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
        <div className="max-w-[720px] mx-auto mb-14 text-center">
          <div className="text-[12.5px] font-medium tracking-[0.06em] uppercase mb-4" style={{ color: 'var(--accent-text)' }}>Why Nib</div>
          <h2 className="font-medium tracking-[-0.02em] m-0 mb-[18px]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.1, textWrap: 'balance' } as React.CSSProperties}>
            Built for documents that{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent-text)' }}>actually</em>
            {' '}matter.
          </h2>
          <p className="text-[17px] leading-[1.55] m-0" style={{ color: 'var(--text-dim)' }}>
            Research papers, financial filings, technical specs, contracts. Anything where getting the wrong answer is worse than no answer at all.
          </p>
        </div>
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          {feats.map((f) => (
            <article
              key={f.title}
              className="p-7 rounded-[14px] transition-all duration-150 hover:-translate-y-0.5"
              style={{ border: '1px solid var(--border-faint)', background: 'linear-gradient(180deg,rgba(255,255,255,0.025),transparent 40%),var(--bg-surface)' }}
            >
              <div className="inline-flex items-center justify-center rounded-[10px] mb-[18px]" style={{ width: 40, height: 40, background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--accent-line)' }}>
                {f.icon}
              </div>
              <h3 className="m-0 mb-2 font-semibold tracking-[-0.01em]" style={{ fontFamily: 'var(--font-doc)', fontSize: 20 }}>{f.title}</h3>
              <p className="text-[14.5px] leading-[1.55] m-0" style={{ color: 'var(--text-dim)' }}>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how" className="px-8 py-[100px]" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
        <div className="max-w-[720px] mx-auto mb-14 text-center">
          <div className="text-[12.5px] font-medium tracking-[0.06em] uppercase mb-4" style={{ color: 'var(--accent-text)' }}>How it works</div>
          <h2 className="font-medium tracking-[-0.02em] m-0 mb-[18px]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.1, textWrap: 'balance' } as React.CSSProperties}>
            Three citation styles.{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent-text)' }}>Your</em>
            {' '}reading flow.
          </h2>
          <p className="text-[17px] leading-[1.55] m-0" style={{ color: 'var(--text-dim)' }}>
            Different documents and different readers want different friction. Nib lets you choose how citations show up — and switch on the fly.
          </p>
        </div>
        <HowTabs />
      </section>

      {/* ── Multimodal ───────────────────────────────────────────────── */}
      <section className="py-[100px] px-8" style={{ background: 'linear-gradient(180deg,transparent,rgba(255,255,255,0.012))' }}>
        <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          <div className="grid gap-16 items-center" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="text-[12.5px] font-medium tracking-[0.06em] uppercase mb-3.5" style={{ color: 'var(--accent-text)' }}>Multimodal by design</div>
              <h2 className="font-medium tracking-[-0.02em] m-0 mb-[18px] text-left" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.1, textWrap: 'balance' } as React.CSSProperties}>
                If you can{' '}
                <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent-text)' }}>see</em>
                {' '}it in the PDF,<br />Nib can answer about it.
              </h2>
              <p className="text-[17px] leading-[1.55] m-0 mb-7 text-left" style={{ color: 'var(--text-dim)' }}>
                Tables. Bar charts. Axis labels. Hand-drawn schematics. Photographs of equipment. Captions printed three columns away from their figure. Nib indexes them all as first-class blocks — not afterthoughts.
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

      {/* ── Quote ────────────────────────────────────────────────────── */}
      <section className="px-8 py-[60px]" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
        <figure className="max-w-[820px] mx-auto text-center m-0">
          <blockquote className="m-0 mb-7 font-normal tracking-[-0.01em]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(22px,2.4vw,32px)', lineHeight: 1.35, fontStyle: 'italic', color: 'var(--text)', textWrap: 'balance' } as React.CSSProperties}>
            <span style={{ fontStyle: 'normal', color: 'var(--accent-text)', fontSize: '1.2em', marginRight: 4, opacity: 0.7 }}>&ldquo;</span>
            We replaced three different PDF tools with Nib. The day my analysts stopped re-checking AI answers by hand was the day I knew it was working.
          </blockquote>
          <figcaption className="flex flex-col gap-1 text-sm">
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Priya Ramanathan</span>
            <span style={{ color: 'var(--text-faint)' }}>Head of Research · Northwind Capital</span>
          </figcaption>
        </figure>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="px-8 py-[100px]" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
        <div className="max-w-[720px] mx-auto mb-14 text-center">
          <div className="text-[12.5px] font-medium tracking-[0.06em] uppercase mb-4" style={{ color: 'var(--accent-text)' }}>Pricing</div>
          <h2 className="font-medium tracking-[-0.02em] m-0 mb-[18px]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.1, textWrap: 'balance' } as React.CSSProperties}>
            Honest pricing.{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent-text)' }}>No</em>
            {' '}per-page surprises.
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
              <a
                href="#"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-medium no-underline transition-colors mt-auto"
                style={plan.featured ? { background: 'var(--text)', color: 'var(--bg-base)' } : { background: 'rgba(255,255,255,0.04)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="relative text-center px-8 py-[120px]" style={{ maxWidth: 880, margin: '0 auto' }}>
        <div className="absolute inset-0 pointer-events-none -z-[1]" style={{ background: 'radial-gradient(circle at 30% 50%,var(--accent-glow-a),transparent 55%),radial-gradient(circle at 70% 50%,var(--accent-glow-b),transparent 55%)', filter: 'blur(80px)', opacity: 0.18 }} />
        <h2 className="font-medium tracking-[-0.025em] m-0 mb-[18px]" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.05, textWrap: 'balance' } as React.CSSProperties}>
          Read the dense&nbsp;stuff.<br />Trust the&nbsp;answer.
        </h2>
        <p className="text-[17px] m-0 mb-8" style={{ color: 'var(--text-dim)' }}>Open Nib with a sample whitepaper loaded. No sign-up.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/file" className="inline-flex items-center gap-2 rounded-[9px] px-5 py-3 text-[15px] font-medium no-underline" style={{ background: 'var(--text)', color: 'var(--bg-base)' }}>
            Open the reader <ArrowRight />
          </Link>
          <a href="#" className="inline-flex items-center gap-2 rounded-[9px] px-5 py-3 text-[15px] font-medium no-underline" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            Read the security overview
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
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
