// viewer.jsx — PDF viewer pane: pages stack + thumbnail rail + top-bar controls
// Exposes Viewer + ViewerToolbar via window.

const PAGE_W = 620;   // CSS px at zoom = 1
const PAGE_H = 800;
const PAGE_PAD = 56;

function Icon({ name }) {
  // Hand-tuned tiny set; stroke-based for crisp dark UI
  const props = { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "chevron-left":  return <svg {...props}><path d="M10 3 5 8l5 5"/></svg>;
    case "chevron-right": return <svg {...props}><path d="M6 3l5 5-5 5"/></svg>;
    case "search":        return <svg {...props}><circle cx="7" cy="7" r="4"/><path d="M13 13l-3-3"/></svg>;
    case "download":      return <svg {...props}><path d="M8 2v8m-3-3 3 3 3-3"/><path d="M3 12v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1"/></svg>;
    case "share":         return <svg {...props}><circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="12" cy="12" r="1.5"/><path d="M5.3 7.2 10.7 4.8M5.3 8.8 10.7 11.2"/></svg>;
    case "print":         return <svg {...props}><path d="M4 6V3h8v3"/><rect x="2" y="6" width="12" height="6" rx="1"/><path d="M4 12v2h8v-2"/></svg>;
    case "plus":          return <svg {...props}><path d="M8 3v10M3 8h10"/></svg>;
    case "minus":         return <svg {...props}><path d="M3 8h10"/></svg>;
    case "fit":           return <svg {...props}><path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3"/></svg>;
    case "thumbs":        return <svg {...props}><rect x="3" y="3" width="4" height="4"/><rect x="9" y="3" width="4" height="4"/><rect x="3" y="9" width="4" height="4"/><rect x="9" y="9" width="4" height="4"/></svg>;
    case "sparkles":      return <svg {...props}><path d="M8 2v3M8 11v3M2 8h3M11 8h3"/><path d="M4.5 4.5 6 6M11.5 11.5 10 10M4.5 11.5 6 10M11.5 4.5 10 6"/></svg>;
    case "sidebar":       return <svg {...props}><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M6 3v10"/></svg>;
    case "send":          return <svg {...props}><path d="M3 8 13 3l-3 10-2-4-5-1Z"/></svg>;
    case "regenerate":    return <svg {...props}><path d="M13 4v3h-3"/><path d="M13 7a5 5 0 1 0-1.5 3.5"/></svg>;
    case "copy":          return <svg {...props}><rect x="5" y="5" width="8" height="8" rx="1"/><path d="M3 11V4a1 1 0 0 1 1-1h7"/></svg>;
    case "more":          return <svg {...props}><circle cx="3" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="13" cy="8" r="1"/></svg>;
    case "clear":         return <svg {...props}><path d="M3 5h10M5 5V3h6v2M6 5v8M10 5v8M4 5l1 9h6l1-9"/></svg>;
    case "settings":      return <svg {...props}><circle cx="8" cy="8" r="2.2"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.7 3.7l1 1M11.3 11.3l1 1M3.7 12.3l1-1M11.3 4.7l1-1"/></svg>;
    case "pin":           return <svg {...props}><path d="M8 2v6M5 8h6M6 8l-1 4 3-2 3 2-1-4"/></svg>;
    case "arrow-right":   return <svg {...props}><path d="M3 8h10M9 4l4 4-4 4"/></svg>;
    case "external":      return <svg {...props}><path d="M6 3H3v10h10v-3M9 3h4v4M8 8l5-5"/></svg>;
    default:              return null;
  }
}

function ViewerToolbar({
  currentPage, totalPages, onJumpPage, zoom, setZoom,
  panelPosition, citationStyle,
}) {
  const [pageInput, setPageInput] = React.useState(String(currentPage + 1));
  React.useEffect(() => { setPageInput(String(currentPage + 1)); }, [currentPage]);

  return (
    <div className="topbar">
      <div className="tb-left">
        <div className="brand">
          <div className="brand-mark" />
          <span>Foliate</span>
        </div>
        <div className="brand-sep" />
        <div className="doc-name">
          <b>HL-TR-2025-014</b> · Adaptive Liquid Cooling for High-Density GPU Clusters.pdf
        </div>
      </div>

      <div className="tb-center">
        <button className="tb-btn icon" title="Thumbnails (T)" onClick={() => window.dispatchEvent(new CustomEvent("foliate:toggleThumbs"))}>
          <Icon name="thumbs" />
        </button>
        <div className="page-pill">
          <div className="page-pill-btns">
            <button onClick={() => onJumpPage(Math.max(0, currentPage - 1))} title="Previous page"><Icon name="chevron-left" /></button>
          </div>
          <input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={() => {
              const n = parseInt(pageInput, 10);
              if (!Number.isNaN(n)) onJumpPage(Math.max(0, Math.min(totalPages - 1, n - 1)));
              else setPageInput(String(currentPage + 1));
            }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          />
          <span className="total">/ {totalPages}</span>
          <div className="page-pill-btns">
            <button onClick={() => onJumpPage(Math.min(totalPages - 1, currentPage + 1))} title="Next page"><Icon name="chevron-right" /></button>
          </div>
        </div>

        <div className="zoom-pill">
          <button onClick={() => setZoom(Math.max(0.5, +(zoom - 0.1).toFixed(2)))} title="Zoom out"><Icon name="minus" /></button>
          <span className="val">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(2, +(zoom + 0.1).toFixed(2)))} title="Zoom in"><Icon name="plus" /></button>
        </div>

        <button className="tb-btn icon" title="Fit to width" onClick={() => setZoom(1)}><Icon name="fit" /></button>
        <button className="tb-btn icon" title="Search"><Icon name="search" /></button>
      </div>

      <div className="tb-right">
        <button className="tb-btn icon" title="Print"><Icon name="print" /></button>
        <button className="tb-btn icon" title="Download"><Icon name="download" /></button>
        <button className="tb-btn" title="Share">
          <Icon name="share" /> Share
        </button>
        <div className="brand-sep" />
        <div className="avatar">RV</div>
      </div>
    </div>
  );
}

function Viewer({
  currentPage, setCurrentPage, highlightedBlock, registerBlock,
  zoom, scrollContainerRef, jumpSeq,
}) {
  const [showThumbs, setShowThumbs] = React.useState(true);

  React.useEffect(() => {
    const onToggle = () => setShowThumbs((v) => !v);
    window.addEventListener("foliate:toggleThumbs", onToggle);
    return () => window.removeEventListener("foliate:toggleThumbs", onToggle);
  }, []);

  // Track which page is centered in the viewport
  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const pages = el.querySelectorAll(".page");
      const center = el.scrollTop + el.clientHeight / 2;
      let best = 0, bestDist = Infinity;
      pages.forEach((p, i) => {
        const top = p.offsetTop;
        const mid = top + p.offsetHeight / 2;
        const d = Math.abs(mid - center);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setCurrentPage(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollContainerRef, setCurrentPage]);

  // Jump to a page via scroll
  const jumpToPage = (idx) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const pages = el.querySelectorAll(".page");
    const target = pages[idx];
    if (target) el.scrollTo({ top: target.offsetTop - 24, behavior: "smooth" });
  };

  // Re-trigger jump when jumpSeq changes (citation click)
  React.useEffect(() => {
    if (jumpSeq == null) return;
    jumpToPage(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpSeq]);

  const pageStyle = {
    "--page-w": PAGE_W + "px",
    "--page-h": PAGE_H + "px",
    "--page-pad": PAGE_PAD + "px",
    transform: `scale(${zoom})`,
  };

  return (
    <div className="viewer">
      {showThumbs && (
        <div className="thumbs" aria-label="Page thumbnails">
          {DOC_PAGES.map((_, i) => (
            <button
              key={i}
              className={"thumb" + (i === currentPage ? " active" : "")}
              onClick={() => jumpToPage(i)}
              title={`Page ${i + 1} — ${DOC_PAGE_TITLES[i]}`}
            >
              <div className="thumb-img" />
              <span className="thumb-num">{i + 1}</span>
            </button>
          ))}
        </div>
      )}

      <div className="viewer-scroll" ref={scrollContainerRef}
           style={{ paddingLeft: showThumbs ? 80 : 0 }}>
        <div className="pages-stack">
          {DOC_PAGES.map((Page, i) => (
            <div key={i} className="page" style={pageStyle} data-page-index={i}>
              <div className="page-num-tag">p.{i + 1}</div>
              <Page registerBlock={registerBlock} highlighted={highlightedBlock} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Viewer, ViewerToolbar, Icon, PAGE_W, PAGE_H });
