'use client';

import dynamic from 'next/dynamic';

/**
 * The landing page is client-only (ssr: false) to avoid hydration mismatches
 * caused by browser extensions injecting DOM nodes before React hydrates.
 * The actual content lives in ./components/landing-content.tsx.
 */
const LandingContent = dynamic(() => import('./components/landing-content'), {
  ssr: false,
});

export default function Page() {
  return <LandingContent />;
}
