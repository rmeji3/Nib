'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { TextHighlight } from './hooks/use-nib-state';
import { motion, useAnimationControls } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { NibLogo as NibLogoBase } from '../../components/nib-logo';
export { NibLogoBase as NibLogo };
import { NibLogoSpinner } from '../../components/nib-logo-spinner';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { AnimatePresence } from 'framer-motion';
import { useUpload } from '../upload/upload-context';
import { useMergePdf } from './hooks/use-merge-pdf';
import { API_URL, getAuthHeaders, renameDocument } from '../../../lib/api/documents';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const PAGE_W = 620;

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Returns the text item as HTML, wrapping the first occurrence of `query`
 * in a <mark> tag so react-pdf's text layer renders it highlighted.
 * Falls back to plain escaped text when no match is found.
 */
function makeTextRenderer(query: string) {
  const lower = query.toLowerCase();
  return ({ str }: { str: string }) => {
    const idx = str.toLowerCase().indexOf(lower);
    if (idx === -1) return escapeHtml(str);
    return (
      escapeHtml(str.slice(0, idx)) +
      '<mark style="background:oklch(0.92 0.16 85/0.55);border-radius:2px;color:inherit;padding:0">' +
      escapeHtml(str.slice(idx, idx + query.length)) +
      '</mark>' +
      escapeHtml(str.slice(idx + query.length))
    );
  };
}

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
    case 'home':
      return <svg {...props}><path d="M2.5 8 8 3l5.5 5" /><path d="M4.5 7.5v5.5h7V7.5" /></svg>;
    case 'close':
      return <svg {...props}><path d="M4 4l8 8M12 4l-8 8" /></svg>;
    default:
      return null;
  }
}

export function ViewerToolbar({
  currentPage,
  onJumpPage,
  zoom,
  setZoom,
  totalPages,
  chatMinimized,
  onToggleChat,
}: {
  currentPage: number;
  onJumpPage: (index: number) => void;
  zoom: number;
  setZoom: (value: number) => void;
  totalPages: number;
  chatMinimized: boolean;
  onToggleChat: () => void;
}) {
  const router = useRouter();
  const { file, documentId, documentUrl, documentName, setDocument } = useUpload();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameDocument(documentId!, name),
    onSuccess: (data) => {
      const newName = data.originalFilename.replace(/\.pdf$/i, '');
      setDocument(file, documentId, documentUrl, newName);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Logo spin animation
  const logoControls = useAnimationControls();
  const logoAnimating = useRef(false);

  const triggerLogoSpin = async (direction: 1 | -1) => {
    if (logoAnimating.current) return;
    logoAnimating.current = true;
    try {
      await logoControls.start({
        rotate: direction * 360,
        scale: [1, direction === 1 ? 1.3 : 1.15, 1],
        transition: {
          rotate: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
          scale: { duration: 0.45, times: [0, 0.4, 1], ease: 'easeOut' },
        },
      });
    } finally {
      logoControls.set({ rotate: 0 });
      logoAnimating.current = false;
    }
  };

  const startEdit = () => {
    if (!documentId) return;
    setEditValue(documentName ?? '');
    setIsEditing(true);
    // Focus after state settles
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== documentName) {
      renameMutation.mutate(trimmed);
    }
  };

  const iconButtonClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[var(--text-dim)] transition hover:border-white/10 hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]';
  const buttonClass =
    'inline-flex h-7 items-center justify-center gap-1 rounded-md border border-transparent px-2 text-[12.5px] text-[var(--text-dim)] transition hover:border-white/10 hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]';

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 bg-[var(--bg-base)] px-3.5">
      <div className="flex items-center gap-2">
        {/* Logo + wordmark — single clickable button with spin-on-hover logo */}
        <button
          type="button"
          onClick={() => router.push('/home')}
          title="Go home"
          onMouseEnter={() => triggerLogoSpin(1)}
          onMouseLeave={() => triggerLogoSpin(-1)}
          className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13.5px] font-semibold text-[var(--text)] transition hover:bg-white/5"
        >
          <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[var(--text)] text-[var(--bg-base)]">
            <motion.span animate={logoControls} className="inline-flex">
              <NibLogoBase size={13} />
            </motion.span>
          </span>
          Nib
        </button>
        <div className="mx-1 h-4 w-px bg-white/15" />
        <div className="max-w-[360px] text-[13px] text-[var(--text-dim)]">
          {isEditing ? (
            /*
             * Auto-sizing input: a hidden <span> mirroring the value lives in the same
             * CSS grid cell — the grid sizes to the span, the input fills that cell.
             * No JS measurement needed.
             */
            <div className="grid max-w-[360px]">
              <span
                aria-hidden="true"
                className="invisible col-start-1 row-start-1 whitespace-pre rounded border border-transparent px-1.5 py-0.5 text-[13px] font-semibold"
              >
                {editValue || ' '}
              </span>
              <input
                ref={titleInputRef}
                value={editValue}
                maxLength={80}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.currentTarget.blur(); }
                  if (e.key === 'Escape') { setIsEditing(false); }
                }}
                className="col-start-1 row-start-1 min-w-[8ch] rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-[13px] font-semibold text-[var(--text)] outline-none focus:border-white/40"
                autoFocus
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              title={documentId ? 'Click to rename' : undefined}
              className={`overflow-hidden text-ellipsis whitespace-nowrap font-semibold ${documentId ? 'hover:text-[var(--text)] cursor-text' : 'cursor-default opacity-50 italic'}`}
            >
              {documentName ?? (file ? file.name.replace(/\.pdf$/i, '') : 'No document')}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button className={iconButtonClass} type="button" title="Thumbnails (T)" onClick={() => window.dispatchEvent(new CustomEvent('nib:toggle-thumbs'))}>
          <Icon name="thumbs" />
        </button>
        <div className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-[var(--bg-surface)] px-1 pl-2.5 text-xs text-[var(--text-dim)]">
          <div className="flex">
            <button className="inline-flex h-[22px] w-[22px] items-center justify-center rounded text-[var(--text-dim)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]" type="button" title="Previous page" onClick={() => onJumpPage(Math.max(0, currentPage - 1))}>
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
            className="w-7 bg-transparent text-center text-[var(--text)] outline-none"
          />
          <span>/ {totalPages}</span>
          <div className="flex">
            <button className="inline-flex h-[22px] w-[22px] items-center justify-center rounded text-[var(--text-dim)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]" type="button" title="Next page" onClick={() => onJumpPage(Math.min(totalPages - 1, currentPage + 1))}>
              <Icon name="chevron-right" />
            </button>
          </div>
        </div>

        <div className="inline-flex h-7 items-center rounded-md border border-white/10 bg-[var(--bg-surface)]">
          <button className="inline-flex h-full w-[26px] items-center justify-center text-[var(--text-dim)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]" type="button" title="Zoom out" onClick={() => setZoom(Math.max(0.5, Number((zoom - 0.1).toFixed(2))))}>
            <Icon name="minus" />
          </button>
          <span className="w-11 text-center text-xs text-[var(--text-dim)]">{Math.round(zoom * 100)}%</span>
          <button className="inline-flex h-full w-[26px] items-center justify-center text-[var(--text-dim)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]" type="button" title="Zoom in" onClick={() => setZoom(Math.min(2, Number((zoom + 0.1).toFixed(2))))}>
            <Icon name="plus" />
          </button>
        </div>

        <button className={iconButtonClass} type="button" title="Fit to width" onClick={() => setZoom(1)}>
          <Icon name="fit" />
        </button>
        <button className={iconButtonClass} type="button" title="Search">
          <Icon name="search" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <button className={iconButtonClass} type="button" title="Print"><Icon name="print" /></button>
        <button className={iconButtonClass} type="button" title="Download"><Icon name="download" /></button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={iconButtonClass} type="button" title="Share">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 10V3M5 6l3-3 3 3" />
                <path d="M3 10v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => { navigator.clipboard.writeText(window.location.href); }}
              className="gap-2.5"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1" /><path d="M3 11V4a1 1 0 0 1 1-1h7" /></svg>
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { window.open(`mailto:?subject=Check out this document&body=${window.location.href}`); }}
              className="gap-2.5"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="1.5" /><path d="M1 5l7 5 7-5" /></svg>
              Share via email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2.5">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h10M8 2v8M5 7l3 3 3-3" /></svg>
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2.5">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="1" /><path d="M5 8h2M9 8h2M5 11h6" /></svg>
              Copy embed code
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="mx-1 h-4 w-px bg-white/15" />
        <button
          className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium transition nib-fab-btn ${
            chatMinimized
              ? 'border-transparent text-[var(--text-dim)] hover:border-white/10 hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'
              : 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
          }`}
          type="button"
          title={chatMinimized ? 'Open chat' : 'Close chat'}
          onClick={onToggleChat}
        >
          <NibLogoBase size={13} />
          Chat
        </button>
        <div className="mx-1 h-4 w-px bg-white/15" />
        <div className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-fuchsia-500 text-[11px] font-semibold text-white">RV</div>
      </div>
    </div>
  );
}

export function Viewer({
  currentPage,
  totalPages,
  onPageCountChange,
  setCurrentPage,
  zoom,
  setZoom,
  scrollContainerRef,
  highlight,
}: {
  currentPage: number;
  totalPages: number;
  onPageCountChange: (count: number) => void;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  zoom: number;
  setZoom: (value: number) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  highlight?: TextHighlight | null;
}) {
  const [showThumbs, setShowThumbs] = useState(true);
  const { file, documentId, documentName } = useUpload();
  const mergeMutation = useMergePdf();

  const thumbScrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: totalPages,
    getScrollElement: () => thumbScrollRef.current,
    estimateSize: () => 100, // thumbnail height + gap
    overscan: 3,
  });

  // Pre-fetch the PDF as a blob URL so the Authorization header is sent through
  // a standard fetch() call rather than relying on PDF.js worker header passing
  // (which drops headers intermittently).
  const [blobUrl, setBlobUrl] = useState<string | undefined>(undefined);
  const [isFetchingPdf, setIsFetchingPdf] = useState(false);
  const activeBlobRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Local File takes full priority — no network needed
    if (file) {
      if (activeBlobRef.current) {
        URL.revokeObjectURL(activeBlobRef.current);
        activeBlobRef.current = undefined;
      }
      setBlobUrl(undefined);
      setIsFetchingPdf(false);
      return;
    }

    if (!documentId) {
      setBlobUrl(undefined);
      setIsFetchingPdf(false);
      return;
    }

    let cancelled = false;
    setIsFetchingPdf(true);
    setBlobUrl(undefined);

    fetch(`${API_URL}/api/v1/documents/${documentId}/content`, {
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        if (activeBlobRef.current) URL.revokeObjectURL(activeBlobRef.current);
        const url = URL.createObjectURL(blob);
        activeBlobRef.current = url;
        setBlobUrl(url);
        setIsFetchingPdf(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[PDF] fetch error:', err);
          setIsFetchingPdf(false);
        }
      });

    return () => { cancelled = true; };
  }, [file, documentId]);

  // Revoke blob URL on unmount
  useEffect(() => () => {
    if (activeBlobRef.current) URL.revokeObjectURL(activeBlobRef.current);
  }, []);

  const pdfSource: File | string | undefined = file ?? blobUrl;
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleToggle = () => setShowThumbs((value) => !value);
    window.addEventListener('nib:toggle-thumbs', handleToggle);
    return () => window.removeEventListener('nib:toggle-thumbs', handleToggle);
  }, []);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) {
      return;
    }

    const onScroll = (e: Event) => {
      const container = scrollContainerRef.current;
      if (!container || e.target !== container) return;

      const pages = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page-wrap'));
      const containerRect = container.getBoundingClientRect();
      const center = containerRect.top + containerRect.height / 2;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      pages.forEach((page, index) => {
        const rect = page.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const distance = Math.abs(midpoint - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      setCurrentPage(bestIndex);
    };

    outer.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => outer.removeEventListener('scroll', onScroll, { capture: true });
  }, [scrollContainerRef, setCurrentPage]);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newZoom = Math.max(0.5, Math.min(2.5, Number((zoom + delta).toFixed(2))));
        setZoom(newZoom);
      }
    };

    outer.addEventListener('wheel', handleWheel, { passive: false });
    return () => outer.removeEventListener('wheel', handleWheel);
  }, [setZoom, zoom]);

  const jumpToPage = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const target = container.querySelector<HTMLElement>(`.pdf-page-wrap[data-page-index="${index}"]`);
    if (target) {
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      container.scrollBy({ top: targetRect.top - containerRect.top - 24, behavior: 'smooth' });
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1) {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = 'grabbing';
      // Prevent the default middle-click auto-scroll icon
      e.preventDefault();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingRef.current && scrollContainerRef.current) {
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      scrollContainerRef.current.scrollLeft -= dx;
      scrollContainerRef.current.scrollTop -= dy;
      startPosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.button === 1 && isDraggingRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      isDraggingRef.current = false;
      document.body.style.cursor = '';
    }
  };

  return (
    <div
      ref={outerRef}
      className="relative h-full overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(110,168,255,0.04),transparent_60%)]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {isFetchingPdf && !file && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-base)]">
          <NibLogoSpinner size={26} label="Loading PDF" />
        </div>
      )}
      <Document
          file={pdfSource}
          loading={null}
          onLoadSuccess={({ numPages }) => onPageCountChange(numPages)}
          onLoadError={(err) => console.error('[PDF] load error:', err)}
          className="h-full w-full"
      >
        {/*
         * Thumbnail panel — rendered inside <Document> so <Page> thumbnails receive
         * react-pdf's DocumentContext. position:fixed keeps it viewport-anchored without
         * a portal, which means zero scroll-lock involvement (no Radix Dialog, no vaul).
         */}
        <AnimatePresence>
          {showThumbs && totalPages > 0 && (
            <motion.div
              key="thumb-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 36, mass: 0.8 }}
              className="fixed bottom-0 left-0 z-20 flex w-[80px] flex-col overflow-hidden border-r border-white/8 bg-[var(--bg-base)]"
              style={{ top: '48px' /* matches NibApp grid-rows-[48px_1fr] toolbar */ }}
            >
              {/* Scrollable thumbnail list */}
              <div ref={thumbScrollRef} className="flex flex-1 flex-col overflow-y-auto py-3 px-[10px]">
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const index = virtualRow.index;
                    return (
                      <button
                        key={virtualRow.key}
                        type="button"
                        className={`thumb${index === currentPage ? ' active' : ''}`}
                        onClick={() => jumpToPage(index)}
                        title={`Page ${index + 1}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <div className="thumb-img flex items-center justify-center overflow-hidden">
                          <Page
                            pageNumber={index + 1}
                            width={50}
                            devicePixelRatio={1}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                          />
                        </div>
                        <span className="thumb-num">{index + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Separator + combine button */}
              <div className="shrink-0 border-t border-white/10 pt-2 pb-3 flex flex-col items-center gap-1">
                {mergeMutation.isError && (
                  <p className="text-[10px] text-red-400 px-2 text-center leading-tight">
                    {(mergeMutation.error as Error).message}
                  </p>
                )}
                <button
                  type="button"
                  title={mergeMutation.isPending ? 'Merging…' : 'Combine PDF'}
                  disabled={mergeMutation.isPending}
                  onClick={() => !mergeMutation.isPending && document.getElementById('thumb-combine-input')?.click()}
                  className="flex w-full items-center justify-center rounded-md py-1.5 text-[var(--text-faint)] transition hover:bg-white/5 hover:text-[var(--text-dim)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mergeMutation.isPending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <path d="M8 2v12M2 8h12" />
                    </svg>
                  )}
                </button>
                <input
                  id="thumb-combine-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) mergeMutation.mutate(picked);
                    e.target.value = '';
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* paddingLeft shifts content right when the panel is open, in sync with the spring */}
        <div
          className="h-full overflow-auto px-0 pb-20 pt-7"
          ref={scrollContainerRef}
          style={{
            paddingLeft: showThumbs && totalPages > 0 ? 80 : 0,
            transition: 'padding-left 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <div className="flex flex-col items-center gap-6 min-w-full w-max px-12 py-24">
            {Array.from({ length: totalPages }, (_, index) => (
              <div
                key={`pdf-page-${index + 1}`}
                className="pdf-page-wrap"
                data-page-index={index}
                style={{ zoom }}
              >
                <div className="page-num-tag">p.{index + 1}</div>
                <div className="pdf-page">
                  <Page
                    pageNumber={index + 1}
                    width={PAGE_W}
                    devicePixelRatio={Math.max(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}
                    renderAnnotationLayer={false}
                    customTextRenderer={
                      highlight && highlight.pageIndex === index
                        ? makeTextRenderer(highlight.query)
                        : undefined
                    }
                  />
                </div>
              </div>
            ))}
            {totalPages === 0 ? (
              <div className="pdf-page-wrap">
                <div className="pdf-page flex min-h-[500px] w-[620px] flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-[var(--bg-base)] text-sm text-[var(--text-dim)]">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {pdfSource ? 'Failed to load PDF' : 'No document selected'}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Document>
      {/* Floating add-document FAB removed — now lives in thumbnail bar */}
    </div>
  );
}
