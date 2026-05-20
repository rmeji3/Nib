'use client';

import React from 'react';

interface OAuthButtonProps {
  provider: 'google';
  onClick: () => void;
  isLoading?: boolean;
}

export function OAuthButton({ provider, onClick, isLoading = false }: OAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition-all hover:bg-[var(--bg-hover)] hover:border-white/15 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 15 1 12 1 7.24 1 3.2 3.8 1.4 7.96l3.88 3C6.2 8.08 8.84 5.04 12 5.04z"
          />
          <path
            fill="#4285F4"
            d="M23.52 12.3c0-.82-.08-1.6-.2-2.38H12v4.5h6.48c-.28 1.48-1.12 2.74-2.38 3.58l3.68 2.86c2.16-2 3.74-4.94 3.74-8.56z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.04c-.24-.72-.38-1.5-.38-2.3a7.82 7.82 0 0 1 .38-2.3L1.4 6.44A11.96 11.96 0 0 0 0 12c0 2 1.1 3.78 2.76 4.96l2.52-2.92z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.24 0 5.96-1.08 7.96-2.92l-3.68-2.86c-1.12.76-2.54 1.22-4.28 1.22-3.16 0-5.8-3.04-6.72-5.92L1.4 15.52A11.97 11.97 0 0 0 12 23z"
          />
        </svg>
      )}
      <span>Continue with Google</span>
    </button>
  );
}
