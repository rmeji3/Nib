import { mmRows } from './landing-shared';

export function LandingMultimodal() {
  return (
    <>
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

    </>
  );
}
