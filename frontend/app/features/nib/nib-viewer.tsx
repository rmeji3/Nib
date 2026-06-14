'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { TextHighlight } from './hooks/use-nib-state';
import { motion, useAnimationControls } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BorderBeam } from 'border-beam';
import { NibLogo as NibLogoBase } from '../../components/nib-logo';
export { NibLogoBase as NibLogo };
import { NibLogoSpinner } from '../../components/nib-logo-spinner';
import { IndexingProgressBar } from '../../components/indexing-progress-bar';
import { useIndexingDisplay } from './hooks/use-indexing-display-progress';
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
import { useAuth } from '../auth/hooks/use-auth';
import { UserMenu } from '../../home/components/user-menu';
import { useSettings } from '../../settings/hooks/use-settings';

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

/**
 * Absolutely-positioned rectangle that draws a highlight over a region of the
 * rendered PDF page. Coords come from the backend in PDF user units (top-left
 * origin); we scale uniformly using PAGE_W / pageWidth since the Page renders
 * at fixed PAGE_W and preserves aspect ratio.
 *
 * Pointer-events disabled so the overlay never blocks PDF interactions.
 */
function BboxOverlay({
  highlight,
}: {
  highlight: Extract<TextHighlight, { kind: 'bbox' }>;
}) {
  const scale = PAGE_W / highlight.pageWidth;
  const left = highlight.bbox.x * scale;
  const top = highlight.bbox.y * scale;
  const width = highlight.bbox.width * scale;
  const height = highlight.bbox.height * scale;

  // Render a stable key per (page, bbox) so the pulse animation re-fires on
  // each new citation click but not on unrelated re-renders.
  const animKey = `${highlight.pageIndex}-${left}-${top}-${width}-${height}`;

  return (
    <motion.div
      key={animKey}
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className="pointer-events-none absolute rounded-[2px]"
      style={{
        left,
        top,
        width,
        height,
        background: 'oklch(0.92 0.16 85 / 0.30)',
        boxShadow:
          '0 0 0 1.5px oklch(0.78 0.18 75 / 0.85), 0 0 16px -2px oklch(0.78 0.18 75 / 0.55)',
        mixBlendMode: 'multiply',
      }}
      aria-hidden="true"
    />
  );
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
    case 'check':
      return <svg {...props}><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>;
    case 'flag':
      return <svg {...props}><path d="M4 13V3" /><path d="M4 3h7l-1 2 1 2H4" /></svg>;
    case 'more':
      return <svg {...props}><circle cx="3" cy="8" r="1" /><circle cx="8" cy="8" r="1" /><circle cx="13" cy="8" r="1" /></svg>;
    case 'clear':
      return <svg {...props}><path d="M3 5h10M5 5V3h6v2M6 5v8M10 5v8M4 5l1 9h6l1-9" /></svg>;
    case 'trash':
      return <svg {...props}><path d="M3 5h10M5 5V3h6v2M6 7v6M10 7v6M4 5l1 9h6l1-9" /></svg>;
    case 'new-chat':
      return <svg {...props}><path d="M3 4.5A2.5 2.5 0 0 1 5.5 2h5A2.5 2.5 0 0 1 13 4.5v3A2.5 2.5 0 0 1 10.5 10H8l-3 3v-3A2 2 0 0 1 3 8V4.5Z" /><path d="M8 4.2v3.6M6.2 6h3.6" /></svg>;
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
  searchQuery,
  setSearchQuery,
  onSearchPrev,
  onSearchNext,
  isSearching,
  matchCount,
  currentMatchIndex,
}: {
  currentPage: number;
  onJumpPage: (index: number) => void;
  zoom: number;
  setZoom: (value: number) => void;
  totalPages: number;
  chatMinimized: boolean;
  onToggleChat: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchPrev: () => void;
  onSearchNext: () => void;
  isSearching: boolean;
  matchCount: number;
  currentMatchIndex: number;
}) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { file, documentId, documentUrl, documentName, setDocument } = useUpload();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpenSearch = () => setShowSearch(true);
    window.addEventListener('nib:open-search', handleOpenSearch);
    return () => window.removeEventListener('nib:open-search', handleOpenSearch);
  }, []);

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameDocument(documentId!, name),
    onSuccess: (data) => {
      const newName = data.originalFilename.replace(/\.pdf$/i, '');
      setDocument(file, documentId, documentUrl, newName);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleRename = () => {
    setIsEditing(false);
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== documentName) {
      renameMutation.mutate(trimmed);
    }
  };

  const iconButtonClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[var(--text-dim)] transition hover:border-white/10 hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]';

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 bg-[var(--bg-base)] px-3.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push('/home')}
          title="Go home"
          className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13.5px] font-semibold text-[var(--text)] transition hover:bg-white/5"
        >
          <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[var(--text)] text-[var(--bg-base)]">
            <NibLogoBase size={13} />
          </span>
          Nib
        </button>
        <div className="mx-1 h-4 w-px bg-white/15" />
        <button
          className={iconButtonClass}
          type="button"
          title="Back to home"
          onClick={() => {
            setDocument(null, null, null, null);
            router.push('/home');
          }}
        >
          <Icon name="chevron-left" />
        </button>
        <button
          className={iconButtonClass}
          type="button"
          title="Toggle thumbnails"
          onClick={() => window.dispatchEvent(new CustomEvent('nib:toggle-thumbs'))}
        >
          <Icon name="thumbs" />
        </button>
        <div className="mx-1 h-4 w-px bg-white/15" />
        {isEditing ? (
          <input
            type="text"
            className="h-7 rounded border border-white/20 bg-white/5 px-2 text-sm text-[var(--text)] outline-none focus:border-white/40"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setIsEditing(false);
                setTitleInput(documentName || '');
              }
            }}
            autoFocus
          />
        ) : (
          <button
            className="max-w-[200px] truncate rounded px-2 py-1 text-left text-sm font-semibold text-[var(--text)] hover:bg-white/5"
            onClick={() => {
              if (documentId) {
                setTitleInput(documentName || '');
                setIsEditing(true);
              }
            }}
          >
            {documentName || 'Untitled Document'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 flex-1">
        <div className="inline-flex h-7 items-center rounded-md border border-white/10 bg-[var(--bg-surface)] px-1 text-xs text-[var(--text-dim)]">
          <div className="flex">
            <button className="inline-flex h-[22px] w-[22px] items-center justify-center rounded text-[var(--text-dim)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]" type="button" title="Previous page" onClick={() => onJumpPage(Math.max(0, currentPage - 1))}>
              <Icon name="chevron-left" />
            </button>
          </div>
          <input
            type="text"
            value={currentPage + 1}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                onJumpPage(val - 1);
              }
            }}
            onFocus={(e) => e.target.select()}
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
        
        {showSearch && (
          <div className="flex items-center gap-1.5 ml-2 h-7 rounded-md border border-white/20 bg-white/5 px-2 text-xs">
            <input 
              type="text" 
              placeholder="Find..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-24 bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--text-faint)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearchNext();
                if (e.key === 'Escape') {
                  setShowSearch(false);
                  setSearchQuery('');
                }
              }}
            />
            {isSearching ? (
              <span className="text-[10px] text-[var(--text-faint)] flex items-center w-8 justify-center">
                <span className="h-2 w-2 animate-spin rounded-full border-2 border-[var(--text-faint)] border-t-transparent" />
              </span>
            ) : (
              <span className="text-[10px] text-[var(--text-faint)] tabular-nums w-8 text-center">
                {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : '0/0'}
              </span>
            )}
            <button className="text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-50" disabled={matchCount === 0} onClick={onSearchPrev}>
              <Icon name="chevron-left" />
            </button>
            <button className="text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-50" disabled={matchCount === 0} onClick={onSearchNext}>
              <Icon name="chevron-right" />
            </button>
            <div className="h-3 w-px bg-white/20 mx-0.5" />
            <button className="text-[var(--text-dim)] hover:text-[var(--text)]" onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
              <Icon name="close" />
            </button>
          </div>
        )}
        
        {!showSearch && (
          <button className={iconButtonClass} type="button" title="Search" onClick={() => setShowSearch(true)}>
            <Icon name="search" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <button 
          className={iconButtonClass} 
          type="button" 
          title="Print"
          onClick={async () => {
            const printUrl = async () => {
              if (file) return URL.createObjectURL(file);
              if (documentId) {
                const res = await fetch(`${API_URL}/api/v1/documents/${documentId}/content`, { headers: getAuthHeaders() });
                if (!res.ok) throw new Error('Fetch failed');
                return URL.createObjectURL(await res.blob());
              }
              return null;
            };
            try {
              const url = await printUrl();
              if (!url) return;
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              iframe.src = url;
              document.body.appendChild(iframe);
              iframe.onload = () => {
                iframe.contentWindow?.print();
              };
            } catch (err) {
              if (documentUrl) window.open(documentUrl, '_blank');
            }
          }}
        >
          <Icon name="print" />
        </button>
        <button 
          className={iconButtonClass} 
          type="button" 
          title="Download"
          onClick={async () => {
            try {
              let url = '';
              if (file) url = URL.createObjectURL(file);
              else if (documentId) {
                const res = await fetch(`${API_URL}/api/v1/documents/${documentId}/content`, { headers: getAuthHeaders() });
                if (!res.ok) throw new Error('Fetch failed');
                url = URL.createObjectURL(await res.blob());
              }
              if (!url) return;
              const a = document.createElement('a');
              a.href = url;
              a.download = documentName || (file?.name) || 'document.pdf';
              a.click();
            } catch (err) {
              if (documentUrl) window.open(documentUrl, '_blank');
            }
          }}
        >
          <Icon name="download" />
        </button>
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
            <DropdownMenuItem 
              className="gap-2.5"
              onClick={async () => {
                try {
                  let url = '';
                  if (file) url = URL.createObjectURL(file);
                  else if (documentId) {
                    const res = await fetch(`${API_URL}/api/v1/documents/${documentId}/content`, { headers: getAuthHeaders() });
                    if (!res.ok) throw new Error('Fetch failed');
                    url = URL.createObjectURL(await res.blob());
                  }
                  if (!url) return;
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = documentName || (file?.name) || 'document.pdf';
                  a.click();
                } catch (err) {
                  if (documentUrl) window.open(documentUrl, '_blank');
                }
              }}
            >
              <Icon name="download" />
              Download
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="mx-1 h-4 w-px bg-white/15" />
        <BorderBeam
          active={chatMinimized}
          borderRadius={6}
          brightness={1.25}
          className="nav-chat-beam-frame"
          colorVariant="ocean"
          duration={2.2}
          size="sm"
          strength={chatMinimized ? 0.75 : 0}
          theme="dark"
        >
          <button
            className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition ${
              chatMinimized
                ? 'text-[var(--text-dim)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'
                : 'bg-[var(--chat-accent)] text-[var(--text)]'
            }`}
            type="button"
            title={chatMinimized ? 'Open chat' : 'Close chat'}
            onClick={onToggleChat}
          >
            <NibLogoBase size={13} />
            Chat
          </button>
        </BorderBeam>
        <div className="mx-1 h-4 w-px bg-white/15" />
        {user && <UserMenu user={user} onSignOut={signOut} variant="toolbar" />}
      </div>
    </div>
  );
}

function ViewerIndexingProgress({
  pagesProcessed,
  pagesTotal,
}: {
  pagesProcessed: number;
  pagesTotal: number | null;
}) {
  const { percent, pagesProcessed: displayPages } = useIndexingDisplay(
    pagesProcessed,
    pagesTotal,
    false,
  );

  return (
    <IndexingProgressBar
      display={percent}
      pagesProcessed={displayPages}
      pagesTotal={pagesTotal}
      className="w-full max-w-[260px]"
    />
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
  searchQuery,
  setPdf,
  scrollToPageRef,
  highlight,
  lockedUntilIndexed,
  indexingFailed,
  indexingProgress,
  indexingPagesProcessed,
  indexingPagesTotal,
}: {
  currentPage: number;
  totalPages: number;
  onPageCountChange: (count: number) => void;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  zoom: number;
  setZoom: (value: number) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  searchQuery: string;
  setPdf: (pdf: pdfjs.PDFDocumentProxy | null) => void;
  scrollToPageRef: React.MutableRefObject<((index: number) => void) | null>;
  highlight?: TextHighlight | null;
  lockedUntilIndexed: boolean;
  indexingFailed: boolean;
  indexingProgress: number;
  indexingPagesProcessed: number;
  indexingPagesTotal: number | null;
}) {
  const { settings } = useSettings();
  const [showThumbs, setShowThumbs] = useState(true);
  const { file, documentId, documentUrl } = useUpload();
  const mergeMutation = useMergePdf();
  const outerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const [debouncedZoom, setDebouncedZoom] = useState(zoom);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedZoom(zoom), 200);
    return () => clearTimeout(timer);
  }, [zoom]);

  // ── Search text renderer ─────────────────────────────────────────────────
  // searchQuery is a dep so the text layer re-renders on every keystroke.
  // The canvas is unaffected — react-pdf only re-draws it when page/width/scale change.
  const textRenderer = useCallback(({ str }: { str: string }) => {
    if (!searchQuery) return str;
    try {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return str.replace(
        regex,
        (value) => `<mark class="bg-yellow-400/60 text-inherit rounded-sm px-0">${value}</mark>`,
      );
    } catch {
      return str;
    }
  }, [searchQuery]);

  // ── PDF blob loading ─────────────────────────────────────────────────────
  const [blobUrl, setBlobUrl] = useState<string | undefined>(undefined);
  const [isFetchingPdf, setIsFetchingPdf] = useState(false);
  const activeBlobRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (lockedUntilIndexed) {
      if (activeBlobRef.current) {
        URL.revokeObjectURL(activeBlobRef.current);
        activeBlobRef.current = undefined;
      }
      queueMicrotask(() => {
        setBlobUrl(undefined);
        setIsFetchingPdf(false);
        setPdf(null);
      });
      return;
    }
    if (file) {
      if (activeBlobRef.current) { URL.revokeObjectURL(activeBlobRef.current); activeBlobRef.current = undefined; }
      queueMicrotask(() => {
        setBlobUrl(undefined);
        setIsFetchingPdf(false);
      });
      return;
    }
    if (!documentId) {
      queueMicrotask(() => {
        setBlobUrl(undefined);
        setIsFetchingPdf(false);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setIsFetchingPdf(true);
      setBlobUrl(undefined);
    });

    fetch(`${API_URL}/api/v1/documents/${documentId}/content`, { headers: getAuthHeaders() })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
      .then((blob) => {
        if (cancelled) return;
        if (activeBlobRef.current) URL.revokeObjectURL(activeBlobRef.current);
        const url = URL.createObjectURL(blob);
        activeBlobRef.current = url;
        setBlobUrl(url);
        setIsFetchingPdf(false);
      })
      .catch((err) => { if (!cancelled) { console.error('[PDF] fetch error:', err); setIsFetchingPdf(false); } });

    return () => { cancelled = true; };
  }, [file, documentId, documentUrl, lockedUntilIndexed, setPdf]);

  useEffect(() => () => { if (activeBlobRef.current) URL.revokeObjectURL(activeBlobRef.current); }, []);

  const pdfSource: File | string | undefined = file ?? blobUrl;

  // ── Reset on doc change ──────────────────────────────────────────────────
  useEffect(() => {
    onPageCountChange(0);
    setCurrentPage(0);
  }, [file, documentId, onPageCountChange, setCurrentPage]);

  // ── Thumbnail toggle ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleToggle = () => setShowThumbs((v) => !v);
    window.addEventListener('nib:toggle-thumbs', handleToggle);
    return () => window.removeEventListener('nib:toggle-thumbs', handleToggle);
  }, []);

  // ── Jump to page ─────────────────────────────────────────────────────────
  // All pages are always in the DOM — simple scrollIntoView works perfectly.
  const jumpToPage = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`[data-page-index="${index}"]`);
    if (target) {
      const top = target.offsetTop - 24;
      container.scrollTo({ top, behavior: settings.smoothScrolling ? 'smooth' : 'auto' });
    }
  }, [scrollContainerRef, settings.smoothScrolling]);

  // Expose to parent (used by nib-state scrollToPage, search navigation, citations)
  useEffect(() => {
    scrollToPageRef.current = jumpToPage;
  }, [jumpToPage, scrollToPageRef]);

  // ── Scroll → current page tracking ──────────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const pages = container.querySelectorAll<HTMLElement>('[data-page-index]');
      if (!pages.length) return;
      const mid = container.scrollTop + container.clientHeight / 2;
      let closest = 0;
      let minDist = Infinity;
      pages.forEach((page) => {
        const center = page.offsetTop + page.offsetHeight / 2;
        const dist = Math.abs(center - mid);
        if (dist < minDist) { minDist = dist; closest = parseInt(page.dataset.pageIndex ?? '0', 10); }
      });
      setCurrentPage(closest);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef, setCurrentPage]);

  // ── Ctrl+scroll to zoom ───────────────────────────────────────────────────
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        setZoom(Math.max(0.5, Math.min(2.5, Number((zoom + delta).toFixed(2)))));
      }
    };
    outer.addEventListener('wheel', handleWheel, { passive: false });
    return () => outer.removeEventListener('wheel', handleWheel);
  }, [setZoom, zoom]);

  // ── Middle-mouse drag to pan ─────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1) {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = 'grabbing';
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

  const pageW = Math.round(PAGE_W * zoom);
  const renderW = Math.round(PAGE_W * debouncedZoom);
  const scale = zoom / debouncedZoom;

  return (
    <div
      ref={outerRef}
      className="relative h-full overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(110,168,255,0.04),transparent_60%)]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {lockedUntilIndexed && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-[var(--bg-base)] px-6 text-center">
          {indexingFailed ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-400/30 bg-red-500/10 text-red-200">
                <Icon name="close" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">Indexing failed</h2>
                <p className="mt-2 max-w-[300px] text-[12px] leading-relaxed text-[var(--text-faint)]">
                  This PDF stays hidden because Nib only opens documents after indexing completes.
                </p>
              </div>
            </>
          ) : (
            <>
              <NibLogoSpinner size={30} label="Preparing document" />
              <ViewerIndexingProgress
                pagesProcessed={indexingPagesProcessed}
                pagesTotal={indexingPagesTotal}
              />
              <p className="max-w-[280px] text-[12px] leading-relaxed text-[var(--text-faint)]">
                Nib is indexing the PDF before showing it, so citations and chat are ready with the document.
              </p>
            </>
          )}
        </div>
      )}

      {!lockedUntilIndexed && isFetchingPdf && !file && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-base)]">
          <NibLogoSpinner size={26} label="Loading PDF" />
        </div>
      )}

      {!lockedUntilIndexed && (
        <>
          {/* Thumbnail sidebar */}
          <AnimatePresence>
            {showThumbs && totalPages > 0 && (
              <motion.div
                key="thumb-panel"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 36, mass: 0.8 }}
                className="fixed bottom-0 left-0 z-20 flex w-[80px] flex-col overflow-hidden border-r border-white/8 bg-[var(--bg-base)]"
                style={{ top: '48px' }}
              >
                <Document file={pdfSource} loading={null} className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex flex-1 flex-col overflow-y-auto py-3 px-[10px] gap-2">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`thumb${i === currentPage ? ' active' : ''}`}
                        onClick={() => jumpToPage(i)}
                        title={`Page ${i + 1}`}
                      >
                        <div className="thumb-img flex items-center justify-center overflow-hidden">
                          <Page
                            pageNumber={i + 1}
                            width={50}
                            devicePixelRatio={1}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                          />
                        </div>
                        <span className="thumb-num">{i + 1}</span>
                      </button>
                    ))}
                  </div>
                </Document>

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
                multiple
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files ? Array.from(e.target.files) : [];
                  if (picked.length > 0) mergeMutation.mutate(picked);
                  e.target.value = '';
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

          {/* Main PDF document */}
          <Document
            file={pdfSource}
            loading={null}
            onLoadSuccess={(pdf) => { onPageCountChange(pdf.numPages); setPdf(pdf); }}
            onLoadError={(err) => console.error('[PDF] load error:', err)}
            className="h-full w-full"
          >
            <div
              className="h-full overflow-auto"
              ref={scrollContainerRef}
              style={{
                paddingLeft: showThumbs && totalPages > 0 ? 80 : 0,
                transition: 'padding-left 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            >
          {totalPages === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="pdf-page flex min-h-[500px] w-[620px] flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-[var(--bg-base)] text-sm text-[var(--text-dim)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {pdfSource ? 'Failed to load PDF' : 'No document selected'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-12 px-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <PdfPageWrapper
                  key={`pdf-page-wrapper-${i}`}
                  index={i}
                  pageW={pageW}
                  renderW={renderW}
                  scale={scale}
                  textRenderer={textRenderer}
                  highlight={settings.citationHighlight ? highlight : null}
                  showPageNumbers={settings.showPageNumbers}
                  readingMode={settings.readingMode}
                />
              ))}
            </div>
          )}
            </div>
          </Document>
        </>
      )}
    </div>
  );
}

function PdfPageWrapper({
  index,
  pageW,
  renderW,
  scale,
  textRenderer,
  highlight,
  showPageNumbers,
  readingMode,
}: {
  index: number;
  pageW: number;
  renderW: number;
  scale: number;
  textRenderer: (props: { str: string }) => string;
  highlight?: TextHighlight | null;
  showPageNumbers: boolean;
  readingMode: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: '150% 0px', // Keep text layer active slightly off-screen
      }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="pdf-page-wrap mx-auto w-fit"
      data-page-index={index}
    >
      {showPageNumbers && <div className="page-num-tag">p.{index + 1}</div>}
      <div 
        className="pdf-page"
        style={{
          width: pageW,
          height: Math.round(pageW * 1.3),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
          <Page
            className={readingMode === 'minimal' ? '!bg-transparent !shadow-none' : ''}
            pageNumber={index + 1}
            width={renderW}
            devicePixelRatio={Math.max(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}
            renderAnnotationLayer={false}
            renderTextLayer={isVisible}
            customTextRenderer={
              highlight && highlight.kind === 'text' && highlight.pageIndex === index
                ? makeTextRenderer(highlight.query)
                : textRenderer
            }
            loading={
              <div
                style={{ width: renderW, height: Math.round(renderW * 1.3) }}
                className="animate-pulse rounded bg-[var(--bg-elevated)]"
              />
            }
          />
          {highlight && highlight.kind === 'bbox' && highlight.pageIndex === index && (
            <BboxOverlay highlight={highlight} />
          )}
        </div>
      </div>
    </div>
  );
}
