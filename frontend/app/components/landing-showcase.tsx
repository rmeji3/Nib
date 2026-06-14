'use client';

import { useState } from 'react';
import { ArrowRight, mmRows } from './landing-shared';
import { NibLogo } from './nib-logo';
import { OcrBlockButton, type OcrBlock } from '../../components/ui/layout-blocks';

export function LandingShowcase() {
  const [activeCite, setActiveCite] = useState<number | null>(null);
  return (
    <>
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
                  Most PDF chat tools embed only extracted text and hallucinate the rest. Nib runs vision extraction over every visual block - including chart axes, table cells, and figure captions - and grounds answers in what's actually drawn on the page.
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
                <div className="absolute left-0 w-full h-[2px] bg-[var(--accent)] shadow-[0_0_10px_var(--accent)] opacity-60 animate-scan z-50 pointer-events-none" />
                
                {/* Replicated page content */}
                <div className="rounded-lg bg-[var(--paper)] text-[var(--ink)] p-5 h-full flex flex-col gap-3 relative shadow-inner overflow-hidden select-none">
                  <div className="h-2 w-1/3 bg-[var(--ink-dim)]/20 rounded mb-1" />
                  <div className="flex flex-col gap-1.5">
                    <div className="h-1.5 w-full bg-[var(--ink-dim)]/10 rounded" />
                    <div className="h-1.5 w-full bg-[var(--ink-dim)]/10 rounded" />
                    <div className="h-1.5 w-5/6 bg-[var(--ink-dim)]/10 rounded" />
                  </div>

                  {/* Simulated Table Block */}
                  <div className="relative border border-[var(--paper-line)] bg-white/40 p-2.5 rounded-md mt-4 border-dashed">
                    {/* Bounding box marker */}
                    <div className="absolute inset-[-1px] border-[1.5px] border-[var(--citation)] bg-[var(--citation-soft)]/20 z-0" />
                    <span className="absolute bottom-full left-[-1.5px] mb-[1.5px] px-1.5 py-[2px] rounded-t-[3px] text-[7px] font-mono font-bold bg-[var(--citation)] text-[var(--bg-base)] z-20 leading-none">
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
                  <div className="msg msg-assistant !max-w-full">
                    <div className="msg-byline flex items-center gap-2 text-[11.5px] text-[var(--text-faint)]">
                      <span className="msg-byline-logo" aria-hidden="true">
                        <NibLogo size={12} />
                      </span>
                      Nib Assistant
                    </div>
                    <div className="msg-bubble !text-[13.5px] !p-4 !bg-[var(--bg-base)] !border !border-white/5 !max-w-full">
                      Rack <strong className="text-[var(--text)]">R6 (8 × B200)</strong> reaches the highest peak thermal load at{' '}
                      <strong className="text-[var(--text)]">62.4 kW</strong>
                      <span
                        className="cite-inline transition-all duration-150"
                        style={activeCite === 1 ? { background: 'var(--citation-text)', color: 'var(--bg-base)', outline: '2px solid var(--citation)', transform: 'scale(1.1)' } : {}}
                        onMouseEnter={() => setActiveCite(1)}
                        onMouseLeave={() => setActiveCite(null)}
                      >
                        1
                      </span>.
                      The H200 racks top out at{' '}
                      <strong>38.2 kW</strong>
                      <span
                        className="cite-inline transition-all duration-150"
                        style={activeCite === 2 ? { background: 'var(--citation-text)', color: 'var(--bg-base)', outline: '2px solid var(--citation)', transform: 'scale(1.1)' } : {}}
                        onMouseEnter={() => setActiveCite(2)}
                        onMouseLeave={() => setActiveCite(null)}
                      >
                        2
                      </span>, which is still inside the silicon throttle threshold.
                    </div>
                  </div>

                  {/* Combined citation cards below */}
                  <div className="flex flex-col gap-2 mt-4">
                    {[
                      {
                        idx: 1,
                        block: {
                          id: '1',
                          type: 'table',
                          text: 'R6 · 8 x B200 · Peak 62.4 kW (commissioned Feb 28, 9-day window).',
                          page: 4,
                          pageWidth: 1,
                          pageHeight: 1,
                          confidence: 0.99
                        } as OcrBlock
                      },
                      {
                        idx: 2,
                        block: {
                          id: '2',
                          type: 'paragraph',
                          text: 'R6 exceeds the original 32 kW per-rack design budget by 95%...',
                          page: 4,
                          pageWidth: 1,
                          pageHeight: 1,
                          confidence: 0.99
                        } as OcrBlock
                      }
                    ].map(({ idx, block }) => (
                      <OcrBlockButton
                        key={idx}
                        block={block}
                        sourceNumber={idx}
                        isActive={activeCite === idx}
                        onFocusBlock={() => setActiveCite(idx)}
                        onMouseLeave={() => setActiveCite(null)}
                      />
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
                  <div className="msg msg-user">
                    <div className="msg-bubble !text-xs !max-w-[85%] !shadow-sm">
                      Does the CDU secondary loop support pure water?
                    </div>
                  </div>

                  {/* Assistant response */}
                  <div className="msg msg-assistant !max-w-full">
                    <div className="msg-byline flex items-center gap-2 text-[11.5px] text-[var(--text-faint)]">
                      <span className="msg-byline-logo" aria-hidden="true">
                        <NibLogo size={12} />
                      </span>
                      Nib Assistant
                    </div>
                    <div className="msg-bubble !text-[13px] !p-3 !bg-[var(--bg-base)] !border !border-white/5 !max-w-full text-[var(--text-dim)]">
                      I cannot find enough relevant information in the indexed pages of this document to answer this question confidently. Try rephrasing your question, or ask about a topic that is covered in the document.
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="confidence low mt-2">
                    <div className="confidence-bar"><i style={{ width: '0%' }} /></div>
                    <span>0% answer confidence</span>
                  </div>



                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

    </>
  );
}
