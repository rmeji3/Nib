'use client';

import { useEffect, useRef } from 'react';
import type { RefObject, ReactNode } from 'react';

export interface PageComponentProps {
  registerBlock: (id: string, ref: RefObject<HTMLDivElement | null>) => void;
  highlightedBlockId: string | null;
  highlightVersion: number;
}

function CitableBlock({
  id,
  children,
  registerBlock,
  highlighted,
  highlightVersion,
}: {
  id: string;
  children: ReactNode;
  registerBlock: (id: string, ref: RefObject<HTMLDivElement | null>) => void;
  highlighted: boolean;
  highlightVersion: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerBlock(id, ref);
  }, [id, registerBlock]);

  return (
    <div
      ref={ref}
      data-block-id={id}
      className={`block${highlighted ? ' is-highlighted' : ''}${highlighted ? ` is-pulsing-${highlightVersion % 2 === 0 ? 'a' : 'b'}` : ''}`}
    >
      {children}
    </div>
  );
}

function PageOne({ registerBlock, highlightedBlockId, highlightVersion }: PageComponentProps) {
  const isHighlighted = (id: string) => highlightedBlockId === id;

  return (
    <>
      <CitableBlock
        id="p1-title"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p1-title')}
        highlightVersion={highlightVersion}
      >
        <div className="doc-kicker">Hyperline Labs · Technical Report HL-TR-2025-014</div>
        <h1 className="doc-h1">Adaptive Liquid Cooling for High-Density GPU Clusters</h1>
        <h2 className="doc-subtitle">A System Design Overview for 80+ kW per Rack Workloads</h2>
        <div className="doc-byline">
          <span>R. Vasquez</span>
          <span>K. Sato</span>
          <span>M. Okonkwo</span>
          <span>D. Liang</span>
          <br />
          <span className="doc-byline-org">Hyperline Labs · Infrastructure Engineering</span>
          <span>March 2025</span>
        </div>
      </CitableBlock>

      <CitableBlock
        id="p1-abstract"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p1-abstract')}
        highlightVersion={highlightVersion}
      >
        <h3 className="doc-h3 doc-tight">Abstract</h3>
        <div className="doc-abstract">
          Modern accelerator deployments routinely exceed 40 kW per rack, with B200-class systems
          approaching 80 kW under sustained inference loads. Air cooling fails to dissipate this density
          without compromising thermal headroom or acoustic budgets. We describe a hybrid rear-door +
          direct-to-chip liquid cooling architecture deployed across two production halls, characterize
          its thermal envelope, and report measured throughput at varying coolant flow rates. The system
          maintains junction temperatures below 78 °C at 92% sustained utilization while reducing fan
          power by <b>54%</b> versus the air-only baseline.
        </div>
      </CitableBlock>

      <CitableBlock
        id="p1-keywords"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p1-keywords')}
        highlightVersion={highlightVersion}
      >
        <p className="doc-p doc-keywords">
          <b>Keywords:</b> liquid cooling, direct-to-chip, GPU thermal management, datacenter PUE,
          rear-door heat exchanger, B200, H200, coolant distribution.
        </p>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 1</div>
    </>
  );
}

function PageTwo({ registerBlock, highlightedBlockId, highlightVersion }: PageComponentProps) {
  const isHighlighted = (id: string) => highlightedBlockId === id;

  return (
    <>
      <CitableBlock
        id="p2-intro"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p2-intro')}
        highlightVersion={highlightVersion}
      >
        <h2 className="doc-h2 doc-page-start">1. Introduction</h2>
        <p className="doc-p">
          Power density in accelerator-class compute has roughly doubled every 18 months over the last
          decade. NVIDIA&apos;s H100 SXM5 nominally draws 700 W, the H200 reaches 1000 W, and B200 boards
          are specified at 1200 W with transient peaks above 1400 W. Eight such accelerators per chassis,
          with switch fabric and host CPUs, push a single 8U server past 12 kW and an industry-standard 42U
          cabinet past 80 kW under realistic workload mixes.
        </p>
        <p className="doc-p">
          Conventional row-cooled air installations are dimensioned for 8–15 kW per rack. Above that range,
          the required volumetric airflow exceeds what chassis fans can produce without saturating both their
          acoustic budget and the rack-front static-pressure tolerance. Operators have responded with three
          tactics: rear-door heat exchangers, in-row liquid loops, and direct-to-chip cold plates.
        </p>
      </CitableBlock>

      <CitableBlock
        id="p2-contributions"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p2-contributions')}
        highlightVersion={highlightVersion}
      >
        <h3 className="doc-h3">1.1 Contributions</h3>
        <p className="doc-p">This report summarizes 14 months of operational data from two production halls and contributes:</p>
        <ul className="doc-list">
          <li>A characterized hybrid RDHx + D2C topology with measured thermal envelopes per rack class.</li>
          <li>Empirical throughput curves as a function of secondary-loop flow rate (§4, Figure 3).</li>
          <li>An operational policy for adaptive flow control under variable workload mix.</li>
        </ul>
      </CitableBlock>

      <CitableBlock
        id="p2-related"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p2-related')}
        highlightVersion={highlightVersion}
      >
        <h3 className="doc-h3">1.2 Related Work</h3>
        <p className="doc-p">
          Prior open characterizations of large-scale GPU cooling have focused primarily on facility-level PUE
          or on immersion bath performance. Reports on hybrid topologies have remained internal to hyperscalers
          and equipment vendors. Where public data exists, it predates the 1 kW-per-accelerator inflection point.
        </p>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 2</div>
    </>
  );
}

function PageThree({ registerBlock, highlightedBlockId, highlightVersion }: PageComponentProps) {
  const isHighlighted = (id: string) => highlightedBlockId === id;

  return (
    <>
      <CitableBlock
        id="p3-arch"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p3-arch')}
        highlightVersion={highlightVersion}
      >
        <h2 className="doc-h2 doc-page-start">2. System Architecture</h2>
        <p className="doc-p">
          The deployed topology is a two-stage loop. A primary facility loop carries water at 18–22 °C from
          rooftop dry coolers to a row-end coolant distribution unit. The CDU isolates the facility side from a
          secondary technology loop of treated propylene-glycol mix, which reaches the racks at 25–28 °C and
          returns at 38–42 °C under load. RDHx panels handle ambient-air heat shed; D2C cold plates handle GPU
          and NVSwitch die-level extraction.
        </p>
      </CitableBlock>

      <CitableBlock
        id="p3-figure1"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p3-figure1')}
        highlightVersion={highlightVersion}
      >
        <div className="doc-figure">
          <svg viewBox="0 0 520 220" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="diag" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#c8c0a8" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="520" height="220" fill="#fbf8f0" />
            <rect x="20" y="20" width="80" height="44" fill="url(#diag)" stroke="#2a2620" strokeWidth="1.2" />
            <text x="60" y="46" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fill="#2a2620">Dry Cooler</text>
            <text x="60" y="58" textAnchor="middle" fontFamily="Georgia, serif" fontSize="8" fill="#5e574a">18–22 °C</text>
            <rect x="200" y="80" width="100" height="60" fill="none" stroke="#2a2620" strokeWidth="1.4" />
            <text x="250" y="106" textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fill="#2a2620" fontWeight="600">CDU</text>
            <text x="250" y="120" textAnchor="middle" fontFamily="Georgia, serif" fontSize="8" fill="#5e574a">heat exchanger</text>
            <text x="250" y="132" textAnchor="middle" fontFamily="Georgia, serif" fontSize="8" fill="#5e574a">+ pumps</text>
            <rect x="400" y="40" width="90" height="140" fill="#f4f0e6" stroke="#2a2620" strokeWidth="1.2" />
            <text x="445" y="56" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fill="#2a2620" fontWeight="600">Rack</text>
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <g key={row}>
                <rect x="410" y={66 + row * 18} width="70" height="14" fill="none" stroke="#2a2620" strokeWidth="0.6" />
                <rect x="412" y={68 + row * 18} width="10" height="10" fill="#2a2620" opacity="0.3" />
                <rect x="424" y={68 + row * 18} width="10" height="10" fill="#2a2620" opacity="0.3" />
              </g>
            ))}
            <text x="445" y="194" textAnchor="middle" fontFamily="Georgia, serif" fontSize="7.5" fill="#5e574a">D2C cold plates</text>
            <rect x="494" y="40" width="14" height="140" fill="url(#diag)" stroke="#2a2620" strokeWidth="0.8" />
            <text x="500" y="205" textAnchor="middle" fontFamily="Georgia, serif" fontSize="7" fill="#5e574a">RDHx</text>
            <path d="M100,42 Q140,42 160,80 L200,100" stroke="#7d8aa8" strokeWidth="1.6" fill="none" />
            <path d="M100,52 Q140,52 160,120 L200,128" stroke="#a85a4a" strokeWidth="1.6" fill="none" strokeDasharray="2 2" />
            <path d="M300,100 L400,90" stroke="#7d8aa8" strokeWidth="1.6" fill="none" />
            <path d="M300,128 L400,150" stroke="#a85a4a" strokeWidth="1.6" fill="none" strokeDasharray="2 2" />
          </svg>
        </div>
        <div className="doc-caption">
          Figure 1: Two-stage cooling loop. Facility water is isolated from the treated technology coolant at the CDU;
          the secondary loop feeds both rear-door exchangers and direct-to-chip cold plates.
        </div>
      </CitableBlock>

      <CitableBlock
        id="p3-splits"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p3-splits')}
        highlightVersion={highlightVersion}
      >
        <h3 className="doc-h3">2.1 Heat-Path Split</h3>
        <p className="doc-p">
          Under typical training workloads, 68–74% of total rack heat is removed via D2C; the remainder is shed by the
          RDHx panel. The split is deliberately undersized for D2C so residual heat is still manageable during service events.
        </p>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 3</div>
    </>
  );
}

function PageFour({ registerBlock, highlightedBlockId, highlightVersion }: PageComponentProps) {
  const isHighlighted = (id: string) => highlightedBlockId === id;

  return (
    <>
      <CitableBlock
        id="p4-thermal"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p4-thermal')}
        highlightVersion={highlightVersion}
      >
        <h2 className="doc-h2 doc-page-start">3. Thermal Envelopes</h2>
        <p className="doc-p">
          Each Hall-A rack was instrumented with sealed thermistors at the inlet manifold, return manifold, and four cold-plate
          outlets per chassis. Table 1 reports steady-state envelopes for six representative racks selected to span the deployed mix.
        </p>
      </CitableBlock>

      <CitableBlock
        id="p4-table1"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p4-table1')}
        highlightVersion={highlightVersion}
      >
        <table className="doc-table">
          <thead>
            <tr>
              <th>Rack</th>
              <th>Accelerators</th>
              <th className="num">Idle (kW)</th>
              <th className="num">Peak (kW)</th>
              <th className="num">Coolant Δ T (°C)</th>
              <th className="num">Junction max (°C)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>R1</td><td>8 × H100 SXM5</td><td className="num">4.8</td><td className="num">28.4</td><td className="num">11.2</td><td className="num">71</td></tr>
            <tr><td>R2</td><td>8 × H100 SXM5</td><td className="num">4.9</td><td className="num">29.1</td><td className="num">11.5</td><td className="num">72</td></tr>
            <tr><td>R3</td><td>8 × H200</td><td className="num">5.4</td><td className="num">34.7</td><td className="num">12.6</td><td className="num">74</td></tr>
            <tr>
              <td>R4</td>
              <td>8 × H200 + 2 × CX-7</td>
              <td className="num">6.1</td>
              <td className="num"><b>38.2</b></td>
              <td className="num">13.4</td>
              <td className="num">76</td>
            </tr>
            <tr><td>R5</td><td>4 × B200 (early)</td><td className="num">5.2</td><td className="num">31.9</td><td className="num">12.1</td><td className="num">73</td></tr>
            <tr><td>R6</td><td>8 × B200</td><td className="num">7.0</td><td className="num">62.4 *</td><td className="num">15.8</td><td className="num">78</td></tr>
          </tbody>
        </table>
        <div className="doc-caption">
          Table 1: Per-rack thermal envelopes, Hall A (Feb 2025). R6 exceeds the original 32 kW design budget and is handled via adaptive flow response.
        </div>
      </CitableBlock>

      <CitableBlock
        id="p4-discussion"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p4-discussion')}
        highlightVersion={highlightVersion}
      >
        <p className="doc-p">
          R4 held a peak draw of 38.2 kW with junction temperatures at 76 °C, 4 °C inside the silicon throttle threshold. R6,
          an 8-way B200 rack, exceeds the original 32 kW per-rack design budget by 95% and required a dedicated CDU branch.
        </p>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 4</div>
    </>
  );
}

function PageFive({ registerBlock, highlightedBlockId, highlightVersion }: PageComponentProps) {
  const isHighlighted = (id: string) => highlightedBlockId === id;

  return (
    <>
      <CitableBlock
        id="p5-perf"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p5-perf')}
        highlightVersion={highlightVersion}
      >
        <h2 className="doc-h2 doc-page-start">4. Performance vs. Coolant Flow Rate</h2>
        <p className="doc-p">
          We swept secondary-loop flow rate from 1.0 to 3.6 L/min per chassis while holding inlet temperature at 27 °C,
          and measured sustained training throughput on a fixed Llama-3 70B reference workload.
        </p>
      </CitableBlock>

      <CitableBlock
        id="p5-figure3"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p5-figure3')}
        highlightVersion={highlightVersion}
      >
        <div className="doc-figure">
          <svg viewBox="0 0 520 260" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="520" height="260" fill="#fbf8f0" />
            <g transform="translate(50,20)">
              {[0, 1, 2, 3, 4].map((row) => (
                <line key={row} x1="0" y1={row * 45} x2="440" y2={row * 45} stroke="#d8d2c0" strokeWidth="0.5" />
              ))}
              {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                <line key={col} x1={col * 73} y1="0" x2={col * 73} y2="180" stroke="#d8d2c0" strokeWidth="0.5" />
              ))}
              <line x1="0" y1="0" x2="0" y2="180" stroke="#2a2620" strokeWidth="1" />
              <line x1="0" y1="180" x2="440" y2="180" stroke="#2a2620" strokeWidth="1" />
              <path
                d="M0,160 L40,140 L80,118 L120,90 L160,68 L200,48 L210,42 L220,38 L240,34 L260,32 L300,30 L340,29 L380,28 L420,28"
                fill="none"
                stroke="oklch(0.55 0.13 230)"
                strokeWidth="2"
              />
              <circle cx="205" cy="46" r="3" fill="oklch(0.55 0.13 230)" />
              <line x1="205" y1="46" x2="205" y2="0" stroke="oklch(0.55 0.13 230)" strokeWidth="0.6" strokeDasharray="3 3" />
              <text x="210" y="10" fontFamily="Georgia, serif" fontSize="8" fill="oklch(0.45 0.13 230)" fontStyle="italic">knee @ 2.4 L/min</text>
              <path
                d="M0,170 L40,166 L80,160 L120,152 L160,140 L200,124 L240,104 L280,80 L320,52 L360,22 L400,-8"
                fill="none"
                stroke="oklch(0.6 0.13 30)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </g>
          </svg>
        </div>
        <div className="doc-caption">
          Figure 3: Sustained training throughput as a function of secondary coolant flow rate. A pronounced knee at 2.4 L/min marks the point beyond which additional flow yields diminishing returns.
        </div>
      </CitableBlock>

      <CitableBlock
        id="p5-recommendation"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p5-recommendation')}
        highlightVersion={highlightVersion}
      >
        <p className="doc-p">
          We adopt 2.4 L/min as the nominal setpoint for steady-state operation, with the adaptive controller permitted to surge to 3.0 L/min for up to 90 seconds during transient thermal events.
        </p>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 5</div>
    </>
  );
}

function PageSix({ registerBlock, highlightedBlockId, highlightVersion }: PageComponentProps) {
  const isHighlighted = (id: string) => highlightedBlockId === id;

  return (
    <>
      <CitableBlock
        id="p6-conclusion"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p6-conclusion')}
        highlightVersion={highlightVersion}
      >
        <h2 className="doc-h2 doc-page-start">5. Conclusion</h2>
        <p className="doc-p">
          A hybrid RDHx + D2C topology successfully cools 80 kW-class B200 racks in production while keeping junction temperatures below 78 °C and reducing fan power by 54% versus the air-only baseline.
        </p>
        <p className="doc-p">
          Future work should examine coolant chemistry drift after 24 months in a closed loop, stratified inlet temperatures, and generalization to 120 kW racks anticipated for the next generation.
        </p>
      </CitableBlock>

      <CitableBlock
        id="p6-refs"
        registerBlock={registerBlock}
        highlighted={isHighlighted('p6-refs')}
        highlightVersion={highlightVersion}
      >
        <h3 className="doc-h3">References</h3>
        <ol className="doc-ref-list">
          <li>ASHRAE TC 9.9. <i>Thermal Guidelines for Data Processing Environments</i>, 5th ed., 2021.</li>
          <li>Patel, C. et al. “Smart cooling of data centers.” <i>InterPACK</i>, 2019.</li>
          <li>NVIDIA. <i>B200 SXM Thermal Design Guide</i>. NV-DG-09241, 2024.</li>
          <li>Uptime Institute. <i>Global Data Center Survey 2023</i>, 2024.</li>
          <li>Vasquez, R. and Sato, K. “Direct-to-chip retrofits at scale.” <i>Hyperline Tech Memo HL-TM-22</i>, 2023.</li>
        </ol>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 6</div>
    </>
  );
}

export const DOC_PAGES = [PageOne, PageTwo, PageThree, PageFour, PageFive, PageSix];

export const DOC_PAGE_TITLES = [
  'Title & Abstract',
  'Introduction',
  'System Architecture',
  'Thermal Envelopes',
  'Performance Results',
  'Conclusion',
];