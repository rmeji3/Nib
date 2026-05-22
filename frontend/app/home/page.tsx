'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSettings } from '../settings/hooks/use-settings';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { useDebounce } from '../hooks/use-debounce';
import dynamic from 'next/dynamic';
import { SearchFilterPopover, type SortOption } from './components/search-filter-popover';
import { UserMenu } from './components/user-menu';

const DocumentPreview = dynamic(() => import('./components/document-preview'), { ssr: false });
const BannerDocumentPreview = dynamic(() => import('./components/banner-document-preview'), { ssr: false });

import {
  useDocuments,
  useTrashedDocuments,
  useStarredDocuments,
  useRecentDocuments,
  useSoftDeleteDocument,
  useRestoreDocument,
  usePermanentDeleteDocument,
  useToggleStarDocument,
  type DocumentItem,
} from './hooks/use-documents';
import { useFormattedMeta } from './hooks/use-formatted-meta';
import {
  useCollections,
  useCollectionDocuments,
  useCreateCollection,
  useDeleteCollection,
  useRenameCollection,
  useAddToCollection,
  useRemoveFromCollection,
  type CollectionSummary,
} from './hooks/use-collections';
import { NibLogo } from '../components/nib-logo';
import { useAuth } from '../features/auth/hooks/use-auth';
import { ProtectedRoute } from '../features/auth/components/protected-route';
import { useUpload } from '../features/upload/upload-context';
import { UploadDialog } from './components/upload-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'all' | 'recent' | 'starred' | 'trash' | 'collection';

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName?: string;
  onConfirm: () => void;
  isPending?: boolean;
}

function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel,
  confirmClassName = 'bg-red-600 hover:bg-red-700 text-white',
  onConfirm, isPending,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 bg-[var(--bg-surface)] p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-base font-semibold text-[var(--text)]">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-[var(--text-dim)]">{description}</Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" className="inline-flex items-center justify-center rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium hover:bg-white/5 transition">
                Cancel
              </button>
            </Dialog.Close>
            <button type="button" onClick={onConfirm} disabled={isPending}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${confirmClassName}`}>
              {isPending ? 'Working…' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Highlight({ text, search }: { text: string; search?: string }) {
  if (!search) return <>{text}</>;
  const parts = text.split(new RegExp(`(${search})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === search.toLowerCase()
          ? <span key={i} className="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5">{part}</span>
          : part
      )}
    </>
  );
}

function InfiniteScrollTrigger({ onIntersect, hasMore }: { onIntersect: () => void; hasMore: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onIntersect();
    }, { rootMargin: '200px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasMore, onIntersect]);
  if (!hasMore) return null;
  return (
    <div ref={ref} className="h-10 w-full flex items-center justify-center my-4 opacity-50">
      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );
}

// ─── Recent Doc Card (compact horizontal strip) ───────────────────────────────

function RecentDocCard({ doc, onClick }: { doc: DocumentItem; onClick: () => void }) {
  const formatMeta = useFormattedMeta();
  return (
    <button
      onClick={onClick}
      type="button"
      className="shrink-0 group flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--bg-surface)] px-3 py-3 w-[210px] hover:border-white/20 hover:bg-[var(--bg-elevated)] text-left transition"
    >
      <div className="shrink-0 flex h-9 w-7 items-center justify-center rounded-[3px] bg-white/5 text-[var(--text-faint)] group-hover:text-[var(--text-dim)] transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[var(--text)] truncate leading-snug">{doc.title}</p>
        <p className="text-[11px] text-[var(--text-faint)] mt-0.5 truncate">{formatMeta(doc)}</p>
      </div>
    </button>
  );
}

// ─── Collection Card ──────────────────────────────────────────────────────────

interface CollectionCardProps {
  collection: CollectionSummary;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function CollectionCard({ collection, isActive, onClick, onDelete }: CollectionCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col rounded-xl border cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg ${
        isActive
          ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5'
          : 'border-white/10 bg-[var(--bg-surface)] hover:border-white/20'
      }`}
    >
      <div className="p-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-white/5 text-[var(--text-dim)]'} transition-colors`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h4 className="mt-3 text-sm font-medium text-[var(--text)] truncate pr-6">{collection.name}</h4>
        <p className="mt-0.5 text-xs text-[var(--text-faint)]">
          {collection.documentCount} {collection.documentCount === 1 ? 'document' : 'documents'}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete collection"
        className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded text-[var(--text-faint)] opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocumentCardProps {
  doc: DocumentItem;
  search?: string;
  onClick: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onRemoveFromCollection?: () => void;
  isDeleting?: boolean;
}

function DocumentCard({ doc, search, onClick, onDelete, onToggleStar, onRemoveFromCollection, isDeleting }: DocumentCardProps) {
  const formatMeta = useFormattedMeta();
  return (
    <div className={`group relative rounded-xl border border-white/10 bg-[var(--bg-surface)] transition hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg flex flex-col h-full ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
      <button type="button" onClick={onClick} className="w-full text-left p-4 flex-1 flex flex-col">
        <DocumentPreview documentId={doc.id} />
        <h4 className="font-serif text-lg leading-6 line-clamp-2 pr-7 break-words">
          <Highlight text={doc.title} search={search} />
        </h4>
        <p className="mt-1 text-xs text-[var(--text-faint)] truncate">{formatMeta(doc)}</p>
        <div className="mt-auto pt-3">
          <span className="inline-flex rounded bg-white/10 px-2 py-1 text-[10px] text-[var(--text-dim)]">{doc.tag}</span>
        </div>
      </button>

      {/* Star */}
      <button type="button" onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
        title={doc.isStarred ? 'Unstar' : 'Star'}
        className={`absolute right-10 top-2.5 flex h-7 w-7 items-center justify-center rounded-md transition-all ${
          doc.isStarred
            ? 'text-yellow-400 opacity-100 hover:bg-white/10'
            : 'text-[var(--text-faint)] opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-[var(--text)]'
        }`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={doc.isStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>

      {/* Remove from collection OR delete */}
      {onRemoveFromCollection ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemoveFromCollection(); }}
          title="Remove from collection"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] opacity-0 transition-all group-hover:opacity-100 hover:bg-orange-500/10 hover:text-orange-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="9" y1="14" x2="15" y2="14" />
          </svg>
        </button>
      ) : (
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Move to trash"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Trash Card ───────────────────────────────────────────────────────────────

interface TrashCardProps {
  doc: DocumentItem;
  onRestore: () => void;
  onDeleteForever: () => void;
  isRestoring?: boolean;
  isDeleting?: boolean;
}

function TrashCard({ doc, onRestore, onDeleteForever, isRestoring, isDeleting }: TrashCardProps) {
  const formatMeta = useFormattedMeta();
  return (
    <div className={`rounded-xl border border-white/10 bg-[var(--bg-surface)] p-4 opacity-70 hover:opacity-100 transition-opacity ${isRestoring || isDeleting ? 'pointer-events-none' : ''}`}>
      <DocumentPreview documentId={doc.id} />
      <h4 className="font-serif text-lg leading-6 line-clamp-2 text-[var(--text-dim)]">{doc.title}</h4>
      <p className="mt-1 text-xs text-[var(--text-faint)] truncate">{formatMeta(doc)}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onRestore} disabled={isRestoring || isDeleting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)] transition disabled:opacity-50">
          {isRestoring
            ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          }
          {isRestoring ? 'Restoring...' : 'Restore'}
        </button>
        <button type="button" onClick={onDeleteForever} disabled={isRestoring || isDeleting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition disabled:opacity-50">
          {isDeleting
            ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
          }
          {isDeleting ? 'Deleting...' : 'Delete forever'}
        </button>
      </div>
    </div>
  );
}

// ─── View Toggle ─────────────────────────────────────────────────────────────

function ViewToggle({ value, onChange }: { value: 'grid' | 'list'; onChange: (v: 'grid' | 'list') => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-white/10 bg-[#0a0c10] p-1">
      <button type="button" onClick={() => onChange('grid')} title="Grid view"
        className={`rounded-md p-1.5 transition-colors ${value === 'grid' ? 'bg-[#1d2129] text-[var(--text)] shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
        </svg>
      </button>
      <button type="button" onClick={() => onChange('list')} title="List view"
        className={`rounded-md p-1.5 transition-colors ${value === 'list' ? 'bg-[#1d2129] text-[var(--text)] shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">{label}</h3>
      {action}
    </div>
  );
}

// ─── Skeleton grid / list ─────────────────────────────────────────────────────

function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-[var(--bg-surface)] flex flex-col h-full">
          <div className="p-4 flex-1 flex flex-col">
            <div className="mb-4 h-72 w-full rounded-md bg-white/5" />
            <div className="h-5 w-3/4 rounded bg-white/10" />
            <div className="mt-2 h-3 w-1/2 rounded bg-white/5" />
            <div className="mt-auto pt-3">
              <div className="h-5 w-16 rounded bg-white/5" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4 rounded-xl border border-white/10 bg-[var(--bg-surface)] px-4 py-3">
          <div className="h-9 w-7 rounded bg-white/5 shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
          </div>
          <div className="h-5 w-10 rounded bg-white/5 shrink-0" />
        </div>
      ))}
    </>
  );
}

// ─── Document List Row ────────────────────────────────────────────────────────

interface DocumentListRowProps {
  doc: DocumentItem;
  search?: string;
  onClick: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onRemoveFromCollection?: () => void;
  isDeleting?: boolean;
}

function DocumentListRow({ doc, search, onClick, onDelete, onToggleStar, onRemoveFromCollection, isDeleting }: DocumentListRowProps) {
  const formatMeta = useFormattedMeta();
  return (
    <div className={`group flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--bg-surface)] px-4 py-3 transition hover:border-white/20 hover:bg-[var(--bg-elevated)] ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="shrink-0 flex h-9 w-7 items-center justify-center rounded-[3px] bg-white/5 text-[var(--text-faint)]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-[var(--text)] truncate"><Highlight text={doc.title} search={search} /></p>
        <p className="text-xs text-[var(--text-faint)] truncate mt-0.5">{formatMeta(doc)}</p>
      </button>
      <span className="shrink-0 hidden sm:inline-flex rounded bg-white/10 px-2 py-1 text-[10px] text-[var(--text-dim)]">{doc.tag}</span>
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
          title={doc.isStarred ? 'Unstar' : 'Star'}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition ${doc.isStarred ? 'text-yellow-400 hover:bg-white/10' : 'text-[var(--text-faint)] hover:bg-white/10 hover:text-[var(--text)]'}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={doc.isStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
        {onRemoveFromCollection ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemoveFromCollection(); }}
            title="Remove from collection"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] hover:bg-orange-500/10 hover:text-orange-400 transition">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
        ) : (
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Move to trash"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] hover:bg-red-500/10 hover:text-red-400 transition">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Trash List Row ───────────────────────────────────────────────────────────

function TrashListRow({ doc, onRestore, onDeleteForever, isRestoring, isDeleting }: TrashCardProps) {
  const formatMeta = useFormattedMeta();
  return (
    <div className={`group flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--bg-surface)] px-4 py-3 opacity-70 hover:opacity-100 transition-opacity ${isRestoring || isDeleting ? 'pointer-events-none' : ''}`}>
      <div className="shrink-0 flex h-9 w-7 items-center justify-center rounded-[3px] bg-white/5 text-[var(--text-faint)]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-dim)] truncate">{doc.title}</p>
        <p className="text-xs text-[var(--text-faint)] truncate mt-0.5">{formatMeta(doc)}</p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <button type="button" onClick={onRestore} disabled={isRestoring || isDeleting}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)] transition disabled:opacity-50">
          {isRestoring ? 'Restoring…' : 'Restore'}
        </button>
        <button type="button" onClick={onDeleteForever} disabled={isRestoring || isDeleting}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition disabled:opacity-50">
          {isDeleting ? 'Deleting…' : 'Delete forever'}
        </button>
      </div>
    </div>
  );
}

// ─── View Panel ───────────────────────────────────────────────────────────────

function ViewPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(active);
  
  if (active && !mounted) {
    setMounted(true);
  }

  if (!mounted) return null;
  return <div style={{ display: active ? 'contents' : 'none' }}>{children}</div>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const formatMeta = useFormattedMeta();
  const [view, setView] = useState<View>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const { settings } = useSettings();

  // Collection dialogs
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [addDocsOpen, setAddDocsOpen] = useState(false);
  const [addDocsSearch, setAddDocsSearch] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Confirm dialogs
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingPermDeleteId, setPendingPermDeleteId] = useState<string | null>(null);
  const [pendingDeleteCollectionId, setPendingDeleteCollectionId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid';
    return (localStorage.getItem('nib_view_mode') as 'grid' | 'list') || 'grid';
  });

  const [allGridRef] = useAutoAnimate<HTMLDivElement>();
  const [recentGridRef] = useAutoAnimate<HTMLDivElement>();
  const [starredGridRef] = useAutoAnimate<HTMLDivElement>();
  const [collectionGridRef] = useAutoAnimate<HTMLDivElement>();
  const [trashGridRef] = useAutoAnimate<HTMLDivElement>();
  const debouncedSearch = useDebounce(search, 300);

  // ── Scroll-position cache ──────────────────────────────────────────────────
  // Each view (and each collection) gets its own saved scroll position so
  // switching tabs feels instant rather than always jumping back to the top.
  const mainRef = useRef<HTMLElement>(null);
  const scrollPositions = useRef<Record<string, number>>({});
  const viewKey = view === 'collection' ? `collection:${selectedCollectionId}` : view;

  /** Save current position then switch view (and optionally collection id). */
  const changeView = useCallback((nextView: View, nextCollectionId?: string | null) => {
    if (mainRef.current) {
      scrollPositions.current[viewKey] = mainRef.current.scrollTop;
    }
    setView(nextView);
    if (nextCollectionId !== undefined) setSelectedCollectionId(nextCollectionId);
  }, [viewKey]);

  // Restore saved position whenever the active view key changes.
  useEffect(() => {
    const saved = scrollPositions.current[viewKey] ?? 0;
    // rAF ensures the new content has painted before we jump
    const id = requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: saved, behavior: 'instant' as ScrollBehavior });
    });
    return () => cancelAnimationFrame(id);
  }, [viewKey]);

  useEffect(() => {
    localStorage.setItem('nib_view_mode', viewMode);
  }, [viewMode]);

  // ── Document queries ──────────────────────────────────────────────────────
  const { data: docsData, isLoading, isError, fetchNextPage, hasNextPage } = useDocuments(debouncedSearch);
  const documents = docsData?.pages.flatMap(p => p.content) ?? [];
  const totalDocs = docsData?.pages[0]?.totalElements ?? 0;

  const { data: trashData, isLoading: trashLoading, isError: trashError, fetchNextPage: fetchNextTrash, hasNextPage: hasNextTrash } = useTrashedDocuments();
  const trashedDocs = trashData?.pages.flatMap(p => p.content) ?? [];
  const totalTrashed = trashData?.pages[0]?.totalElements ?? 0;

  const { data: starredData, isLoading: starredLoading, isError: starredError, fetchNextPage: fetchNextStarred, hasNextPage: hasNextStarred } = useStarredDocuments();
  const starredDocs = starredData?.pages.flatMap(p => p.content) ?? [];
  const totalStarred = starredData?.pages[0]?.totalElements ?? 0;

  const { data: recentData, isLoading: recentLoading, fetchNextPage: fetchNextRecent, hasNextPage: hasNextRecent } = useRecentDocuments();
  const recentDocs = recentData?.pages.flatMap(p => p.content) ?? [];

  // ── Collection queries ────────────────────────────────────────────────────
  const { data: collections = [] } = useCollections();
  const { data: colDocsData, isLoading: colDocsLoading, isError: colDocsError, fetchNextPage: fetchNextColDocs, hasNextPage: hasNextColDocs } = useCollectionDocuments(selectedCollectionId ?? '');
  const collectionDocs = colDocsData?.pages.flatMap(p => p.content) ?? [];
  const collectionTotalDocs = colDocsData?.pages[0]?.totalElements ?? 0;
  const selectedCollection = collections.find(c => c.id === selectedCollectionId);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const softDelete = useSoftDeleteDocument();
  const restore = useRestoreDocument();
  const permDelete = usePermanentDeleteDocument();
  const toggleStar = useToggleStarDocument();
  const createCollection = useCreateCollection();
  const deleteCollection = useDeleteCollection();
  const renameCollection = useRenameCollection();
  const addToCollection = useAddToCollection();
  const removeFromCollection = useRemoveFromCollection();

  const { user, signOut } = useAuth();
  const router = useRouter();
  const { setDocument } = useUpload();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDocumentClick = (doc: DocumentItem) => {
    setDocument(null, doc.id, doc.storageUrl, doc.title);
    router.push(`/document/${doc.id}`);
  };

  const handleCollectionSelect = (id: string) => {
    changeView('collection', id);
    setSearch('');
  };

  const handleBackToLibrary = () => {
    changeView('all');
  };

  const handleSoftDeleteConfirm = () => {
    if (!pendingDeleteId) return;
    softDelete.mutate(pendingDeleteId, { onSuccess: () => setPendingDeleteId(null) });
  };

  const handlePermDeleteConfirm = () => {
    if (!pendingPermDeleteId) return;
    permDelete.mutate(pendingPermDeleteId, { onSuccess: () => setPendingPermDeleteId(null) });
  };

  const handleDeleteCollectionConfirm = () => {
    if (!pendingDeleteCollectionId) return;
    deleteCollection.mutate(pendingDeleteCollectionId, {
      onSuccess: () => {
        setPendingDeleteCollectionId(null);
        if (selectedCollectionId === pendingDeleteCollectionId) handleBackToLibrary();
      },
    });
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    createCollection.mutate(newCollectionName.trim(), {
      onSuccess: () => {
        setNewCollectionName('');
        setCreateCollectionOpen(false);
      },
    });
  };

  const handleAddDocuments = () => {
    if (!selectedCollectionId || selectedDocIds.size === 0) return;
    addToCollection.mutate(
      { collectionId: selectedCollectionId, documentIds: [...selectedDocIds] },
      {
        onSuccess: () => {
          setSelectedDocIds(new Set());
          setAddDocsOpen(false);
          setAddDocsSearch('');
        },
      }
    );
  };

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Docs shown in the "Add documents" picker — filter by local search
  const pickableDocs = useMemo(() => {
    const term = addDocsSearch.toLowerCase();
    return documents.filter(d => !term || d.title.toLowerCase().includes(term));
  }, [documents, addDocsSearch]);

  // ── Sort & filter logic ────────────────────────────────────────────────────
  function sortDocList<T extends DocumentItem>(docs: T[]): T[] {
    if (sortBy === 'newest') return docs;
    const sorted = [...docs];
    switch (sortBy) {
      case 'oldest':    sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
      case 'name-asc':  sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'name-desc': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
      case 'size-desc': sorted.sort((a, b) => (b.fileSizeBytes ?? 0) - (a.fileSizeBytes ?? 0)); break;
      case 'size-asc':  sorted.sort((a, b) => (a.fileSizeBytes ?? 0) - (b.fileSizeBytes ?? 0)); break;
    }
    return sorted as T[];
  }

  const sortedDocuments    = useMemo(() => sortDocList(documents),    [documents, sortBy]);
  const sortedStarredDocs  = useMemo(() => sortDocList(starredDocs),  [starredDocs, sortBy]);
  const sortedRecentDocs   = useMemo(() => sortDocList(recentDocs),   [recentDocs, sortBy]);
  const sortedCollectionDocs = useMemo(() => sortDocList(collectionDocs), [collectionDocs, sortBy]);

  // Active filter chips
  const SORT_LABELS: Record<SortOption, string> = {
    newest: 'Newest', oldest: 'Oldest',
    'name-asc': 'A → Z', 'name-desc': 'Z → A',
    'size-desc': 'Largest', 'size-asc': 'Smallest',
  };

  interface FilterChip { id: string; label: string; onRemove: () => void; }

  const filterChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = [];
    if (sortBy !== 'newest') {
      chips.push({ id: 'sort', label: SORT_LABELS[sortBy], onRemove: () => setSortBy('newest') });
    }
    if (view === 'starred') {
      chips.push({ id: 'starred', label: 'Starred', onRemove: () => changeView('all') });
    }
    if (view === 'recent') {
      chips.push({ id: 'recent', label: 'Recent', onRemove: () => changeView('all') });
    }
    if (view === 'collection' && selectedCollection) {
      chips.push({ id: 'collection', label: selectedCollection.name, onRemove: handleBackToLibrary });
    }
    return chips;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, view, selectedCollection]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const isSearchActive = view === 'all' && !!debouncedSearch;

  // ── Sidebar ───────────────────────────────────────────────────────────────

  const NavButton = ({ active, onClick, icon, label, count }: {
    active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number;
  }) => (
    <button onClick={onClick}
      title={settings.compactSidebar ? label : undefined}
      className={`flex w-full items-center justify-between rounded-md px-3 py-2 transition-colors text-[13px] font-medium ${
        active ? 'bg-[var(--bg-elevated)] text-[var(--text)]' : 'text-[var(--text-dim)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'
      } ${settings.compactSidebar ? 'justify-center' : ''}`}
    >
      <div className={`flex items-center ${settings.compactSidebar ? 'justify-center' : 'gap-3'}`}>
        {icon}
        {!settings.compactSidebar && <span>{label}</span>}
      </div>
      {!settings.compactSidebar && count !== undefined && count > 0 && (
        <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-white/5 px-1.5 text-[10px] font-semibold text-[var(--text-faint)]">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <ProtectedRoute>
      <main className={`grid min-h-[100dvh] grid-cols-1 bg-[var(--bg-base)] overflow-hidden transition-[grid-template-columns] duration-300 ${settings.compactSidebar ? 'lg:grid-cols-[68px_1fr]' : 'lg:grid-cols-[256px_1fr]'}`}>

        {/* ── Sidebar ── */}
        <aside className="flex flex-col border-b border-white/10 bg-[var(--bg-surface)] p-4 lg:border-b-0 lg:border-r lg:h-full justify-between animate-in fade-in slide-in-from-left-8 duration-[1000ms] ease-[cubic-bezier(0.23,1,0.32,1)] fill-mode-both overflow-y-auto">
          <div className="flex flex-col flex-1 min-h-0">
            <div className={`flex items-center pb-4 ${settings.compactSidebar ? 'justify-center' : 'gap-2 px-2'}`}>
              <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--text)] text-[var(--bg-base)]">
                <NibLogo size={15} />
              </div>
              {!settings.compactSidebar && <span className="text-base font-semibold">Nib</span>}
            </div>

            <button onClick={() => setUploadOpen(true)} type="button"
              className={`mb-4 flex w-full items-center justify-between rounded-lg bg-[var(--text)] text-[var(--bg-base)] transition hover:opacity-90 ${settings.compactSidebar ? 'justify-center aspect-square p-0' : 'px-3 py-2 text-sm font-medium'}`}
              title={settings.compactSidebar ? "Upload PDF" : undefined}
            >
              {!settings.compactSidebar && <span>Upload PDF</span>}
              <div className={`flex items-center justify-center rounded ${settings.compactSidebar ? 'h-6 w-6 bg-transparent text-[var(--bg-base)]' : 'h-5 w-5 bg-[var(--bg-base)] text-[var(--text)]'}`}>
                <svg width={settings.compactSidebar ? 18 : 12} height={settings.compactSidebar ? 18 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
            </button>

            <nav className="space-y-1">
              <NavButton active={view === 'all'} onClick={() => changeView('all')}
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></svg>}
                label="All documents" count={totalDocs} />
              <NavButton active={view === 'recent'} onClick={() => changeView('recent')}
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                label="Recent" />
              <NavButton active={view === 'starred'} onClick={() => changeView('starred')}
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
                label="Starred" count={totalStarred} />
              <NavButton active={view === 'trash'} onClick={() => changeView('trash')}
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>}
                label="Trash" count={totalTrashed} />
            </nav>

            {/* Collections section */}
            <div className="mt-6 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between px-3 mb-1">
                {!settings.compactSidebar ? (
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">Collections</span>
                ) : (
                  <span className="h-px flex-1 bg-white/10 mx-2" />
                )}
                <button type="button" onClick={() => setCreateCollectionOpen(true)}
                  title="New collection"
                  className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-faint)] hover:bg-white/10 hover:text-[var(--text)] transition">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-0.5 overflow-y-auto flex-1">
                {collections.length === 0 ? (
                  <p className="px-3 py-2 text-[12px] text-[var(--text-faint)] italic">No collections yet</p>
                ) : (
                  collections.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => handleCollectionSelect(c.id)}
                      className={`group flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                        view === 'collection' && selectedCollectionId === c.id
                          ? 'bg-[var(--bg-elevated)] text-[var(--text)]'
                          : 'text-[var(--text-dim)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'
                      } ${settings.compactSidebar ? 'justify-center px-0' : ''}`}
                      title={settings.compactSidebar ? c.name : undefined}
                    >
                      <svg className="shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      {!settings.compactSidebar && <span className="flex-1 truncate text-left">{c.name}</span>}
                      {!settings.compactSidebar && <span className="text-[10px] text-[var(--text-faint)] shrink-0">{c.documentCount}</span>}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* User panel */}
          {user && (
            <div className="mt-auto border-t border-white/5 pt-4 shrink-0">
              <UserMenu user={user} onSignOut={signOut} compact={settings.compactSidebar} />
            </div>
          )}
        </aside>

        {/* ── Main content ── */}
        <section ref={mainRef} className="min-h-0 overflow-y-auto animate-in fade-in slide-in-from-bottom-12 duration-[1000ms] ease-[cubic-bezier(0.23,1,0.32,1)] fill-mode-both delay-150">

          {/* Search header */}
          <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4 lg:px-8">
            {view === 'collection' && selectedCollection ? (
              <div className="flex items-center gap-3 w-full">
                <button type="button" onClick={handleBackToLibrary}
                  className="flex items-center gap-1.5 text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
                  </svg>
                  Library
                </button>
                <span className="text-[var(--text-faint)] text-sm">/</span>
                <span className="text-sm font-medium text-[var(--text)]">{selectedCollection.name}</span>
                <div className="ml-auto flex items-center gap-2">
                  <button type="button" onClick={() => { setAddDocsOpen(true); setSelectedDocIds(new Set()); setAddDocsSearch(''); }}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-dim)] hover:border-white/20 hover:text-[var(--text)] transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add documents
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex w-full max-w-3xl flex-col gap-2">
                {/* Search bar row */}
                <div className="flex items-center w-full rounded-xl border border-white/10 bg-[var(--bg-surface)] shadow-sm transition-all focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10">
                  {/* Search input area */}
                  <div className="flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2">
                    <svg className="shrink-0 text-[var(--text-faint)]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={
                        view === 'trash' ? 'Trash — search not available' :
                        view === 'recent' ? 'Recent — search not available' :
                        view === 'starred' ? 'Search starred documents…' :
                        'Search documents…'
                      }
                      disabled={view === 'trash' || view === 'recent'}
                      className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none disabled:opacity-40"
                    />
                    {/* Active filter chips */}
                    {filterChips.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        {filterChips.slice(0, 3).map(chip => (
                          <span
                            key={chip.id}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]"
                          >
                            {chip.label}
                            <button
                              type="button"
                              onClick={chip.onRemove}
                              aria-label={`Remove ${chip.label} filter`}
                              className="ml-0.5 rounded opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                            >
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                        {filterChips.length > 3 && (
                          <span className="text-[11px] text-[var(--text-faint)]">+{filterChips.length - 3}</span>
                        )}
                      </div>
                    )}
                    {/* Clear text search */}
                    {search && view === 'all' && (
                      <button type="button" onClick={() => setSearch('')}
                        className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-faint)] hover:text-[var(--text)] transition-colors">
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="h-5 w-px shrink-0 bg-white/10" />

                  <SearchFilterPopover
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    collections={collections}
                    currentCollectionId={selectedCollectionId}
                    onCollectionSelect={handleCollectionSelect}
                    onCollectionClear={handleBackToLibrary}
                    currentView={view}
                    onViewChange={(v) => {
                      if (v !== 'collection') {
                        changeView(v);
                      }
                    }}
                    activeCount={filterChips.length}
                  />
                </div>

                {/* Mobile chips row — shown below search bar on small screens */}
                {filterChips.length > 0 && (
                  <div className="flex sm:hidden items-center gap-1.5 flex-wrap">
                    {filterChips.map(chip => (
                      <span
                        key={chip.id}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]"
                      >
                        {chip.label}
                        <button
                          type="button"
                          onClick={chip.onRemove}
                          aria-label={`Remove ${chip.label} filter`}
                          className="ml-0.5 rounded opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="px-5 py-8 lg:px-8">

            {/* ── All documents (home dashboard) ── */}
            <ViewPanel active={view === 'all'}>
              <>
                {/* Greeting */}
                <div>
                  {isSearchActive ? (
                    <>
                      <h1 className="font-serif text-4xl">Search results for &ldquo;{debouncedSearch}&rdquo;</h1>
                      <p className="mt-2 text-sm text-[var(--text-dim)]">{totalDocs} document{totalDocs === 1 ? '' : 's'} found.</p>
                    </>
                  ) : (
                    <>
                      <h1 className="font-serif text-4xl">{greeting}, {user?.name.split(' ')[0] || 'there'}.</h1>
                      <p className="mt-2 text-sm text-[var(--text-dim)]">
                        {totalDocs > 0 ? `${totalDocs} document${totalDocs === 1 ? '' : 's'} in your library.` : 'Upload your first PDF to get started.'}
                      </p>
                    </>
                  )}
                </div>

                {/* Featured most-recent card */}
                {!isSearchActive && isLoading && (
                  <div className="mt-7 flex flex-col sm:flex-row gap-6 rounded-2xl border border-white/10 bg-[var(--bg-surface)] p-6 animate-pulse">
                    <div className="relative shrink-0 w-[140px] h-[180px] hidden sm:block bg-white/5 rounded-[4px]" />
                    <div className="flex flex-col flex-1 items-start w-full gap-3">
                      <div className="h-6 w-48 rounded-full bg-white/5" />
                      <div className="h-8 w-3/4 max-w-xl rounded bg-white/10" />
                      <div className="h-4 w-64 rounded bg-white/5" />
                    </div>
                  </div>
                )}
                {!isSearchActive && sortedDocuments.length > 0 && (
                  <div className="mt-7 flex flex-col sm:flex-row gap-6 rounded-2xl border border-white/10 bg-[var(--bg-surface)] p-6 shadow-sm">
                    <div className="relative shrink-0 w-[140px] h-[180px] hidden sm:block mt-1">
                      <div className="absolute top-2 left-2 w-full h-full bg-white/5 rounded-[4px] transform rotate-3 border border-white/10" />
                      <div className="absolute top-1 left-1 w-full h-full bg-white/20 rounded-[4px] transform rotate-1 border border-white/20" />
                      <BannerDocumentPreview documentId={sortedDocuments[0].id} />
                    </div>
                    <div className="flex flex-col flex-1 items-start">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-3 py-1 text-xs text-[var(--text-dim)]">
                        <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                        <span className="font-medium text-[var(--text)]">Most recent</span>
                      </div>
                      <h2 className="mt-3 font-serif text-[28px] sm:text-3xl leading-tight text-[var(--text)]">{sortedDocuments[0].title}</h2>
                      <p className="mt-2 text-[13px] text-[var(--text-faint)]">{formatMeta(sortedDocuments[0])}</p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button type="button" onClick={() => handleDocumentClick(sortedDocuments[0])}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90">
                          Open document
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                        </button>
                        <button type="button" onClick={() => toggleStar.mutate(sortedDocuments[0].id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                            sortedDocuments[0].isStarred
                              ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                              : 'border-white/10 bg-transparent text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)]'
                          }`}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={sortedDocuments[0].isStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          {sortedDocuments[0].isStarred ? 'Starred' : 'Star'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Recently Opened strip ── */}
                {!isSearchActive && recentDocs.length > 0 && (
                  <div className="mt-8">
                    <SectionHeader
                      label="Recently opened"
                      action={
                        <button type="button" onClick={() => changeView('recent')}
                          className="text-[11px] text-[var(--text-faint)] hover:text-[var(--text)] transition-colors flex items-center gap-1">
                          View all
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                          </svg>
                        </button>
                      }
                    />
                    <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {recentLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="animate-pulse shrink-0 flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--bg-surface)] px-3 py-3 w-[210px]">
                              <div className="h-9 w-7 rounded bg-white/5 shrink-0" />
                              <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-3/4 rounded bg-white/10" />
                                <div className="h-2.5 w-1/2 rounded bg-white/5" />
                              </div>
                            </div>
                          ))
                        : recentDocs.slice(0, 8).map(doc => (
                            <RecentDocCard key={doc.id} doc={doc} onClick={() => handleDocumentClick(doc)} />
                          ))
                      }
                    </div>
                  </div>
                )}

                {/* ── Collections grid ── */}
                {!isSearchActive && (
                  <div className="mt-8">
                    <SectionHeader
                      label="Collections"
                      action={
                        <button type="button" onClick={() => setCreateCollectionOpen(true)}
                          className="text-[11px] text-[var(--text-faint)] hover:text-[var(--text)] transition-colors flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          New
                        </button>
                      }
                    />
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {collections.map(col => (
                        <CollectionCard
                          key={col.id}
                          collection={col}
                          isActive={false}
                          onClick={() => handleCollectionSelect(col.id)}
                          onDelete={() => setPendingDeleteCollectionId(col.id)}
                        />
                      ))}
                      <button type="button" onClick={() => setCreateCollectionOpen(true)}
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 p-4 text-[var(--text-faint)] transition hover:border-white/30 hover:text-[var(--text-dim)] hover:bg-[var(--bg-surface)] min-h-[100px]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span className="text-xs">New collection</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Library grid ── */}
                <div className="mt-8">
                  {!isSearchActive && (
                    <SectionHeader label="Library" action={<ViewToggle value={viewMode} onChange={setViewMode} />} />
                  )}
                  {isSearchActive && (
                    <div className="flex justify-end mb-3">
                      <ViewToggle value={viewMode} onChange={setViewMode} />
                    </div>
                  )}
                  <div ref={allGridRef} className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'flex flex-col gap-1.5'}>
                    {isLoading
                      ? (viewMode === 'grid' ? <SkeletonGrid /> : <SkeletonList />)
                      : isError ? (
                        <div className="col-span-full py-12 text-center">
                          <p className="text-sm text-red-400">Failed to load documents. Make sure the backend is running.</p>
                          <p className="mt-1 text-xs text-[var(--text-faint)]">Backend: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}</p>
                        </div>
                      ) : sortedDocuments.length > 0 ? (
                        sortedDocuments.map(doc => (
                          viewMode === 'grid'
                            ? <DocumentCard key={doc.id} doc={doc} search={debouncedSearch}
                                onClick={() => handleDocumentClick(doc)}
                                onDelete={() => setPendingDeleteId(doc.id)}
                                onToggleStar={() => toggleStar.mutate(doc.id)}
                                isDeleting={softDelete.isPending && softDelete.variables === doc.id}
                              />
                            : <DocumentListRow key={doc.id} doc={doc} search={debouncedSearch}
                                onClick={() => handleDocumentClick(doc)}
                                onDelete={() => setPendingDeleteId(doc.id)}
                                onToggleStar={() => toggleStar.mutate(doc.id)}
                                isDeleting={softDelete.isPending && softDelete.variables === doc.id}
                              />
                        ))
                      ) : (
                        <div className="col-span-full py-12 text-center">
                          <p className="text-sm text-[var(--text-faint)]">
                            {debouncedSearch ? `No documents matching "${debouncedSearch}".` : 'No documents yet. Upload your first PDF!'}
                          </p>
                        </div>
                      )
                    }
                    {viewMode === 'grid' && (
                      <button type="button" onClick={() => setUploadOpen(true)}
                        className="min-h-[220px] rounded-xl border border-dashed border-white/20 bg-transparent p-4 text-center text-sm text-[var(--text-dim)] transition hover:border-white/40 hover:bg-[var(--bg-surface)] flex flex-col items-center justify-center gap-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-faint)]">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Drop a PDF or click to upload
                      </button>
                    )}
                  </div>
                  {documents.length > 0 && <InfiniteScrollTrigger hasMore={!!hasNextPage} onIntersect={() => fetchNextPage()} />}
                </div>
              </>
            </ViewPanel>

            {/* ── Recent view ── */}
            <ViewPanel active={view === 'recent'}>
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-serif text-4xl">Recent</h1>
                    <p className="mt-2 text-sm text-[var(--text-dim)]">Documents you&apos;ve opened, most recent first.</p>
                  </div>
                  <div className="mt-1"><ViewToggle value={viewMode} onChange={setViewMode} /></div>
                </div>
                <div ref={recentGridRef} className={`mt-8 ${viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'flex flex-col gap-1.5'}`}>
                  {recentLoading
                    ? (viewMode === 'grid' ? <SkeletonGrid /> : <SkeletonList />)
                    : sortedRecentDocs.length > 0 ? (
                      sortedRecentDocs.map(doc => (
                        viewMode === 'grid'
                          ? <DocumentCard key={doc.id} doc={doc}
                              onClick={() => handleDocumentClick(doc)}
                              onDelete={() => setPendingDeleteId(doc.id)}
                              onToggleStar={() => toggleStar.mutate(doc.id)}
                              isDeleting={softDelete.isPending && softDelete.variables === doc.id}
                            />
                          : <DocumentListRow key={doc.id} doc={doc}
                              onClick={() => handleDocumentClick(doc)}
                              onDelete={() => setPendingDeleteId(doc.id)}
                              onToggleStar={() => toggleStar.mutate(doc.id)}
                              isDeleting={softDelete.isPending && softDelete.variables === doc.id}
                            />
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center">
                        <p className="text-sm text-[var(--text-faint)]">No recently opened documents yet.</p>
                      </div>
                    )
                  }
                </div>
                {recentDocs.length > 0 && <InfiniteScrollTrigger hasMore={!!hasNextRecent} onIntersect={() => fetchNextRecent()} />}
              </>
            </ViewPanel>

            {/* ── Collection view ── */}
            <ViewPanel active={view === 'collection' && !!selectedCollectionId}>
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-serif text-4xl">{selectedCollection?.name ?? 'Collection'}</h1>
                    <p className="mt-2 text-sm text-[var(--text-dim)]">
                      {collectionTotalDocs} document{collectionTotalDocs === 1 ? '' : 's'} in this collection.
                    </p>
                  </div>
                  <div className="mt-1"><ViewToggle value={viewMode} onChange={setViewMode} /></div>
                </div>
                <div ref={collectionGridRef} className={`mt-8 ${viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'flex flex-col gap-1.5'}`}>
                  {colDocsLoading
                    ? (viewMode === 'grid' ? <SkeletonGrid /> : <SkeletonList />)
                    : colDocsError ? (
                      <div className="col-span-full py-12 text-center">
                        <p className="text-sm text-red-400">Failed to load collection.</p>
                      </div>
                    ) : sortedCollectionDocs.length > 0 ? (
                      sortedCollectionDocs.map(doc => (
                        viewMode === 'grid'
                          ? <DocumentCard key={doc.id} doc={doc}
                              onClick={() => handleDocumentClick(doc)}
                              onDelete={() => setPendingDeleteId(doc.id)}
                              onToggleStar={() => toggleStar.mutate(doc.id)}
                              onRemoveFromCollection={() =>
                                removeFromCollection.mutate({ collectionId: selectedCollectionId!, documentId: doc.id })
                              }
                              isDeleting={softDelete.isPending && softDelete.variables === doc.id}
                            />
                          : <DocumentListRow key={doc.id} doc={doc}
                              onClick={() => handleDocumentClick(doc)}
                              onDelete={() => setPendingDeleteId(doc.id)}
                              onToggleStar={() => toggleStar.mutate(doc.id)}
                              onRemoveFromCollection={() =>
                                removeFromCollection.mutate({ collectionId: selectedCollectionId!, documentId: doc.id })
                              }
                              isDeleting={softDelete.isPending && softDelete.variables === doc.id}
                            />
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center">
                        <p className="text-sm text-[var(--text-faint)]">No documents in this collection yet.</p>
                        <button type="button" onClick={() => { setAddDocsOpen(true); setSelectedDocIds(new Set()); setAddDocsSearch(''); }}
                          className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-dim)] hover:text-[var(--text)] underline transition">
                          Add documents
                        </button>
                      </div>
                    )
                  }
                </div>
                {collectionDocs.length > 0 && <InfiniteScrollTrigger hasMore={!!hasNextColDocs} onIntersect={() => fetchNextColDocs()} />}
              </>
            </ViewPanel>

            {/* ── Starred view ── */}
            <ViewPanel active={view === 'starred'}>
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-serif text-4xl">Starred</h1>
                    <p className="mt-2 text-sm text-[var(--text-dim)]">Important documents you&apos;ve saved for quick access.</p>
                  </div>
                  <div className="mt-1"><ViewToggle value={viewMode} onChange={setViewMode} /></div>
                </div>
                <div ref={starredGridRef} className={`mt-8 ${viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'flex flex-col gap-1.5'}`}>
                  {starredLoading
                    ? (viewMode === 'grid' ? <SkeletonGrid /> : <SkeletonList />)
                    : sortedStarredDocs.length > 0 ? (
                      sortedStarredDocs.map(doc => (
                        viewMode === 'grid'
                          ? <DocumentCard key={doc.id} doc={doc}
                              onClick={() => handleDocumentClick(doc)}
                              onDelete={() => setPendingDeleteId(doc.id)}
                              onToggleStar={() => toggleStar.mutate(doc.id)}
                              isDeleting={softDelete.isPending && softDelete.variables === doc.id}
                            />
                          : <DocumentListRow key={doc.id} doc={doc}
                              onClick={() => handleDocumentClick(doc)}
                              onDelete={() => setPendingDeleteId(doc.id)}
                              onToggleStar={() => toggleStar.mutate(doc.id)}
                              isDeleting={softDelete.isPending && softDelete.variables === doc.id}
                            />
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center">
                        <p className="text-sm text-[var(--text-faint)]">No starred documents yet.</p>
                      </div>
                    )
                  }
                </div>
                {starredDocs.length > 0 && <InfiniteScrollTrigger hasMore={!!hasNextStarred} onIntersect={() => fetchNextStarred()} />}
              </>
            </ViewPanel>

            {/* ── Trash view ── */}
            <ViewPanel active={view === 'trash'}>
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-serif text-4xl">Trash</h1>
                    <p className="mt-2 text-sm text-[var(--text-dim)]">Documents here are permanently deleted after 30 days.</p>
                  </div>
                  <div className="mt-1"><ViewToggle value={viewMode} onChange={setViewMode} /></div>
                </div>
                <div ref={trashGridRef} className={`mt-8 ${viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'flex flex-col gap-1.5'}`}>
                  {trashLoading
                    ? (viewMode === 'grid' ? <SkeletonGrid count={3} /> : <SkeletonList count={3} />)
                    : trashedDocs.length > 0 ? (
                      trashedDocs.map(doc => (
                        viewMode === 'grid'
                          ? <TrashCard key={doc.id} doc={doc}
                              onRestore={() => restore.mutate(doc.id)}
                              onDeleteForever={() => setPendingPermDeleteId(doc.id)}
                              isRestoring={restore.isPending && restore.variables === doc.id}
                              isDeleting={permDelete.isPending && permDelete.variables === doc.id}
                            />
                          : <TrashListRow key={doc.id} doc={doc}
                              onRestore={() => restore.mutate(doc.id)}
                              onDeleteForever={() => setPendingPermDeleteId(doc.id)}
                              isRestoring={restore.isPending && restore.variables === doc.id}
                              isDeleting={permDelete.isPending && permDelete.variables === doc.id}
                            />
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center">
                        <p className="text-sm text-[var(--text-faint)]">Trash is empty.</p>
                      </div>
                    )
                  }
                </div>
                {trashedDocs.length > 0 && <InfiniteScrollTrigger hasMore={!!hasNextTrash} onIntersect={() => fetchNextTrash()} />}
              </>
            </ViewPanel>
          </div>
        </section>

        {/* ── Floating upload button ── */}
        {(view === 'all' || view === 'recent' || view === 'starred') && (
          <button onClick={() => setUploadOpen(true)} type="button"
            className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--text)] text-[var(--bg-base)] shadow-2xl shadow-white/10 transition-transform hover:scale-105 active:scale-95"
            aria-label="Upload PDF">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}

        {/* ── Dialogs ── */}
        <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

        {/* Create collection dialog */}
        <Dialog.Root open={createCollectionOpen} onOpenChange={setCreateCollectionOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 bg-[var(--bg-surface)] p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
              <Dialog.Title className="text-base font-semibold text-[var(--text)]">New collection</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--text-dim)]">Give your collection a name to get started.</Dialog.Description>
              <input
                type="text" autoFocus
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCollection(); }}
                placeholder="e.g. Research papers"
                maxLength={100}
                className="mt-4 w-full rounded-lg border border-white/10 bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-white/20 transition"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Dialog.Close asChild>
                  <button type="button" className="inline-flex items-center justify-center rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium hover:bg-white/5 transition">
                    Cancel
                  </button>
                </Dialog.Close>
                <button type="button" onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || createCollection.isPending}
                  className="inline-flex items-center justify-center rounded-md bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] transition hover:opacity-90 disabled:opacity-50">
                  {createCollection.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Add documents to collection dialog */}
        <Dialog.Root open={addDocsOpen} onOpenChange={setAddDocsOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 bg-[var(--bg-surface)] shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 flex flex-col max-h-[70vh]">
              <div className="p-5 border-b border-white/10 shrink-0">
                <Dialog.Title className="text-base font-semibold text-[var(--text)]">
                  Add to &ldquo;{selectedCollection?.name}&rdquo;
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-[var(--text-dim)]">
                  Select documents from your library to add to this collection.
                </Dialog.Description>
                <input
                  type="text" autoFocus
                  value={addDocsSearch}
                  onChange={(e) => setAddDocsSearch(e.target.value)}
                  placeholder="Filter documents…"
                  className="mt-3 w-full rounded-lg border border-white/10 bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-white/20 transition"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {pickableDocs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--text-faint)]">No documents found.</p>
                ) : pickableDocs.map(doc => (
                  <button key={doc.id} type="button"
                    onClick={() => toggleDocSelection(doc.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      selectedDocIds.has(doc.id) ? 'bg-[var(--accent)]/10 text-[var(--text)]' : 'hover:bg-white/5 text-[var(--text-dim)]'
                    }`}>
                    <div className={`shrink-0 flex h-4 w-4 items-center justify-center rounded border transition ${
                      selectedDocIds.has(doc.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-white/20'
                    }`}>
                      {selectedDocIds.has(doc.id) && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-[11px] text-[var(--text-faint)] truncate">{formatMeta(doc)}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-white/10 shrink-0 flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-faint)]">
                  {selectedDocIds.size > 0 ? `${selectedDocIds.size} selected` : 'Select documents above'}
                </span>
                <div className="flex gap-2">
                  <Dialog.Close asChild>
                    <button type="button" className="inline-flex items-center justify-center rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium hover:bg-white/5 transition">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button type="button" onClick={handleAddDocuments}
                    disabled={selectedDocIds.size === 0 || addToCollection.isPending}
                    className="inline-flex items-center justify-center rounded-md bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] transition hover:opacity-90 disabled:opacity-50">
                    {addToCollection.isPending ? 'Adding…' : `Add ${selectedDocIds.size > 0 ? selectedDocIds.size : ''}`}
                  </button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Move to trash confirm */}
        <ConfirmDialog
          open={pendingDeleteId !== null} onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
          title="Move to Trash?" description="This document will be moved to Trash. You can restore it at any time."
          confirmLabel="Move to Trash" confirmClassName="bg-[var(--text)] text-[var(--bg-base)] hover:opacity-90"
          onConfirm={handleSoftDeleteConfirm} isPending={softDelete.isPending}
        />

        {/* Permanent delete confirm */}
        <ConfirmDialog
          open={pendingPermDeleteId !== null} onOpenChange={(o) => { if (!o) setPendingPermDeleteId(null); }}
          title="Delete forever?" description="This document will be permanently deleted and cannot be recovered."
          confirmLabel="Delete forever" onConfirm={handlePermDeleteConfirm} isPending={permDelete.isPending}
        />

        {/* Delete collection confirm */}
        <ConfirmDialog
          open={pendingDeleteCollectionId !== null} onOpenChange={(o) => { if (!o) setPendingDeleteCollectionId(null); }}
          title="Delete collection?" description="The collection will be deleted. Documents inside will not be affected."
          confirmLabel="Delete collection" onConfirm={handleDeleteCollectionConfirm} isPending={deleteCollection.isPending}
        />
      </main>
    </ProtectedRoute>
  );
}
