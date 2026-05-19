'use client';

import { useEffect, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { DOC_PAGES, DOC_PAGE_TITLES } from './foliate-doc-content';
import type { PageComponentProps } from './foliate-doc-content';
import type { CitationStyle, PanelPosition } from './foliate-types';

export const PAGE_W = 620;
export const PAGE_H = 800;
export const PAGE_PAD = 56;

export function Icon({ name }: { name: string }) {
  const props = {
    width: 14,
    height: 14,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'chevron-left':
      return <svg {...props}><path d="M10 3 5 8l5 5" /></svg>;
    case 'chevron-right':
      return <svg {...props}><path d="M6 3l5 5-5 5" /></svg>;
    case 'search':
      return <svg {...props}><circle cx="7" cy="7" r="4" /><path d="M13 13l-3-3" /></svg>;
    case 'download':
      return <svg {...props}><path d="M8 2v8m-3-3 3 3 3-3" /><path d="M3 12v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" /></svg>;
    case 'share':
      return <svg {...props}><circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="4" r="1.5" /><circle cx="12" cy="12" r="1.5" /><path d="M5.3 7.2 10.7 4.8M5.3 8.8 10.7 11.2" /></svg>;
    case 'print':
      return <svg {...props}><path d="M4 6V3h8v3" /><rect x="2" y="6" width="12" height="6" rx="1" /><path d="M4 12v2h8v-2" /></svg>;
    case 'plus':
      return <svg {...props}><path d="M8 3v10M3 8h10" /></svg>;
    case 'minus':
      return <svg {...props}><path d="M3 8h10" /></svg>;
    case 'fit':
      return <svg {...props}><path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" /></svg>;
    case 'thumbs':
      return <svg {...props}><rect x="3" y="3" width="4" height="4" /><rect x="9" y="3" width="4" height="4" /><rect x="3" y="9" width="4" height="4" /><rect x="9" y="9" width="4" height="4" /></svg>;
    case 'sparkles':
      return <svg {...props}><path d="M8 2v3M8 11v3M2 8h3M11 8h3" /><path d="M4.5 4.5 6 6M11.5 11.5 10 10M4.5 11.5 6 10M11.5 4.5 10 6" /></svg>;
    case 'send':
      return <svg {...props}><path d="M3 8 13 3l-3 10-2-4-5-1Z" /></svg>;
    case 'regenerate':
      return <svg {...props}><path d="M13 4v3h-3" /><path d="M13 7a5 5 0 1 0-1.5 3.5" /></svg>;
    case 'copy':
      return <svg {...props}><rect x="5" y="5" width="8" height="8" rx="1" /><path d="M3 11V4a1 1 0 0 1 1-1h7" /></svg>;
    case 'more':
      return <svg {...props}><circle cx="3" cy="8" r="1" /><circle cx="8" cy="8" r="1" /><circle cx="13" cy="8" r="1" /></svg>;
    case 'clear':
      return <svg {...props}><path d="M3 5h10M5 5V3h6v2M6 5v8M10 5v8M4 5l1 9h6l1-9" /></svg>;
    case 'settings':
      return <svg {...props}><circle cx="8" cy="8" r="2.2" /><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.7 3.7l1 1M11.3 11.3l1 1M3.7 12.3l1-1M11.3 4.7l1-1" /></svg>;
    case 'arrow-right':
      return <svg {...props}><path d="M3 8h10M9 4l4 4-4 4" /></svg>;
    default:
      return null;
  }
}

export function ViewerToolbar({
  currentPage,
  totalPages,
  onJumpPage,
  zoom,
  setZoom,
}: {
  currentPage: number;
  totalPages: number;
  onJumpPage: (index: number) => void;
  zoom: number;
  setZoom: (value: number) => void;
  panelPosition: PanelPosition;
  citationStyle: CitationStyle;
}) {
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
        <button className="tb-btn icon" type="button" title="Thumbnails (T)" onClick={() => window.dispatchEvent(new CustomEvent('foliate:toggle-thumbs'))}>
          <Icon name="thumbs" />
        </button>
        <div className="page-pill">
          <div className="page-pill-btns">
            <button type="button" title="Previous page" onClick={() => onJumpPage(Math.max(0, currentPage - 1))}>
              <Icon name="chevron-left" />
            </button>
          </div>
          <input
            key={currentPage}
            defaultValue={currentPage + 1}
            onBlur={(event) => {
              const page = Number.parseInt(event.currentTarget.value, 10);
              if (Number.isNaN(page)) {
                return;
              }
              onJumpPage(Math.max(0, Math.min(totalPages - 1, page - 1)));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
          <span className="total">/ {totalPages}</span>
          <div className="page-pill-btns">
            <button type="button" title="Next page" onClick={() => onJumpPage(Math.min(totalPages - 1, currentPage + 1))}>
              <Icon name="chevron-right" />
            </button>
          </div>
        </div>

        <div className="zoom-pill">
          <button type="button" title="Zoom out" onClick={() => setZoom(Math.max(0.5, Number((zoom - 0.1).toFixed(2))))}>
            <Icon name="minus" />
          </button>
          <span className="val">{Math.round(zoom * 100)}%</span>
          <button type="button" title="Zoom in" onClick={() => setZoom(Math.min(2, Number((zoom + 0.1).toFixed(2))))}>
            <Icon name="plus" />
          </button>
        </div>

        <button className="tb-btn icon" type="button" title="Fit to width" onClick={() => setZoom(1)}>
          <Icon name="fit" />
        </button>
        <button className="tb-btn icon" type="button" title="Search">
          <Icon name="search" />
        </button>
      </div>

      <div className="tb-right">
        <button className="tb-btn icon" type="button" title="Print"><Icon name="print" /></button>
        <button className="tb-btn icon" type="button" title="Download"><Icon name="download" /></button>
        <button className="tb-btn" type="button" title="Share"><Icon name="share" /> Share</button>
        <div className="brand-sep" />
        <div className="avatar">RV</div>
      </div>
    </div>
  );
}

export function Viewer({
  currentPage,
  setCurrentPage,
  highlightedBlockId,
  highlightVersion,
  registerBlock,
  zoom,
  scrollContainerRef,
}: {
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  highlightedBlockId: string | null;
  highlightVersion: number;
  registerBlock: PageComponentProps['registerBlock'];
  zoom: number;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const [showThumbs, setShowThumbs] = useState(true);

  useEffect(() => {
    const handleToggle = () => setShowThumbs((value) => !value);
    window.addEventListener('foliate:toggle-thumbs', handleToggle);
    return () => window.removeEventListener('foliate:toggle-thumbs', handleToggle);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const onScroll = () => {
      const pages = Array.from(container.querySelectorAll<HTMLElement>('.page'));
      const center = container.scrollTop + container.clientHeight / 2;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      pages.forEach((page, index) => {
        const midpoint = page.offsetTop + page.offsetHeight / 2;
        const distance = Math.abs(midpoint - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      setCurrentPage(bestIndex);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef, setCurrentPage]);

  const jumpToPage = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const pages = container.querySelectorAll<HTMLElement>('.page');
    const target = pages[index];
    if (target) {
      container.scrollTo({ top: target.offsetTop - 24, behavior: 'smooth' });
    }
  };

  return (
    <div className="viewer">
      {showThumbs ? (
        <div className="thumbs" aria-label="Page thumbnails">
          {DOC_PAGES.map((_, index) => (
            <button
              key={DOC_PAGE_TITLES[index]}
              type="button"
              className={`thumb${index === currentPage ? ' active' : ''}`}
              onClick={() => jumpToPage(index)}
              title={`Page ${index + 1} — ${DOC_PAGE_TITLES[index]}`}
            >
              <div className="thumb-img" />
              <span className="thumb-num">{index + 1}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="viewer-scroll" ref={scrollContainerRef} style={{ paddingLeft: showThumbs ? 80 : 0 }}>
        <div className="pages-stack">
          {DOC_PAGES.map((PageComponent, index) => (
            <div
              key={DOC_PAGE_TITLES[index]}
              className="page"
              data-page-index={index}
              style={{
                '--page-w': `${PAGE_W}px`,
                '--page-h': `${PAGE_H}px`,
                '--page-pad': `${PAGE_PAD}px`,
                transform: `scale(${zoom})`,
              } as React.CSSProperties}
            >
              <div className="page-num-tag">p.{index + 1}</div>
              <PageComponent
                registerBlock={registerBlock}
                highlightedBlockId={highlightedBlockId}
                highlightVersion={highlightVersion}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}