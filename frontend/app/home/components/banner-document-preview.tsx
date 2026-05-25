'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { fetchBlobUrl, getCachedBlobUrl, hasCachedBlobUrl } from './pdf-blob-cache';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function BannerDocumentPreview({ documentId }: { documentId: string }) {
  const [blobUrl, setBlobUrl] = useState<string | undefined>(() => getCachedBlobUrl(documentId));
  const [loaded, setLoaded] = useState(() => hasCachedBlobUrl(documentId));

  useEffect(() => {
    if (hasCachedBlobUrl(documentId)) return;

    let cancelled = false;
    fetchBlobUrl(documentId)
      .then(url => { if (!cancelled) setBlobUrl(url); })
      .catch(err => console.error('[BannerPreview] fetch error:', err));

    return () => { cancelled = true; };
  }, [documentId]);

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-[#1d2129] rounded-[4px] shadow-xl border border-white/10 flex items-start justify-center overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-white/5" />
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
              width={140}
              devicePixelRatio={1}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              onLoadSuccess={() => setLoaded(true)}
              className="shadow-md overflow-hidden bg-white"
            />
          </Document>
        )}
      </div>
    </div>
  );
}
