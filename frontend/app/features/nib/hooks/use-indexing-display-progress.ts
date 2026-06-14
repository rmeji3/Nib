import { useEffect, useMemo, useState } from 'react';

export type IndexingDisplay = {
  percent: number;
  pagesProcessed: number;
};

const MIN_PERCENT = 5;
const CREEP_CAP = 90;

/**
 * Simulates page counts ticking up while indexing, keeping the bar in sync.
 * Never drops below real backend progress; snaps to total on complete.
 */
export function useIndexingDisplay(
  pagesProcessed: number,
  pagesTotal: number | null,
  isComplete: boolean,
  active = true,
): IndexingDisplay {
  const [simulatedPages, setSimulatedPages] = useState(pagesProcessed);
  const [simulatedPercent, setSimulatedPercent] = useState(MIN_PERCENT);

  useEffect(() => {
    setSimulatedPages((current) => Math.max(current, pagesProcessed));
  }, [pagesProcessed]);

  useEffect(() => {
    if (isComplete) {
      if (pagesTotal !== null && pagesTotal > 0) {
        setSimulatedPages(pagesTotal);
      }
      setSimulatedPercent(100);
      return;
    }

    if (!active) return;

    if (!pagesTotal || pagesTotal <= 0) {
      const timer = setInterval(() => {
        setSimulatedPercent((current) => {
          if (current >= CREEP_CAP) return current;
          return current + Math.max(0.5, (CREEP_CAP - current) * 0.04);
        });
      }, 300);
      return () => clearInterval(timer);
    }

    const cap = Math.max(pagesProcessed, pagesTotal - 1);
    const intervalMs = Math.max(280, Math.min(900, Math.round(11000 / pagesTotal)));

    const timer = setInterval(() => {
      setSimulatedPages((current) => {
        const floor = Math.max(pagesProcessed, 0);
        const next = Math.max(current, floor);
        if (next >= cap) return next;
        return next + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [active, isComplete, pagesTotal, pagesProcessed]);

  return useMemo(() => {
    if (isComplete) {
      return {
        percent: 100,
        pagesProcessed: pagesTotal ?? pagesProcessed,
      };
    }

    if (pagesTotal !== null && pagesTotal > 0) {
      const displayPages = Math.min(
        pagesTotal,
        Math.max(pagesProcessed, simulatedPages),
      );
      const calcPercent = Math.round((displayPages / pagesTotal) * 100);
      const percent = Math.min(99, Math.max(Math.round(simulatedPercent), calcPercent));

      return { percent, pagesProcessed: displayPages };
    }

      return { percent: Math.round(simulatedPercent), pagesProcessed };
  }, [isComplete, pagesTotal, pagesProcessed, simulatedPages, simulatedPercent]);
}
