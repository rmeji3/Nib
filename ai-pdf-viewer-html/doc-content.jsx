// doc-content.jsx — The fake whitepaper. Six pages.
// Each block carries a stable id so citations can target it.

function CitableBlock({ id, children, registerBlock, highlighted, ...rest }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (registerBlock) registerBlock(id, ref);
  }, [id, registerBlock]);
  return (
    <div ref={ref} data-block-id={id}
         className={"block" + (highlighted ? " is-highlighted is-pulsing" : "")}
         {...rest}>
      {children}
    </div>
  );
}

// ── PAGE 1: title + abstract ──────────────────────────────────────────
function PageOne({ registerBlock, highlighted }) {
  const hl = (id) => highlighted === id;
  return (
    <>
      <CitableBlock id="p1-title" registerBlock={registerBlock} highlighted={hl("p1-title")}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>
          Hyperline Labs · Technical Report HL-TR-2025-014
        </div>
        <h1 className="doc-h1">Adaptive Liquid Cooling for High-Density GPU Clusters</h1>
        <h2 style={{ fontFamily: "var(--font-doc)", fontSize: 15, fontWeight: 400, color: "var(--ink-dim)", margin: "0 0 22px", fontStyle: "italic" }}>
          A System Design Overview for 80+ kW per Rack Workloads
        </h2>
        <div className="doc-byline">
          <span>R. Vasquez</span><span>K. Sato</span><span>M. Okonkwo</span><span>D. Liang</span>
          <br />
          <span style={{ marginTop: 4, display: "inline-block" }}>Hyperline Labs · Infrastructure Engineering</span>
          <span>March 2025</span>
        </div>
      </CitableBlock>

      <CitableBlock id="p1-abstract" registerBlock={registerBlock} highlighted={hl("p1-abstract")}>
        <h3 className="doc-h3" style={{ marginTop: 8 }}>Abstract</h3>
        <div className="doc-abstract">
          Modern accelerator deployments routinely exceed 40 kW per rack, with B200-class
          systems approaching 80 kW under sustained inference loads. Air cooling — long
          the default in commodity data centers — fails to dissipate this density without
          compromising thermal headroom or acoustic budgets. We describe a hybrid
          rear-door + direct-to-chip liquid cooling architecture deployed across two
          production halls, characterize its thermal envelope, and report measured
          throughput at varying coolant flow rates. The system maintains junction
          temperatures below 78&thinsp;°C at 92% sustained utilization while reducing
          fan power by <b>54%</b> versus the air-only baseline.
        </div>
      </CitableBlock>

      <CitableBlock id="p1-keywords" registerBlock={registerBlock} highlighted={hl("p1-keywords")}>
        <p className="doc-p" style={{ fontSize: 10, color: "var(--ink-dim)", marginTop: 18 }}>
          <b>Keywords:</b> liquid cooling, direct-to-chip, GPU thermal management,
          datacenter PUE, rear-door heat exchanger, B200, H200, coolant distribution.
        </p>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 1</div>
    </>
  );
}

// ── PAGE 2: Introduction ──────────────────────────────────────────────
function PageTwo({ registerBlock, highlighted }) {
  const hl = (id) => highlighted === id;
  return (
    <>
      <CitableBlock id="p2-intro" registerBlock={registerBlock} highlighted={hl("p2-intro")}>
        <h2 className="doc-h2" style={{ marginTop: 0 }}>1. Introduction</h2>
        <p className="doc-p">
          Power density in accelerator-class compute has roughly doubled every 18
          months over the last decade. NVIDIA's H100 SXM5 nominally draws 700&thinsp;W,
          the H200 reaches 1000&thinsp;W, and B200 boards in the Blackwell generation
          are specified at 1200&thinsp;W with transient peaks above 1400&thinsp;W. Eight
          such accelerators per chassis, with switch fabric and host CPUs, push a
          single 8U server past 12&thinsp;kW — and an industry-standard 42U cabinet
          past 80&thinsp;kW under realistic workload mixes.
        </p>
        <p className="doc-p">
          Conventional row-cooled air installations are dimensioned for 8–15&thinsp;kW
          per rack. Above that range, the required volumetric airflow exceeds what
          chassis fans can produce without saturating both their acoustic budget and
          the rack-front static-pressure tolerance. Operators have responded with
          three tactics, in increasing order of intrusiveness: rear-door heat
          exchangers (RDHx), in-row liquid loops, and direct-to-chip (D2C) cold
          plates. Each approach trades off retrofit cost, plumbing complexity, and
          serviceability.
        </p>
      </CitableBlock>

      <CitableBlock id="p2-contributions" registerBlock={registerBlock} highlighted={hl("p2-contributions")}>
        <h3 className="doc-h3">1.1 Contributions</h3>
        <p className="doc-p">
          This report summarizes 14 months of operational data from two production
          halls (Hall A: 96 racks, Hall B: 144 racks) and contributes:
        </p>
        <ul style={{ fontSize: 11.5, fontFamily: "var(--font-doc)", lineHeight: 1.6, paddingLeft: 18, margin: "4px 0 10px", color: "var(--ink)" }}>
          <li>A characterized hybrid RDHx + D2C topology with measured thermal envelopes per rack class.</li>
          <li>Empirical throughput curves as a function of secondary-loop flow rate (§4, Figure 3).</li>
          <li>An operational policy for adaptive flow control under variable workload mix.</li>
        </ul>
      </CitableBlock>

      <CitableBlock id="p2-related" registerBlock={registerBlock} highlighted={hl("p2-related")}>
        <h3 className="doc-h3">1.2 Related Work</h3>
        <p className="doc-p">
          Prior open characterizations of large-scale GPU cooling have focused
          primarily on facility-level PUE [<span style={{ fontVariant: "small-caps" }}>4, 11</span>] or on
          immersion bath performance [<span style={{ fontVariant: "small-caps" }}>7</span>]. Reports on hybrid topologies have
          remained internal to hyperscalers and equipment vendors. Where public
          data exists [<span style={{ fontVariant: "small-caps" }}>2</span>], it predates the 1&thinsp;kW-per-accelerator
          inflection point and does not generalize cleanly to B200-class deployments.
        </p>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 2</div>
    </>
  );
}

// ── PAGE 3: System architecture + figure ──────────────────────────────
function PageThree({ registerBlock, highlighted }) {
  const hl = (id) => highlighted === id;
  return (
    <>
      <CitableBlock id="p3-arch" registerBlock={registerBlock} highlighted={hl("p3-arch")}>
        <h2 className="doc-h2" style={{ marginTop: 0 }}>2. System Architecture</h2>
        <p className="doc-p">
          The deployed topology is a two-stage loop. A primary facility loop (PW)
          carries water at 18–22&thinsp;°C from rooftop dry coolers to a row-end coolant
          distribution unit (CDU). The CDU isolates the facility side from a
          secondary technology loop (TCS) of treated propylene-glycol mix, which
          reaches the racks at 25–28&thinsp;°C and returns at 38–42&thinsp;°C under load. RDHx
          panels handle ambient-air heat shed; D2C cold plates handle GPU and
          NVSwitch die-level extraction.
        </p>
      </CitableBlock>

      <CitableBlock id="p3-figure1" registerBlock={registerBlock} highlighted={hl("p3-figure1")}>
        <div className="doc-figure">
          <svg viewBox="0 0 520 220" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="diag" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#c8c0a8" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="520" height="220" fill="#fbf8f0" />
            {/* Rooftop dry cooler */}
            <rect x="20" y="20" width="80" height="44" fill="url(#diag)" stroke="#2a2620" strokeWidth="1.2" />
            <text x="60" y="46" textAnchor="middle" fontFamily="Source Serif 4, serif" fontSize="9" fill="#2a2620">Dry Cooler</text>
            <text x="60" y="58" textAnchor="middle" fontFamily="Source Serif 4, serif" fontSize="8" fill="#5e574a">18–22 °C</text>

            {/* CDU */}
            <rect x="200" y="80" width="100" height="60" fill="none" stroke="#2a2620" strokeWidth="1.4" />
            <text x="250" y="106" textAnchor="middle" fontFamily="Source Serif 4, serif" fontSize="10" fill="#2a2620" fontWeight="600">CDU</text>
            <text x="250" y="120" textAnchor="middle" fontFamily="Source Serif 4, serif" fontSize="8" fill="#5e574a">heat exchanger</text>
            <text x="250" y="132" textAnchor="middle" fontFamily="Source Serif 4, serif" fontSize="8" fill="#5e574a">+ pumps</text>

            {/* Rack with D2C */}
            <rect x="400" y="40" width="90" height="140" fill="#f4f0e6" stroke="#2a2620" strokeWidth="1.2" />
            <text x="445" y="56" textAnchor="middle" fontFamily="Source Serif 4, serif" fontSize="9" fill="#2a2620" fontWeight="600">Rack</text>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <g key={i}>
                <rect x="410" y={66 + i * 18} width="70" height="14" fill="none" stroke="#2a2620" strokeWidth="0.6" />
                <rect x="412" y={68 + i * 18} width="10" height="10" fill="#2a2620" opacity="0.3" />
                <rect x="424" y={68 + i * 18} width="10" height="10" fill="#2a2620" opacity="0.3" />
              </g>
            ))}
            <text x="445" y="194" textAnchor="middle" fontFamily="Source Serif 4, serif" fontSize="7.5" fill="#5e574a">D2C cold plates</text>

            {/* RDHx */}
            <rect x="494" y="40" width="14" height="140" fill="url(#diag)" stroke="#2a2620" strokeWidth="0.8" />
            <text x="500" y="205" textAnchor="middle" fontFamily="Source Serif 4, serif" fontSize="7" fill="#5e574a">RDHx</text>

            {/* Connections */}
            <path d="M100,42 Q140,42 160,80 L200,100" stroke="#7d8aa8" strokeWidth="1.6" fill="none" />
            <path d="M100,52 Q140,52 160,120 L200,128" stroke="#a85a4a" strokeWidth="1.6" fill="none" strokeDasharray="2 2" />
            <path d="M300,100 L400,90" stroke="#7d8aa8" strokeWidth="1.6" fill="none" />
            <path d="M300,128 L400,150" stroke="#a85a4a" strokeWidth="1.6" fill="none" strokeDasharray="2 2" />

            {/* Labels */}
            <text x="140" y="38" fontFamily="Source Serif 4, serif" fontSize="8" fill="#5e574a" fontStyle="italic">PW supply</text>
            <text x="140" y="68" fontFamily="Source Serif 4, serif" fontSize="8" fill="#5e574a" fontStyle="italic">PW return</text>
            <text x="340" y="86" fontFamily="Source Serif 4, serif" fontSize="8" fill="#5e574a" fontStyle="italic">TCS 27 °C</text>
            <text x="340" y="162" fontFamily="Source Serif 4, serif" fontSize="8" fill="#5e574a" fontStyle="italic">TCS 40 °C</text>
          </svg>
        </div>
        <div className="doc-caption">
          Figure 1: Two-stage cooling loop. Facility water (PW) is isolated from the
          treated technology coolant (TCS) at the CDU; the secondary loop feeds both
          rear-door exchangers and direct-to-chip cold plates.
        </div>
      </CitableBlock>

      <CitableBlock id="p3-splits" registerBlock={registerBlock} highlighted={hl("p3-splits")}>
        <h3 className="doc-h3">2.1 Heat-Path Split</h3>
        <p className="doc-p">
          Under typical training workloads, 68–74% of total rack heat is removed via
          D2C; the remainder is shed by the RDHx panel. The split is deliberately
          undersized for D2C: by leaving residual heat for the RDHx to handle, we
          retain redundancy if a cold-plate hose disconnects under service.
        </p>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 3</div>
    </>
  );
}

// ── PAGE 4: Thermal envelopes table ───────────────────────────────────
function PageFour({ registerBlock, highlighted }) {
  const hl = (id) => highlighted === id;
  return (
    <>
      <CitableBlock id="p4-thermal" registerBlock={registerBlock} highlighted={hl("p4-thermal")}>
        <h2 className="doc-h2" style={{ marginTop: 0 }}>3. Thermal Envelopes</h2>
        <p className="doc-p">
          Each Hall-A rack was instrumented with sealed thermistors at the inlet
          manifold, return manifold, and four cold-plate outlets per chassis. Table
          1 reports steady-state envelopes for six representative racks selected to
          span the deployed accelerator mix. Idle figures are measured at &lt;5%
          utilization with PCIe links trained; peak figures are sustained
          all-reduce-dominant training workloads averaged over 20-minute windows.
        </p>
      </CitableBlock>

      <CitableBlock id="p4-table1" registerBlock={registerBlock} highlighted={hl("p4-table1")}>
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
            <tr className="hl-row" data-row="p4-row-r4">
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
          Table 1: Per-rack thermal envelopes, Hall A (Feb 2025). * R6 commissioned
          Feb 28; figures from 9-day window. Peak exceeds the original 32 kW design
          budget; see §5 for adaptive flow response.
        </div>
      </CitableBlock>

      <CitableBlock id="p4-discussion" registerBlock={registerBlock} highlighted={hl("p4-discussion")}>
        <p className="doc-p">
          R4 — the densest H200 configuration — held a peak draw of 38.2&thinsp;kW with
          junction temperatures at 76&thinsp;°C, 4&thinsp;°C inside the silicon
          throttle threshold. R6, an 8-way B200 rack, exceeds the original 32&thinsp;kW
          per-rack design budget by 95%, and required a dedicated CDU branch with
          increased pump head; the adaptive control policy described in §5 keeps it
          within thermal limits.
        </p>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 4</div>
    </>
  );
}

// ── PAGE 5: Performance + chart ───────────────────────────────────────
function PageFive({ registerBlock, highlighted }) {
  const hl = (id) => highlighted === id;
  return (
    <>
      <CitableBlock id="p5-perf" registerBlock={registerBlock} highlighted={hl("p5-perf")}>
        <h2 className="doc-h2" style={{ marginTop: 0 }}>4. Performance vs. Coolant Flow Rate</h2>
        <p className="doc-p">
          We swept secondary-loop flow rate from 1.0 to 3.6&thinsp;L/min per chassis
          while holding inlet temperature at 27&thinsp;°C, and measured sustained
          training throughput (tokens/sec/GPU on a fixed Llama-3 70B reference
          workload). Figure 3 reports the median across 24 runs per setpoint.
        </p>
      </CitableBlock>

      <CitableBlock id="p5-figure3" registerBlock={registerBlock} highlighted={hl("p5-figure3")}>
        <div className="doc-figure">
          <svg viewBox="0 0 520 260" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="520" height="260" fill="#fbf8f0" />
            {/* Plot area */}
            <g transform="translate(50,20)">
              {/* gridlines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={i} x1="0" y1={i * 45} x2="440" y2={i * 45} stroke="#d8d2c0" strokeWidth="0.5" />
              ))}
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <line key={i} x1={i * 73} y1="0" x2={i * 73} y2="180" stroke="#d8d2c0" strokeWidth="0.5" />
              ))}
              {/* Y axis */}
              <line x1="0" y1="0" x2="0" y2="180" stroke="#2a2620" strokeWidth="1" />
              <line x1="0" y1="180" x2="440" y2="180" stroke="#2a2620" strokeWidth="1" />
              {/* Y labels (throughput tokens/s/gpu) */}
              {[
                { y: 0, l: "440" },
                { y: 45, l: "400" },
                { y: 90, l: "360" },
                { y: 135, l: "320" },
                { y: 180, l: "280" },
              ].map((m) => (
                <text key={m.l} x="-6" y={m.y + 3} fontFamily="Source Serif 4, serif" fontSize="8" fill="#5e574a" textAnchor="end">{m.l}</text>
              ))}
              {/* X labels L/min */}
              {[
                { x: 0, l: "1.0" },
                { x: 73, l: "1.5" },
                { x: 146, l: "2.0" },
                { x: 219, l: "2.5" },
                { x: 292, l: "3.0" },
                { x: 365, l: "3.5" },
              ].map((m) => (
                <text key={m.l} x={m.x} y="194" fontFamily="Source Serif 4, serif" fontSize="8" fill="#5e574a" textAnchor="middle">{m.l}</text>
              ))}
              <text x="220" y="216" fontFamily="Source Serif 4, serif" fontSize="9" fill="#2a2620" textAnchor="middle" fontStyle="italic">Secondary coolant flow rate (L/min per chassis)</text>
              <text x="-32" y="90" fontFamily="Source Serif 4, serif" fontSize="9" fill="#2a2620" textAnchor="middle" fontStyle="italic" transform="rotate(-90 -32 90)">tokens/s/GPU</text>

              {/* Curve - throughput, with a knee at ~2.4 L/min */}
              <path
                d="M0,160 L40,140 L80,118 L120,90 L160,68 L200,48 L210,42 L220,38 L240,34 L260,32 L300,30 L340,29 L380,28 L420,28"
                fill="none" stroke="oklch(0.55 0.13 230)" strokeWidth="2"
              />
              {/* knee marker */}
              <circle cx="205" cy="46" r="3" fill="oklch(0.55 0.13 230)" />
              <line x1="205" y1="46" x2="205" y2="0" stroke="oklch(0.55 0.13 230)" strokeWidth="0.6" strokeDasharray="3 3" />
              <text x="210" y="10" fontFamily="Source Serif 4, serif" fontSize="8" fill="oklch(0.45 0.13 230)" fontStyle="italic">knee @ 2.4 L/min</text>

              {/* secondary curve - pump power */}
              <path
                d="M0,170 L40,166 L80,160 L120,152 L160,140 L200,124 L240,104 L280,80 L320,52 L360,22 L400,-8"
                fill="none" stroke="oklch(0.6 0.13 30)" strokeWidth="1.5" strokeDasharray="4 3"
              />

              {/* data points */}
              {[
                [0, 160], [40, 140], [80, 118], [120, 90], [160, 68],
                [200, 48], [240, 34], [280, 31], [320, 30], [360, 29]
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="2" fill="oklch(0.55 0.13 230)" />
              ))}
            </g>
            {/* Legend */}
            <g transform="translate(310,28)">
              <rect x="0" y="0" width="180" height="34" fill="#fbf8f0" stroke="#d8d2c0" strokeWidth="0.5" />
              <line x1="10" y1="12" x2="26" y2="12" stroke="oklch(0.55 0.13 230)" strokeWidth="2" />
              <text x="32" y="15" fontFamily="Source Serif 4, serif" fontSize="8.5" fill="#2a2620">throughput (tokens/s/GPU)</text>
              <line x1="10" y1="25" x2="26" y2="25" stroke="oklch(0.6 0.13 30)" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x="32" y="28" fontFamily="Source Serif 4, serif" fontSize="8.5" fill="#2a2620">pump power (relative)</text>
            </g>
          </svg>
        </div>
        <div className="doc-caption">
          Figure 3: Sustained training throughput as a function of secondary coolant
          flow rate. A pronounced knee at 2.4&thinsp;L/min marks the point beyond
          which additional flow yields diminishing throughput returns while pump
          power continues to rise super-linearly.
        </div>
      </CitableBlock>

      <CitableBlock id="p5-recommendation" registerBlock={registerBlock} highlighted={hl("p5-recommendation")}>
        <p className="doc-p">
          We adopt 2.4&thinsp;L/min as the nominal setpoint for steady-state operation,
          with the adaptive controller permitted to surge to 3.0&thinsp;L/min for up
          to 90&thinsp;s during transient thermal events. Above 3.0&thinsp;L/min,
          pump-power cost crosses the savings threshold over the equivalent
          air-cooled baseline.
        </p>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 5</div>
    </>
  );
}

// ── PAGE 6: Conclusion ────────────────────────────────────────────────
function PageSix({ registerBlock, highlighted }) {
  const hl = (id) => highlighted === id;
  return (
    <>
      <CitableBlock id="p6-conclusion" registerBlock={registerBlock} highlighted={hl("p6-conclusion")}>
        <h2 className="doc-h2" style={{ marginTop: 0 }}>5. Conclusion</h2>
        <p className="doc-p">
          A hybrid RDHx + D2C topology successfully cools 80&thinsp;kW-class B200
          racks in production while keeping junction temperatures below
          78&thinsp;°C and reducing fan power by 54% versus the air-only baseline.
          The 2.4&thinsp;L/min knee in the flow-throughput curve provides a
          principled operating setpoint; an adaptive controller permits short
          excursions to 3.0&thinsp;L/min for thermal transients without crossing
          the pump-power break-even point.
        </p>
        <p className="doc-p">
          Future work should examine (a) coolant chemistry drift after 24 months in
          a closed loop, (b) the impact of stratified inlet temperatures on
          per-chassis throughput variance, and (c) generalization to 120&thinsp;kW
          racks anticipated for the next accelerator generation.
        </p>
      </CitableBlock>

      <CitableBlock id="p6-refs" registerBlock={registerBlock} highlighted={hl("p6-refs")}>
        <h3 className="doc-h3">References</h3>
        <ol style={{ fontSize: 10, fontFamily: "var(--font-doc)", lineHeight: 1.5, paddingLeft: 20, color: "var(--ink)" }}>
          <li style={{ marginBottom: 4 }}>ASHRAE TC 9.9. <i>Thermal Guidelines for Data Processing Environments</i>, 5th ed., 2021.</li>
          <li style={{ marginBottom: 4 }}>Patel, C. et al. "Smart cooling of data centers." <i>InterPACK</i>, 2019.</li>
          <li style={{ marginBottom: 4 }}>NVIDIA. <i>B200 SXM Thermal Design Guide</i>. NV-DG-09241, 2024.</li>
          <li style={{ marginBottom: 4 }}>Uptime Institute. <i>Global Data Center Survey 2023</i>, 2024.</li>
          <li style={{ marginBottom: 4 }}>Vasquez, R. and Sato, K. "Direct-to-chip retrofits at scale." <i>Hyperline Tech Memo HL-TM-22</i>, 2023.</li>
        </ol>
      </CitableBlock>

      <div className="doc-footer">Hyperline Labs · HL-TR-2025-014 · p. 6</div>
    </>
  );
}

// Map page index → component
const DOC_PAGES = [PageOne, PageTwo, PageThree, PageFour, PageFive, PageSix];
const DOC_PAGE_TITLES = [
  "Title & Abstract",
  "Introduction",
  "System Architecture",
  "Thermal Envelopes",
  "Performance Results",
  "Conclusion",
];

Object.assign(window, {
  CitableBlock,
  PageOne, PageTwo, PageThree, PageFour, PageFive, PageSix,
  DOC_PAGES, DOC_PAGE_TITLES,
});
