'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../features/auth/hooks/use-auth';
import { fetchWithAuth } from '@/app/lib/fetch-with-auth';

export type AccentColor = 'zinc' | 'blue' | 'purple' | 'teal' | 'amber' | 'rose';
export type TrashRetention = '7' | '30' | '90' | 'never';
export type DateDisplay = 'relative' | 'absolute';
export type ReadingMode = 'paper' | 'minimal';
export type Theme = 'light' | 'dark' | 'system';

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
  theme: Theme;
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
  theme: 'system',
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

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    root.classList.remove('light');
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
}

export function useSettings() {
  const { user, updateUserSession } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onSettingsChanged = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
    };
    window.addEventListener('nib_settings_changed', onSettingsChanged);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) onSettingsChanged();
    });
    return () => {
      window.removeEventListener('nib_settings_changed', onSettingsChanged);
      window.removeEventListener('storage', onSettingsChanged);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let parsed: Partial<AppSettings> = {};
      if (stored) {
        parsed = JSON.parse(stored);
      }
      
      let backendSettings: Partial<AppSettings> = {};
      if (user?.settings) {
        try {
          backendSettings = JSON.parse(user.settings);
        } catch(e) {}
      }

      const merged = { ...DEFAULTS, ...parsed, ...backendSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      
      setSettings(merged);
      applyAccent(merged.accentColor);
      applyTheme(merged.theme);
    } catch {}
    setLoaded(true);
  }, [user?.settings]);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULTS);
    applyAccent('zinc');
    applyTheme('system');
  }, []);

  const prevUser = useRef(user);
  useEffect(() => {
    // If the user was logged in and is now logged out, reset to default
    if (prevUser.current && !user) {
      reset();
    }
    prevUser.current = user;
  }, [user, reset]);

  const update = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const prevStr = localStorage.getItem(STORAGE_KEY);
    const prev = prevStr ? JSON.parse(prevStr) : DEFAULTS;
    const next = { ...prev, [key]: value };
    
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('nib_settings_changed'));
    if (key === 'accentColor') applyAccent(value as AccentColor);
    if (key === 'theme') applyTheme(value as Theme);

    if (user) {
      try {
        await fetchWithAuth('/api/v1/users/me/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: JSON.stringify(next) }),
        });
        if (updateUserSession) updateUserSession(JSON.stringify(next));
      } catch (err) {
        console.error('Failed to sync settings to backend', err);
      }
    }
  }, [user]);

  return { settings, update, reset, loaded };
}
