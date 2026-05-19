import Link from 'next/link';

const docs = [
  { title: 'Adaptive Liquid Cooling for High-Density GPU Clusters', meta: 'Hyperline Labs · 6 p', tag: 'Infrastructure' },
  { title: 'Q3 2025 Risk Disclosure', meta: 'Northwind Capital · 42 p', tag: 'Risk' },
  { title: 'Spectrum Analysis of MERIDIAN-7', meta: 'Quanta Research · 18 p', tag: 'Reading list' },
  { title: 'Patent · Lattice Compressor Stage', meta: 'USPTO · 34 p', tag: 'Patents' },
];

export default function HomePage() {
  return (
    <main className="grid min-h-[100dvh] grid-cols-1 bg-[var(--bg-base)] lg:grid-cols-[256px_1fr]">
      <aside className="border-b border-white/10 bg-[var(--bg-surface)] p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-2 pb-4">
          <div className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--text)] text-[var(--bg-base)] text-xs font-semibold">N</div>
          <span className="text-base font-semibold">Nib</span>
        </div>
        <Link href="/file" className="mb-4 flex w-full items-center justify-between rounded-lg bg-[var(--text)] px-3 py-2 text-sm font-medium text-[var(--bg-base)]">
          Upload PDF
          <span className="rounded bg-[var(--bg-base)] px-1.5 py-0.5 text-[10px] text-[var(--text-faint)]">U</span>
        </Link>
        <div className="space-y-1 text-sm text-[var(--text-dim)]">
          {['All documents', 'Recent', 'Starred', 'Shared with me', 'Trash'].map((item, index) => (
            <button key={item} className={`w-full rounded-md px-3 py-2 text-left ${index === 0 ? 'bg-[var(--bg-elevated)] text-[var(--text)]' : 'hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'}`} type="button">
              {item}
            </button>
          ))}
        </div>
      </aside>

      <section className="min-h-0 overflow-y-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 lg:px-8">
          <div className="w-full max-w-xl rounded-lg border border-white/10 bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-faint)]">
            Search documents, or ask anything across your library...
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-md border border-white/15 px-3 py-2 text-xs">Landing</Link>
            <Link href="/file" className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-medium text-[#0a1220]">Open reader</Link>
          </div>
        </header>

        <div className="px-5 py-8 lg:px-8">
          <div>
            <h1 className="font-serif text-4xl">Good afternoon, Riya.</h1>
            <p className="mt-2 text-sm text-[var(--text-dim)]">You have 3 documents with unread AI summaries and one paper you left mid-read.</p>
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-[var(--bg-surface)] p-6">
            <p className="text-xs text-[var(--accent-text)]">Continue reading</p>
            <h2 className="mt-2 font-serif text-3xl">Adaptive Liquid Cooling for High-Density GPU Clusters</h2>
            <p className="mt-2 text-sm text-[var(--text-dim)]">Page 4 of 6 · Last opened 2 hours ago</p>
            <div className="mt-5 flex gap-3">
              <Link href="/file" className="rounded-lg bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--bg-base)]">Resume reading</Link>
              <button className="rounded-lg border border-white/15 px-4 py-2 text-sm" type="button">Ask the document</button>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Library</h3>
            <div className="text-xs text-[var(--text-faint)]">24 documents</div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {docs.map((doc) => (
              <Link key={doc.title} href="/file" className="rounded-xl border border-white/10 bg-[var(--bg-surface)] p-4 transition hover:-translate-y-0.5 hover:border-white/20">
                <div className="mb-4 aspect-[4/3] rounded-md bg-gradient-to-b from-[#1d2129] to-[#15181f]" />
                <h4 className="font-serif text-lg leading-6">{doc.title}</h4>
                <p className="mt-1 text-xs text-[var(--text-faint)]">{doc.meta}</p>
                <span className="mt-3 inline-flex rounded bg-white/10 px-2 py-1 text-[10px] text-[var(--text-dim)]">{doc.tag}</span>
              </Link>
            ))}
            <button className="min-h-[280px] rounded-xl border border-dashed border-white/20 bg-transparent p-4 text-center text-sm text-[var(--text-dim)] transition hover:border-white/40 hover:bg-[var(--bg-surface)]" type="button">
              Drop a PDF or click to upload
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
