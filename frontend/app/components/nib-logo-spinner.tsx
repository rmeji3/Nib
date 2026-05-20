'use client';

import { NibLogo } from './nib-logo';

interface NibLogoSpinnerProps {
  /** Logo size in px. Container is sized at 2× this value. Defaults to 26. */
  size?: number;
  /** Optional label rendered below the spinner in small caps. */
  label?: string;
}

/**
 * Brand loading indicator — the Nib logo spinning slowly inside its white badge.
 * The spin is driven by the `.nib-spin` CSS class (globals.css) so it works
 * without any JS animation library.
 */
export function NibLogoSpinner({ size = 26, label }: NibLogoSpinnerProps) {
  const container = size * 2;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="flex items-center justify-center rounded-2xl bg-[var(--text)] text-[var(--bg-base)] shadow-[0_0_32px_-6px_rgba(255,255,255,0.10)]"
        style={{ width: container, height: container }}
      >
        <span className="nib-spin">
          <NibLogo size={size} />
        </span>
      </div>
      {label && (
        <span className="text-[10px] font-semibold tracking-widest text-[var(--text-faint)] uppercase">
          {label}
        </span>
      )}
    </div>
  );
}
