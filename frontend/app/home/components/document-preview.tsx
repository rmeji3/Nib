'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { API_URL, getAuthHeaders } from '../../../lib/api/documents';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function DocumentPreview({ 
  documentId,
  className = "mb-4 aspect-[4/3] rounded-md bg-gradient-to-b from-[#1d2129] to-[#15181f] flex items-start justify-center overflow-hidden relative",
  pageWidth = 200,
  pageClassName = "shadow-md overflow-hidden rounded-sm border border-white/10 mt-4"
}: { 
  documentId: string;
  className?: string;
  pageWidth?: number;
  pageClassName?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | undefined>(undefined);
  const activeBlobRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

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
      })
      .catch((err) => {
        if (!cancelled) console.error('[PDF Preview] fetch error:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    return () => {
      if (activeBlobRef.current) URL.revokeObjectURL(activeBlobRef.current);
    };
  }, []);

  return (
    <div className={className}>
      {!loaded && (
        <div className="absolute inset-0 flex items-start justify-center overflow-hidden animate-pulse">
          <div className="mt-4 w-[70%] max-w-[200px] h-[85%] bg-white/5 rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10" />
        </div>
      )}
      <div className={`w-full h-full flex items-start justify-center transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
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
