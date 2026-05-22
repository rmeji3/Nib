import { useCallback, useEffect, useRef, useState } from 'react';
import type { Citation } from '../nib-types';
import type { pdfjs } from 'react-pdf';

const PANEL_POSITION: 'left' | 'right' = 'right';

export function useNibState() {
  const [splitRatio, setSplitRatio] = useState(60);
  const [zoom, setZoom] = useState(0.9);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(6);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);

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
  }, [scrollToPage]);

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
    setZoom,
    setCurrentPage,
    setTotalPages,
    setChatMinimized,
    scrollContainerRef,
    scrollToPageRef,
    scrollToPage,
    onCiteClick,
    onDividerPointerDown,
    onDividerPointerMove,
    onDividerPointerUp,
  };
}
