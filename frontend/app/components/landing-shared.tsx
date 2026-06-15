export const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

export const mmRows = [
  { tag: 'TEXT',    tagCls: 'text-[oklch(0.45_0.1_240)] bg-[oklch(0.93_0.04_240)] dark:text-[oklch(0.85_0.04_240)] dark:bg-[oklch(0.4_0.05_240/0.25)]', name: 'Section 2.1 Heat-Path Split',                 meta: 'p.3 · 8 sentences' },
  { tag: 'TABLE',   tagCls: 'text-[oklch(0.45_0.13_150)] bg-[oklch(0.93_0.07_150)] dark:text-[oklch(0.86_0.09_150)] dark:bg-[oklch(0.4_0.08_150/0.25)]', name: 'Per-rack thermal envelopes',            meta: 'p.4 · 6 rows x 6 cols' },
  { tag: 'CHART',   tagCls: 'text-[oklch(0.5_0.13_60)] bg-[oklch(0.93_0.08_60)] dark:text-[oklch(0.86_0.1_60)] dark:bg-[oklch(0.4_0.08_60/0.25)]',  name: 'Throughput vs. flow rate',             meta: 'p.5 · 2 series' },
  { tag: 'FIGURE',  tagCls: 'text-[oklch(0.5_0.15_310)] bg-[oklch(0.93_0.06_310)] dark:text-[oklch(0.85_0.09_310)] dark:bg-[oklch(0.4_0.08_310/0.25)]', name: 'Two-stage cooling loop',               meta: 'p.3 · schematic' },
  { tag: 'CAPTION', tagCls: 'text-[oklch(0.5_0.13_30)] bg-[oklch(0.93_0.06_30)] dark:text-[oklch(0.82_0.05_30)] dark:bg-[oklch(0.4_0.06_30/0.25)]',  name: '"Figure 1: Two-stage cooling loop..."', meta: 'p.3 · refs Section 2' },
  { tag: 'TEXT',    tagCls: 'text-[oklch(0.45_0.1_240)] bg-[oklch(0.93_0.04_240)] dark:text-[oklch(0.85_0.04_240)] dark:bg-[oklch(0.4_0.05_240/0.25)]', name: '5. Conclusion',                        meta: 'p.6 · 4 sentences' },
];
