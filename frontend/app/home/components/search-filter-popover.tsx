'use client';

import { useState, useMemo } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import type { CollectionSummary } from '../hooks/use-collections';

export type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';

export type HomeView = 'all' | 'recent' | 'starred' | 'trash' | 'collection';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name-asc', label: 'A → Z' },
  { value: 'name-desc', label: 'Z → A' },
  { value: 'size-desc', label: 'Largest' },
  { value: 'size-asc', label: 'Smallest' },
];

interface Props {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  collections: CollectionSummary[];
  currentCollectionId: string | null;
  onCollectionSelect: (id: string) => void;
  onCollectionClear: () => void;
  currentView: HomeView;
  onViewChange: (view: HomeView) => void;
  activeCount: number;
}

export function SearchFilterPopover({
  sortBy, onSortChange, collections, currentCollectionId,
  onCollectionSelect, onCollectionClear, currentView, onViewChange, activeCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [colSearch, setColSearch] = useState('');

  const filteredCollections = useMemo(() => {
    if (!colSearch.trim()) return collections;
    return collections.filter(c => c.name.toLowerCase().includes(colSearch.toLowerCase()));
  }, [collections, colSearch]);

  function handleClearAll() {
    onSortChange('newest');
    if (currentView === 'starred' || currentView === 'recent') onViewChange('all');
    if (currentView === 'collection') onCollectionClear();
    setOpen(false);
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`Filter${activeCount > 0 ? ` (${activeCount} active)` : ''}`}
          className={`relative flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-r-xl ${
            activeCount > 0
              ? 'text-[var(--accent)] hover:bg-[var(--accent)]/[0.06]'
              : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/[0.03]'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" />
            <line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" />
            <line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" />
            <line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white leading-none">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50 w-72 overflow-hidden rounded-xl border border-white/10 bg-[var(--bg-surface)] shadow-2xl shadow-black/50 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
        >
          {/* ── Sort ── */}
          <div className="p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">Sort by</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SORT_OPTIONS.map(opt => {
                const active = sortBy === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onSortChange(opt.value)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${
                      active
                        ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/25 text-[var(--accent)]'
                        : 'border border-transparent bg-white/[0.04] text-[var(--text-dim)] hover:bg-white/[0.08] hover:text-[var(--text)]'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-[var(--accent)]' : 'bg-white/25'}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* ── View shortcuts ── */}
          <div className="p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">Jump to</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  {
                    view: 'all' as HomeView, label: 'All docs',
                    icon: (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                      </svg>
                    ),
                  },
                  {
                    view: 'starred' as HomeView, label: 'Starred',
                    icon: (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ),
                  },
                  {
                    view: 'recent' as HomeView, label: 'Recent',
                    icon: (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                    ),
                  },
                  {
                    view: 'trash' as HomeView, label: 'Trash',
                    icon: (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    ),
                  },
                ] as { view: HomeView; label: string; icon: React.ReactNode }[]
              ).map(({ view, label, icon }) => {
                const active = currentView === view;
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => {
                      if (view === 'all') onCollectionClear();
                      onViewChange(view);
                      setOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${
                      active
                        ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/25 text-[var(--accent)]'
                        : 'border border-transparent bg-white/[0.04] text-[var(--text-dim)] hover:bg-white/[0.08] hover:text-[var(--text)]'
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Collections combobox ── */}
          {collections.length > 0 && (
            <>
              <div className="h-px bg-white/[0.06]" />
              <div className="p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">Collection</p>
                <div className="relative mb-2">
                  <svg
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                  >
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search collections…"
                    value={colSearch}
                    onChange={(e) => setColSearch(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-7 pr-3 text-[12px] text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-white/20 transition"
                  />
                </div>
                <div className="max-h-40 space-y-0.5 overflow-y-auto">
                  {/* All documents option */}
                  <button
                    type="button"
                    onClick={() => { onCollectionClear(); setOpen(false); }}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors ${
                      currentView !== 'collection'
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--text-dim)] hover:bg-white/[0.05] hover:text-[var(--text)]'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${currentView !== 'collection' ? 'bg-[var(--accent)]' : 'bg-white/20'}`} />
                    All documents
                  </button>

                  {filteredCollections.map(col => {
                    const active = currentCollectionId === col.id && currentView === 'collection';
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => { onCollectionSelect(col.id); setOpen(false); }}
                        className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                          active
                            ? 'text-[var(--accent)]'
                            : 'text-[var(--text-dim)] hover:bg-white/[0.05] hover:text-[var(--text)]'
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-[var(--accent)]' : 'bg-white/20'}`} />
                        <span className="flex-1 truncate">{col.name}</span>
                        <span className="shrink-0 text-[var(--text-faint)]">{col.documentCount}</span>
                      </button>
                    );
                  })}

                  {filteredCollections.length === 0 && colSearch && (
                    <p className="px-2.5 py-2 text-[12px] italic text-[var(--text-faint)]">No collections found</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Clear all ── */}
          {activeCount > 0 && (
            <>
              <div className="h-px bg-white/[0.06]" />
              <div className="p-3">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="w-full rounded-lg py-1.5 text-[12px] font-medium text-[var(--text-faint)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text)]"
                >
                  Clear all filters
                </button>
              </div>
            </>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
