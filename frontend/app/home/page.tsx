'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { useDebounce } from '../hooks/use-debounce';
import { useDocuments, type DocumentItem } from './hooks/use-documents';
import { NibLogo } from '../components/nib-logo';
import { useAuth } from '../features/auth/hooks/use-auth';
import { ProtectedRoute } from '../features/auth/components/protected-route';
import { useUpload } from '../features/upload/upload-context';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data: documents, isLoading, isError } = useDocuments(debouncedSearch);
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setFile, setDocument } = useUpload();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);       // Set local file (clears any previous document IDs)
      router.push('/file'); // Navigate immediately — upload happens in the background from the viewer
    }
    e.target.value = '';
  };

  const handleDocumentClick = (doc: DocumentItem) => {
    setDocument(null, doc.id, doc.storageUrl);
    router.push('/file');
  };

  return (
    <ProtectedRoute>
      <main className="grid min-h-[100dvh] grid-cols-1 bg-[var(--bg-base)] lg:grid-cols-[256px_1fr] overflow-hidden">
        <aside className="flex flex-col border-b border-white/10 bg-[var(--bg-surface)] p-4 lg:border-b-0 lg:border-r lg:h-full justify-between animate-in fade-in slide-in-from-left-8 duration-[1000ms] ease-[cubic-bezier(0.23,1,0.32,1)] fill-mode-both">
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 px-2 pb-4">
              <div className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--text)] text-[var(--bg-base)]">
                <NibLogo size={15} />
              </div>
              <span className="text-base font-semibold">Nib</span>
            </div>
            <button onClick={handleUploadClick} type="button" className="mb-4 flex w-full items-center justify-between rounded-lg bg-[var(--text)] px-3 py-2 text-sm font-medium text-[var(--bg-base)] transition hover:opacity-90">
              Upload PDF
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--bg-base)] text-[var(--text)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
            </button>
            {/* Nav Items */}
            <nav className="space-y-1 text-[13px] font-medium text-[var(--text-dim)] mt-2">
              <button className="flex w-full items-center justify-between rounded-md bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text)]">
                <div className="flex items-center gap-3">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
                  All documents
                </div>
                <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-white/5 px-1.5 text-[10px] font-semibold text-[var(--text-faint)]">
                  {documents?.length ?? '—'}
                </span>
              </button>
              <button className="flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-[var(--bg-elevated)] hover:text-[var(--text)] transition-colors">
                <div className="flex items-center gap-3">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Recent
                </div>
              </button>
              <button className="flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-[var(--bg-elevated)] hover:text-[var(--text)] transition-colors">
                <div className="flex items-center gap-3">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Starred
                </div>
              </button>
              <button className="flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-[var(--bg-elevated)] hover:text-[var(--text)] transition-colors">
                <div className="flex items-center gap-3">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  Trash
                </div>
              </button>
            </nav>

            <div className="mt-8 mb-4">
              <div className="px-3 text-xs font-medium text-[var(--text-faint)]">
                Recent threads
              </div>
              <div className="mt-3 space-y-3 text-[var(--text-dim)]">
                <button className="flex w-full items-start gap-3 px-3 hover:text-[var(--text)] transition-colors text-left group">
                  <div className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-faint)] group-hover:bg-[var(--text)] transition-colors"></div>
                  <span className="font-serif italic text-sm">Highest peak thermal load?</span>
                </button>
                <button className="flex w-full items-start gap-3 px-3 hover:text-[var(--text)] transition-colors text-left group">
                  <div className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-faint)] group-hover:bg-[var(--text)] transition-colors"></div>
                  <span className="font-serif italic text-sm">Summarize the risk factors</span>
                </button>
              </div>
            </div>
          </div>

          {user && (
            <div className="mt-auto border-t border-white/5 pt-4">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-white/[0.01] border border-white/5">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full border border-white/10 bg-white/5" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-dim)] border border-white/10">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-[var(--text)] truncate">{user.name}</span>
                  <span className="text-[10px] text-[var(--text-faint)] truncate">{user.email}</span>
                </div>
                <Dialog.Root>
                  <Dialog.Trigger asChild>
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-red-500/10 text-[var(--text-faint)] hover:text-red-500 transition cursor-pointer"
                      title="Sign out"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 3H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h5M14 8H6M11 5l3 3-3 3"/>
                      </svg>
                    </button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-white/10 bg-[var(--bg-surface)] p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
                      <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                        <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">Sign out of Nib?</Dialog.Title>
                        <Dialog.Description className="text-sm text-[var(--text-dim)]">
                          You will be returned to the login screen and will need to sign in again to access your library.
                        </Dialog.Description>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
                        <Dialog.Close asChild>
                          <button type="button" className="mt-2 inline-flex items-center justify-center rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium shadow-sm hover:bg-white/5 sm:mt-0 transition">
                            Cancel
                          </button>
                        </Dialog.Close>
                        <button type="button" onClick={signOut} className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition">
                          Sign out
                        </button>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            </div>
          )}
        </aside>

      <section className="min-h-0 overflow-y-auto animate-in fade-in slide-in-from-bottom-12 duration-[1000ms] ease-[cubic-bezier(0.23,1,0.32,1)] fill-mode-both delay-150">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4 lg:px-8">
          <div className="relative w-full max-w-3xl">
            <div className="flex items-center w-full rounded-xl border border-white/10 bg-[var(--bg-surface)] shadow-sm transition-all focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10">
              <div className="flex flex-1 items-center relative">
                <svg className="absolute left-4 text-[var(--text-faint)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full bg-transparent pl-11 pr-10 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 text-xs font-medium text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="h-5 w-[1px] bg-white/10 shrink-0" />

              <button className="group flex shrink-0 items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--text-dim)] hover:text-[var(--text)] transition-colors rounded-r-xl hover:bg-white/[0.03]">
                <svg className="text-[var(--text-faint)] group-hover:text-[var(--text)] transition-colors" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="21" x2="14" y1="4" y2="4"/>
                  <line x1="10" x2="3" y1="4" y2="4"/>
                  <line x1="21" x2="12" y1="12" y2="12"/>
                  <line x1="8" x2="3" y1="12" y2="12"/>
                  <line x1="21" x2="16" y1="20" y2="20"/>
                  <line x1="12" x2="3" y1="20" y2="20"/>
                  <line x1="14" x2="14" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="10" y2="14"/>
                  <line x1="16" x2="16" y1="18" y2="22"/>
                </svg>
                Filter
              </button>
            </div>
          </div>
        </header>

        <div className="px-5 py-8 lg:px-8">
          <div>
            <h1 className="font-serif text-4xl">Good afternoon, {user?.name.split(' ')[0] || 'Guest'}.</h1>
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              {documents && documents.length > 0
                ? `${documents.length} document${documents.length === 1 ? '' : 's'} in your library.`
                : 'Upload your first PDF to get started.'}
            </p>
          </div>

          {/* Featured / most recent document */}
          {isLoading ? (
            <div className="mt-7 flex flex-col sm:flex-row gap-6 rounded-2xl border border-white/10 bg-[var(--bg-surface)] p-6 animate-pulse">
              <div className="relative shrink-0 w-[140px] h-[180px] hidden sm:block bg-white/5 rounded-[4px]" />
              <div className="flex flex-col flex-1 items-start w-full">
                <div className="h-6 w-48 rounded-full bg-white/5" />
                <div className="mt-4 h-8 w-3/4 max-w-xl rounded bg-white/10" />
                <div className="mt-3 h-4 w-64 rounded bg-white/5" />
                <div className="mt-5 flex gap-3">
                  <div className="h-10 w-36 rounded-lg bg-white/20" />
                </div>
              </div>
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="mt-7 flex flex-col sm:flex-row gap-6 rounded-2xl border border-white/10 bg-[var(--bg-surface)] p-6 shadow-sm">
              <div className="relative shrink-0 w-[140px] h-[180px] hidden sm:block mt-1">
                <div className="absolute top-2 left-2 w-full h-full bg-white/5 rounded-[4px] transform rotate-3 border border-white/10" />
                <div className="absolute top-1 left-1 w-full h-full bg-white/20 rounded-[4px] transform rotate-1 border border-white/20" />
                <div className="absolute top-0 left-0 w-full h-full bg-[#f4f1ea] rounded-[4px] p-3.5 shadow-xl border border-black/10 flex flex-col">
                  <div className="text-[8px] font-serif font-bold text-[#1a1a1a] leading-tight">{documents[0].title}</div>
                  <div className="mt-auto space-y-1">
                    <div className="h-0.5 w-full bg-[#ccc]" />
                    <div className="h-0.5 w-3/4 bg-[#ccc]" />
                    <div className="h-0.5 w-full bg-[#ccc]" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col flex-1 items-start">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-3 py-1 text-xs text-[var(--text-dim)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                  <span className="font-medium text-[var(--text)]">Most recent</span>
                </div>
                <h2 className="mt-3 font-serif text-[28px] sm:text-3xl leading-tight text-[var(--text)]">{documents[0].title}</h2>
                <p className="mt-2 text-[13px] text-[var(--text-faint)]">{documents[0].meta}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleDocumentClick(documents[0])}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
                  >
                    Open document
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="inline-flex items-center rounded-lg border border-white/10 bg-[#0a0c10] p-1 text-[13px] font-medium text-[var(--text-dim)]">
              <button className="rounded-md bg-[#1d2129] px-3 py-1.5 text-[var(--text)] shadow-sm">All</button>
              <button className="px-3 py-1.5 hover:text-[var(--text)] transition-colors">Recent</button>
            </div>
            <div className="inline-flex items-center rounded-lg border border-white/10 bg-[#0a0c10] p-1">
              <button className="rounded-md bg-[#1d2129] p-1.5 text-[var(--text)] shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              </button>
              <button className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-[var(--bg-surface)] p-4">
                  <div className="mb-4 aspect-[4/3] rounded-md bg-white/5" />
                  <div className="h-5 w-3/4 rounded bg-white/10" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-white/5" />
                  <div className="mt-4 h-5 w-16 rounded bg-white/5" />
                </div>
              ))
            ) : isError ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-sm text-red-400">Failed to load documents. Make sure the backend is running.</p>
                <p className="mt-1 text-xs text-[var(--text-faint)]">Backend: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}</p>
              </div>
            ) : documents && documents.length > 0 ? (
              documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => handleDocumentClick(doc)}
                  className="text-left rounded-xl border border-white/10 bg-[var(--bg-surface)] p-4 transition hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg"
                >
                  <div className="mb-4 aspect-[4/3] rounded-md bg-gradient-to-b from-[#1d2129] to-[#15181f] flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                  <h4 className="font-serif text-lg leading-6 line-clamp-2">{doc.title}</h4>
                  <p className="mt-1 text-xs text-[var(--text-faint)] truncate">{doc.meta}</p>
                  <span className="mt-3 inline-flex rounded bg-white/10 px-2 py-1 text-[10px] text-[var(--text-dim)]">{doc.tag}</span>
                </button>
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <p className="text-sm text-[var(--text-faint)]">
                  {search ? `No documents matching "${search}".` : 'No documents yet. Upload your first PDF!'}
                </p>
              </div>
            )}
            <button
              onClick={handleUploadClick}
              className="min-h-[220px] rounded-xl border border-dashed border-white/20 bg-transparent p-4 text-center text-sm text-[var(--text-dim)] transition hover:border-white/40 hover:bg-[var(--bg-surface)] flex flex-col items-center justify-center gap-3"
              type="button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-faint)]">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Drop a PDF or click to upload
            </button>
          </div>
        </div>
      </section>

      {/* Floating upload button */}
      <button
        onClick={handleUploadClick}
        type="button"
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--text)] text-[var(--bg-base)] shadow-2xl shadow-white/10 transition-transform hover:scale-105 active:scale-95"
        aria-label="Upload PDF"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        className="hidden"
      />
    </main>
  </ProtectedRoute>
  );
}
