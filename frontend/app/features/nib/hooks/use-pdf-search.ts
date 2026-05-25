'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import type { pdfjs } from 'react-pdf';

export interface SearchMatch {
  pageIndex: number;
  matchIndex: number;
  text: string;
}

export function usePdfSearch(pdf: pdfjs.PDFDocumentProxy | null) {
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [query, setQuery] = useState('');
  
  // We cache the extracted text per document to avoid re-extracting on every keystroke
  const extractedTextCache = useRef<{ [pageIndex: number]: string }>({});
  const lastPdfRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  const extractText = async () => {
    if (!pdf) return;
    
    // Clear cache if document changed
    if (pdf !== lastPdfRef.current) {
      extractedTextCache.current = {};
      lastPdfRef.current = pdf;
    }

    const totalPages = pdf.numPages;
    // Only extract pages we haven't extracted yet
    const pagesToExtract = [];
    for (let i = 0; i < totalPages; i++) {
      if (extractedTextCache.current[i] === undefined) {
        pagesToExtract.push(i);
      }
    }

    if (pagesToExtract.length > 0) {
      // Extract in batches to avoid locking the main thread completely
      const batchSize = 10;
      for (let i = 0; i < pagesToExtract.length; i += batchSize) {
        const batch = pagesToExtract.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (pageIndex) => {
            try {
              const page = await pdf.getPage(pageIndex + 1);
              const textContent = await page.getTextContent();
              const text = textContent.items.map((item: any) => item.str).join(' ');
              extractedTextCache.current[pageIndex] = text;
            } catch (err) {
              console.error(`Failed to extract text for page ${pageIndex + 1}`, err);
              extractedTextCache.current[pageIndex] = '';
            }
          })
        );
      }
    }
  };

  const search = useCallback(async (searchQuery: string) => {
    if (!pdf || !searchQuery.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      setQuery('');
      return;
    }

    setIsSearching(true);
    setQuery(searchQuery);

    try {
      await extractText();

      const lowerQuery = searchQuery.toLowerCase();
      const foundMatches: SearchMatch[] = [];

      for (let i = 0; i < pdf.numPages; i++) {
        const pageText = extractedTextCache.current[i] || '';
        const lowerPageText = pageText.toLowerCase();
        
        let startIndex = 0;
        let matchIdx = 0;
        while ((startIndex = lowerPageText.indexOf(lowerQuery, startIndex)) !== -1) {
          foundMatches.push({
            pageIndex: i,
            matchIndex: matchIdx,
            // grab a snippet of text for context (optional)
            text: pageText.substring(Math.max(0, startIndex - 20), Math.min(pageText.length, startIndex + lowerQuery.length + 20)),
          });
          startIndex += lowerQuery.length;
          matchIdx++;
        }
      }

      setMatches(foundMatches);
      setCurrentMatchIndex(foundMatches.length > 0 ? 0 : -1);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  }, [pdf]);

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const prevMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setMatches([]);
    setCurrentMatchIndex(-1);
  }, []);

  // Memoized so the object reference is stable — prevents useEffect deps loops
  const currentMatch = useMemo(
    () => (currentMatchIndex >= 0 ? matches[currentMatchIndex] : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentMatchIndex, matches]
  );

  return {
    query,
    isSearching,
    matches,
    currentMatchIndex,
    currentMatch,
    search,
    nextMatch,
    prevMatch,
    clearSearch,
  };
}
