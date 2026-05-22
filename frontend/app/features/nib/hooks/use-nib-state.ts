import { useCallback, useEffect, useRef, useState } from 'react';
import type { BBox, Citation } from '../nib-types';
import type { pdfjs } from 'react-pdf';
import { useSettings } from '../../../settings/hooks/use-settings';

const PANEL_POSITION: 'left' | 'right' = 'right';

/**
 * What kind of highlight to show on the cited page.
 *  - `bbox`: precise rectangle overlay using coordinates captured during ingestion.
 *  - `text`: legacy fallback — search the rendered text layer for a snippet. Used
 *    for blocks ingested before the bbox pipeline.
 */
export type TextHighlight =
  | {
      kind: 'bbox';
      pageIndex: number;
      bbox: BBox;
      pageWidth: number;
      pageHeight: number;
    }
  | {
      kind: 'text';
      pageIndex: number;
      query: string;
    };

export function useNibState() {
  const { settings, loaded } = useSettings();
  const [splitRatio, setSplitRatio] = useState(60);
  const [zoom, setZoom] = useState(settings.defaultZoom / 100);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(6);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [highlight, setHighlight] = useState<TextHighlight | null>(null);

  const prevLoaded = useRef(false);
  useEffect(() => {
    if (loaded && !prevLoaded.current) {
      setZoom(settings.defaultZoom / 100);
      prevLoaded.current = true;
    }
  }, [loaded, settings.defaultZoom]);

  // Evidence drawer state — which assistant message's citations are open, and
  // which citation (by blockId) should be scrolled into view on open.
  const [evidenceCitations, setEvidenceCitations] = useState<Citation[]>([]);
  const [evidenceFocusedBlockId, setEvidenceFocusedBlockId] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  /** Populated by the Viewer component once its virtualizer is ready. */
  const scrollToPageRef = useRef<((index: number) => void) | null>(null);

  const scrollToPage = useCallback((page: number) => {
    scrollToPageRef.current?.(page);
  }, []);

  const onCiteClick = useCallback((citation: Citation) => {
    scrollToPage(citation.page);
    setCurrentPage(citation.page);

    // Prefer precise bbox-driven overlay when the citation carries one — it
    // works on any PDF (including character-spaced fonts) and points to the
    // exact region a chunk came from.
    if (citation.bbox && citation.pageWidth && citation.pageHeight) {
      setHighlight({
        kind: 'bbox',
        pageIndex: citation.page,
        bbox: citation.bbox,
        pageWidth: citation.pageWidth,
        pageHeight: citation.pageHeight,
      });
      return;
    }

    // Fallback for legacy blocks (ingested before the bbox pipeline): search
    // the rendered text layer for the first ~60 chars of the snippet.
    const query = citation.snippet?.trim().slice(0, 60) ?? '';
    setHighlight(query ? { kind: 'text', pageIndex: citation.page, query } : null);
  }, [scrollToPage]);

  const openEvidence = useCallback((citations: Citation[], focusedBlockId: string | null) => {
    setEvidenceCitations(citations);
    setEvidenceFocusedBlockId(focusedBlockId);
    setEvidenceOpen(true);
  }, []);

  const closeEvidence = useCallback(() => setEvidenceOpen(false), []);

  // Drag divider resizing
  const onDividerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.dragging = 'true';
    document.body.style.cursor = 'col-resize';
    e.currentTarget.classList.add('dragging');
  }, []);

  const onDividerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.dataset.dragging === 'true') {
      let newRatio = (e.clientX / window.innerWidth) * 100;
      if (PANEL_POSITION === 'left') {
        newRatio = 100 - newRatio;
      }
      newRatio = Math.max(20, Math.min(80, newRatio));
      setSplitRatio(Math.round(newRatio));
    }
  }, []);

  const onDividerPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.dataset.dragging === 'true') {
      e.currentTarget.releasePointerCapture(e.pointerId);
      e.currentTarget.dataset.dragging = 'false';
      document.body.style.cursor = '';
      e.currentTarget.classList.remove('dragging');
    }
  }, []);

  // Keyboard pagination controls
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'j') {
        event.preventDefault();
        scrollToPage(Math.min(totalPages - 1, currentPage + 1));
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'k') {
        event.preventDefault();
        scrollToPage(Math.max(0, currentPage - 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentPage, scrollToPage, totalPages]);

  return {
    splitRatio,
    zoom,
    currentPage,
    totalPages,
    chatMinimized,
    pdf,
    setPdf,
    highlight,
    evidenceOpen,
    evidenceCitations,
    evidenceFocusedBlockId,
    setZoom,
    setCurrentPage,
    setTotalPages,
    setChatMinimized,
    scrollContainerRef,
    scrollToPageRef,
    scrollToPage,
    onCiteClick,
    openEvidence,
    closeEvidence,
    onDividerPointerDown,
    onDividerPointerMove,
    onDividerPointerUp,
  };
}
