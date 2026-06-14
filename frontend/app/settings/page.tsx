'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../features/auth/hooks/use-auth';
import { ProtectedRoute } from '../features/auth/components/protected-route';
import { NibLogo } from '../components/nib-logo';
import { useSettings } from './hooks/use-settings';
import { CostDashboard } from './components/cost-dashboard';
import {
  UserIcon, PaletteIcon, BookOpenIcon, MessageSquareIcon,
  ShieldIcon, InfoIcon, ArrowLeftIcon,
  RotateCcwIcon, AlertTriangleIcon,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = 'profile' | 'appearance' | 'reader' | 'ai' | 'privacy' | 'about';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',    label: 'Profile',        icon: <UserIcon size={15} /> },
  { id: 'appearance', label: 'Appearance',     icon: <PaletteIcon size={15} /> },
  { id: 'reader',     label: 'PDF Reader',     icon: <BookOpenIcon size={15} /> },
  { id: 'ai',         label: 'AI & Chat',      icon: <MessageSquareIcon size={15} /> },
  { id: 'privacy',    label: 'Privacy & Data', icon: <ShieldIcon size={15} /> },
  { id: 'about',      label: 'About',          icon: <InfoIcon size={15} /> },
];

// ─── Reusable primitives ───────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">
      {children}
    </h2>
  );
}

/** Card that wraps a group of SettingRows */
function SettingCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/8 bg-[var(--bg-elevated)] divide-y divide-white/5 ${className ?? ''}`}>
      {children}
    </div>
  );
}

/** A single labelled row inside a SettingCard */
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3.5 last:pb-4 first:pt-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-faint)]">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] ${
        checked ? 'bg-[var(--text)]' : 'bg-white/10'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-[var(--bg-base)] shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="cursor-pointer rounded-lg border border-white/10 bg-[var(--bg-elevated)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div>
      <SectionTitle>Profile</SectionTitle>

      {/* Avatar + identity */}
      <div className="mb-6 flex items-center gap-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-16 w-16 rounded-full border border-white/10"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[var(--bg-elevated)] text-xl font-semibold text-[var(--text-dim)]">
            {initials}
          </div>
        )}
        <div>
          <p className="text-base font-semibold text-[var(--text)]">{user.name}</p>
          <p className="text-sm text-[var(--text-faint)]">{user.email}</p>
        </div>
      </div>

      <SettingCard className="mb-6">
        <SettingRow label="Display name" description="Shown across your library and documents">
          <p className="text-sm text-[var(--text-faint)]">{user.name}</p>
        </SettingRow>
        <SettingRow label="Email address" description="Used to sign in to your account">
          <p className="text-sm text-[var(--text-faint)]">{user.email}</p>
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function AppearanceTab() {
  const { settings, update } = useSettings();
  return (
    <div>
      <SectionTitle>Appearance</SectionTitle>
      <SettingCard className="mb-6">
        <SettingRow
          label="Compact sidebar"
          description="Reduce vertical spacing in the navigation sidebar"
        >
          <Toggle checked={settings.compactSidebar} onChange={v => update('compactSidebar', v)} />
        </SettingRow>

        <SettingRow
          label="Date display"
          description="How timestamps appear in your document library"
        >
          <Select
            value={settings.dateDisplay}
            onChange={v => update('dateDisplay', v)}
            options={[
              { value: 'relative', label: 'Relative (2h ago)' },
              { value: 'absolute', label: 'Absolute (May 18)' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Theme" description="Color scheme for the interface">
          <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-[var(--bg-surface)] p-1">
            <button
              type="button"
              onClick={() => update('theme', 'dark')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                settings.theme === 'dark'
                  ? 'bg-[var(--border-strong)] text-[var(--text)]'
                  : 'text-[var(--text-dim)] hover:bg-[var(--border-faint)] hover:text-[var(--text)]'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => update('theme', 'light')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                settings.theme === 'light'
                  ? 'bg-[var(--border-strong)] text-[var(--text)]'
                  : 'text-[var(--text-dim)] hover:bg-[var(--border-faint)] hover:text-[var(--text)]'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => update('theme', 'system')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                settings.theme === 'system'
                  ? 'bg-[var(--border-strong)] text-[var(--text)]'
                  : 'text-[var(--text-dim)] hover:bg-[var(--border-faint)] hover:text-[var(--text)]'
              }`}
            >
              System
            </button>
          </div>
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function ReaderTab() {
  const { settings, update } = useSettings();
  const [zoomVal, setZoomVal] = useState(settings.defaultZoom);

  useEffect(() => {
    setZoomVal(settings.defaultZoom);
  }, [settings.defaultZoom]);

  return (
    <div>
      <SectionTitle>PDF Reader</SectionTitle>
      <SettingCard className="mb-6">
        <SettingRow
          label="Default zoom"
          description={`Starting zoom level when opening a document (${zoomVal}%)`}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={50}
              max={200}
              step={10}
              value={zoomVal}
              onChange={e => setZoomVal(Number(e.target.value))}
              onPointerUp={e => update('defaultZoom', Number(e.currentTarget.value))}
              className="w-28 cursor-pointer accent-white"
            />
            <span className="w-10 text-right font-mono text-xs text-[var(--text-faint)]">
              {zoomVal}%
            </span>
          </div>
        </SettingRow>

        <SettingRow
          label="Show page numbers"
          description="Overlay the current page number while reading"
        >
          <Toggle checked={settings.showPageNumbers} onChange={v => update('showPageNumbers', v)} />
        </SettingRow>

        <SettingRow
          label="Smooth scrolling"
          description="Animate page transitions in the PDF viewer"
        >
          <Toggle checked={settings.smoothScrolling} onChange={v => update('smoothScrolling', v)} />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

function AiTab() {
  const { settings, update } = useSettings();
  return (
    <div>
      <SectionTitle>AI &amp; Chat</SectionTitle>
      <SettingCard className="mb-6">
        <SettingRow
          label="Auto-scroll on answer"
          description="Scroll the chat panel to new AI responses automatically"
        >
          <Toggle
            checked={settings.autoScrollOnAnswer}
            onChange={v => update('autoScrollOnAnswer', v)}
          />
        </SettingRow>

        <SettingRow
          label="Highlight citations"
          description="Visually mark cited text regions in the PDF viewer"
        >
          <Toggle
            checked={settings.citationHighlight}
            onChange={v => update('citationHighlight', v)}
          />
        </SettingRow>

        <SettingRow
          label="Show confidence"
          description="Display confidence bands alongside AI answers"
        >
          <Toggle
            checked={settings.showConfidence}
            onChange={v => update('showConfidence', v)}
          />
        </SettingRow>

        <SettingRow
          label="Page context window"
          description={`Pages of context around each citation (${settings.pageContextWindow} page${settings.pageContextWindow !== 1 ? 's' : ''})`}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={settings.pageContextWindow}
              onChange={e => update('pageContextWindow', Number(e.target.value))}
              className="w-28 cursor-pointer accent-white"
            />
            <span className="w-4 text-right font-mono text-xs text-[var(--text-faint)]">
              {settings.pageContextWindow}
            </span>
          </div>
        </SettingRow>
      </SettingCard>
      <CostDashboard />
    </div>
  );
}

function PrivacyTab() {
  const { settings, update } = useSettings();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div>
      <SectionTitle>Privacy &amp; Data</SectionTitle>
      <SettingCard className="mb-6">
        <SettingRow
          label="Auto-empty trash"
          description="Permanently delete trashed documents after this period"
        >
          <Select
            value={settings.trashRetention}
            onChange={v => update('trashRetention', v)}
            options={[
              { value: '7',     label: 'After 7 days'  },
              { value: '30',    label: 'After 30 days' },
              { value: '90',    label: 'After 90 days' },
              { value: 'never', label: 'Never'         },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Download my data"
          description="Export all your documents, collections, and settings as a zip"
        >
          <button
            type="button"
            onClick={() => alert('Data export is coming in a future release.')}
            className="inline-flex items-center rounded-lg border border-white/10 bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-dim)] transition hover:border-white/20 hover:text-[var(--text)]"
          >
            Request export
          </button>
        </SettingRow>
      </SettingCard>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangleIcon size={16} className="mt-0.5 shrink-0 text-red-400" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-red-400">Danger zone</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-faint)]">
              Deleting your account is permanent and cannot be undone. All documents, collections,
              and settings will be removed immediately.
            </p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="mt-4 inline-flex items-center rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:border-red-500/50 hover:bg-red-500/20"
            >
              Delete account
            </button>
          </div>
        </div>
      </div>

      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 bg-[var(--bg-surface)] p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <Dialog.Title className="text-base font-semibold text-[var(--text)]">
              Delete account?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-[var(--text-dim)]">
              This action is permanent and cannot be reversed. All your data will be deleted
              immediately.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={() => alert('Account deletion is not available in this preview.')}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Delete account
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}


function AboutTab() {
  return (
    <div>
      <SectionTitle>About</SectionTitle>
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--text)]">
          <NibLogo size={24} />
        </div>
        <div>
          <p className="text-base font-semibold text-[var(--text)]">Nib</p>
          <p className="text-sm text-[var(--text-faint)]">Multimodal PDF Intelligence</p>
        </div>
      </div>

      <SettingCard className="mb-6">
        <SettingRow label="Version">
          <span className="font-mono text-xs text-[var(--text-faint)]">0.1.0-alpha</span>
        </SettingRow>
      </SettingCard>

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Privacy policy', href: '#' },
        ].map(link => (
          <a
            key={link.label}
            href={link.href}
            className="inline-flex items-center rounded-lg border border-white/8 bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-dim)] transition hover:border-white/16 hover:text-[var(--text)]"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { reset } = useSettings();

  const initialTab = (searchParams.get('tab') as TabId | null) ?? 'profile';
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.find(t => t.id === initialTab) ? initialTab : 'profile',
  );
  const [resetOpen, setResetOpen] = useState(false);

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    router.replace(`/settings?tab=${id}`, { scroll: false });
  };

  return (
    <main className="min-h-[100dvh] bg-[var(--bg-base)] text-[var(--text)]">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/8 px-5 py-3 lg:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[var(--text-dim)] transition-colors hover:text-[var(--text)]"
        >
          <ArrowLeftIcon size={15} />
          Back
        </button>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[var(--text-faint)] transition hover:bg-white/5 hover:text-[var(--text-dim)]"
        >
          <RotateCcwIcon size={12} />
          Reset defaults
        </button>
      </header>

      <div className="mx-auto max-w-[960px] px-5 py-8 lg:px-8">
        <h1 className="mb-8 text-2xl font-semibold">Settings</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          {/* Sidebar nav */}
          <nav
            className="flex shrink-0 flex-row gap-1 overflow-x-auto pb-1 lg:w-[176px] lg:flex-col lg:overflow-x-visible lg:pb-0"
            aria-label="Settings navigation"
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                  activeTab === tab.id
                    ? 'bg-[var(--bg-elevated)] text-[var(--text)]'
                    : 'text-[var(--text-dim)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content panel */}
          <div className="min-w-0 flex-1">
            <div
              key={activeTab}
              className="rounded-2xl border border-white/8 bg-[var(--bg-surface)] p-6 lg:p-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
            >
              {activeTab === 'profile'    && user && <ProfileTab user={user} />}
              {activeTab === 'appearance' && <AppearanceTab />}
              {activeTab === 'reader'     && <ReaderTab />}
              {activeTab === 'ai'         && <AiTab />}
              {activeTab === 'privacy'    && <PrivacyTab />}
              {activeTab === 'about'      && <AboutTab />}
            </div>
          </div>
        </div>
      </div>

      {/* Reset confirm */}
      <Dialog.Root open={resetOpen} onOpenChange={setResetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 bg-[var(--bg-surface)] p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <Dialog.Title className="text-base font-semibold">Reset all settings?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-[var(--text-dim)]">
              All customizations will be reverted to their defaults. This cannot be undone.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={() => { reset(); setResetOpen(false); }}
                className="inline-flex items-center justify-center rounded-md bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] transition hover:opacity-90"
              >
                Reset
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Suspense>
        <SettingsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
