'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { fetchBlobUrl, getCachedBlobUrl, hasCachedBlobUrl } from './pdf-blob-cache';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function DocumentPreview({
  documentId,
  className = 'mb-4 h-72 w-full rounded-md bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-surface)] flex items-start justify-center overflow-hidden relative',
  pageWidth = 200,
  pageClassName = 'shadow-md overflow-hidden rounded-sm border border-white/10 mt-4',
}: {
  documentId: string;
  className?: string;
  pageWidth?: number;
  pageClassName?: string;
}) {
  // Initialise directly from cache — zero flicker on revisit.
  const [blobUrl, setBlobUrl] = useState<string | undefined>(() => getCachedBlobUrl(documentId));
  const [loaded, setLoaded] = useState(() => hasCachedBlobUrl(documentId));

  useEffect(() => {
    if (hasCachedBlobUrl(documentId)) return;

    let cancelled = false;
    fetchBlobUrl(documentId)
      .then(url => { if (!cancelled) setBlobUrl(url); })
      .catch(err => console.error('[DocumentPreview] fetch error:', err));

    return () => { cancelled = true; };
  }, [documentId]);

  return (
    <div className={className}>
      {!loaded && (
        <div className="absolute inset-0 flex items-start justify-center overflow-hidden animate-pulse">
          <div className="mt-4 w-[200px] max-w-full h-[calc(100%-1.5rem)] bg-white/5 rounded-sm border border-white/10" />
        </div>
      )}
      <div
        className={`w-full h-full flex items-start justify-center transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {blobUrl && (
          <Document file={blobUrl} loading={null} className="flex items-start justify-center w-full">
            <Page
              pageNumber={1}
              width={pageWidth}
              devicePixelRatio={1}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              onLoadSuccess={() => setLoaded(true)}
              className={pageClassName}
            />
          </Document>
        )}
      </div>
    </div>
  );
}
