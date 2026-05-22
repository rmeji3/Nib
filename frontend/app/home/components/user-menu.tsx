'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SettingsIcon, KeyboardIcon, LogOutIcon, ChevronUpIcon } from 'lucide-react';
import type { User } from '@/app/features/auth/components/auth-provider';

interface UserMenuProps {
  user: User;
  onSignOut: () => void;
  variant?: 'sidebar' | 'toolbar';
}

export function UserMenu({ user, onSignOut, variant = 'sidebar' }: UserMenuProps) {
  const router = useRouter();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const initials = user.name.charAt(0).toUpperCase();

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform));
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === 'toolbar' ? (
            <button
              type="button"
              title="User menu"
              className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-all hover:ring-1 hover:ring-white/20 focus-visible:ring-1 focus-visible:ring-white/20"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 shrink-0 rounded-full border border-white/10 bg-white/5 object-cover" />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[var(--bg-elevated)] text-[11px] font-semibold text-[var(--text-dim)]">
                  {initials}
                </div>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-white/[0.01] px-2 py-1.5 outline-none transition-all hover:border-white/10 hover:bg-white/5 focus-visible:ring-1 focus-visible:ring-white/20"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 shrink-0 rounded-full border border-white/10 bg-white/5 object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-dim)]">
                  {initials}
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-xs font-semibold text-[var(--text)]">{user.name}</span>
                <span className="truncate text-[10px] text-[var(--text-faint)]">{user.email}</span>
              </div>
              <ChevronUpIcon
                size={13}
                className="shrink-0 text-[var(--text-faint)] transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side={variant === 'toolbar' ? 'bottom' : 'top'}
          align={variant === 'toolbar' ? 'end' : 'start'}
          sideOffset={8}
          className="w-[240px]"
        >
          {/* User identity header */}
          <DropdownMenuLabel className="px-2 py-2">
            <div className="flex items-center gap-2.5">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 shrink-0 rounded-full border border-white/10" />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[var(--bg-elevated)] text-[10px] font-bold text-[var(--text-dim)]">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--text)]">{user.name}</p>
                <p className="truncate text-[10px] text-[var(--text-faint)]">{user.email}</p>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <SettingsIcon size={14} />
            Settings
            <DropdownMenuShortcut>{isMac ? '⌘,' : 'Ctrl+,'}</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => router.push('/settings?tab=shortcuts')}>
            <KeyboardIcon size={14} />
            Keyboard shortcuts
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onClick={() => setSignOutOpen(true)}>
            <LogOutIcon size={14} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sign-out confirmation dialog */}
      <Dialog.Root open={signOutOpen} onOpenChange={setSignOutOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 bg-[var(--bg-surface)] p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <Dialog.Title className="text-base font-semibold text-[var(--text)]">
              Sign out of Nib?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-[var(--text-dim)]">
              You will be returned to the login screen and will need to sign in again to access your library.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
              >
                Sign out
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
