'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { useUploadDialog } from '../hooks/use-upload-dialog';
import { useUpload } from '../../features/upload/upload-context';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();
  const { startUpload } = useUpload();
  const { files, name, setName, addFiles, removeFile, reset } = useUploadDialog();

  const handleUpload = () => {
    if (files.length === 0) return;
    startUpload(files, name || undefined);
    reset();
    onOpenChange(false);
    router.push('/document/uploading');
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const canUpload = files.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-[var(--bg-surface)] shadow-2xl shadow-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <Dialog.Title className="text-sm font-semibold text-[var(--text)]">
                New document
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-[var(--text-faint)]">
                Upload one or more PDFs - multiple files will be merged in order.
              </Dialog.Description>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] transition hover:bg-white/5 hover:text-[var(--text)]"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">

            {/* Drop zone */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
              className={`flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                isDragging ? 'border-white/40 bg-white/5' : 'border-white/15 hover:border-white/30 hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-dim)]">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">
                  {isDragging ? 'Drop PDFs here' : 'Drop PDFs or click to browse'}
                </p>
                <p className="mt-1 text-xs text-[var(--text-faint)]">PDF files up to 50 MB each</p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
            />

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-dim)]">
                    {files.length} file{files.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => addMoreRef.current?.click()}
                    className="text-xs text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
                  >
                    + Add more
                  </button>
                </div>
                <input
                  ref={addMoreRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
                />
                <ul className="rounded-lg border border-white/10 bg-[var(--bg-base)] divide-y divide-white/5 overflow-hidden">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 px-3 py-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--text-faint)]">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      {files.length > 1 && (
                        <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[9px] font-semibold text-[var(--text-faint)]">
                          {i + 1}
                        </span>
                      )}
                      <span className="flex-1 truncate text-xs text-[var(--text)]">{f.name}</span>
                      <span className="shrink-0 text-xs text-[var(--text-faint)]">{formatBytes(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-[var(--text-faint)] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M3 3l10 10M13 3L3 13" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Name field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-dim)]" htmlFor="doc-name">
                Document name
              </label>
              <input
                id="doc-name"
                type="text"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                placeholder={files.length > 0 ? files[0].name.replace(/\.pdf$/i, '') : 'My document'}
                className="w-full rounded-lg border border-white/10 bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none transition focus:border-white/25 focus:ring-1 focus:ring-white/10"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-transparent px-4 text-sm text-[var(--text-dim)] transition hover:bg-white/5 hover:text-[var(--text)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!canUpload}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-[var(--text)] px-4 text-sm font-medium text-[var(--bg-base)] transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 10V3M5 6l3-3 3 3"/>
                <path d="M3 10v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3"/>
              </svg>
              Upload{files.length > 1 ? ` & merge ${files.length} files` : ''}
            </button>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
