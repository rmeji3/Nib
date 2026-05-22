'use client';

import { useState, useEffect, useCallback } from 'react';

export type AccentColor = 'zinc' | 'blue' | 'purple' | 'teal' | 'amber' | 'rose';
export type TrashRetention = '7' | '30' | '90' | 'never';
export type DateDisplay = 'relative' | 'absolute';
export type ReadingMode = 'paper' | 'minimal';

export interface AppSettings {
  accentColor: AccentColor;
  compactSidebar: boolean;
  dateDisplay: DateDisplay;
  defaultZoom: number;
  showPageNumbers: boolean;
  readingMode: ReadingMode;
  smoothScrolling: boolean;
  autoScrollOnAnswer: boolean;
  citationHighlight: boolean;
  pageContextWindow: number;
  showConfidence: boolean;
  trashRetention: TrashRetention;
}

const DEFAULTS: AppSettings = {
  accentColor: 'zinc',
  compactSidebar: false,
  dateDisplay: 'relative',
  defaultZoom: 100,
  showPageNumbers: true,
  readingMode: 'paper',
  smoothScrolling: true,
  autoScrollOnAnswer: true,
  citationHighlight: true,
  pageContextWindow: 3,
  showConfidence: true,
  trashRetention: '30',
};

const STORAGE_KEY = 'nib_settings';

export const ACCENT_PRESETS: Record<AccentColor, { label: string; hex: string; a: string; b: string; c: string }> = {
  zinc:   { label: 'Default', hex: '#a4abb6', a: 'oklch(0.74 0.08 240)', b: 'oklch(0.78 0.10 290)', c: 'oklch(0.82 0.09 200)' },
  blue:   { label: 'Ocean',   hex: '#3b82f6', a: 'oklch(0.67 0.18 240)', b: 'oklch(0.70 0.16 220)', c: 'oklch(0.74 0.14 260)' },
  purple: { label: 'Violet',  hex: '#8b5cf6', a: 'oklch(0.64 0.22 295)', b: 'oklch(0.68 0.20 315)', c: 'oklch(0.72 0.18 275)' },
  teal:   { label: 'Teal',    hex: '#14b8a6', a: 'oklch(0.74 0.13 185)', b: 'oklch(0.78 0.11 170)', c: 'oklch(0.82 0.09 195)' },
  amber:  { label: 'Amber',   hex: '#f59e0b', a: 'oklch(0.82 0.15 80)',  b: 'oklch(0.86 0.14 60)',  c: 'oklch(0.88 0.12 95)'  },
  rose:   { label: 'Rose',    hex: '#f43f5e', a: 'oklch(0.67 0.22 10)',  b: 'oklch(0.71 0.20 355)', c: 'oklch(0.75 0.18 25)'  },
};

function applyAccent(color: AccentColor) {
  const preset = ACCENT_PRESETS[color];
  const root = document.documentElement;
  root.style.setProperty('--accent-glow-a', preset.a);
  root.style.setProperty('--accent-glow-b', preset.b);
  root.style.setProperty('--accent-glow-c', preset.c);
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Partial<AppSettings> = JSON.parse(stored);
        const merged = { ...DEFAULTS, ...parsed };
        setSettings(merged);
        applyAccent(merged.accentColor);
      }
    } catch {}
    setLoaded(true);
  }, []);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (key === 'accentColor') applyAccent(value as AccentColor);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULTS);
    applyAccent('zinc');
  }, []);

  return { settings, update, reset, loaded };
}
