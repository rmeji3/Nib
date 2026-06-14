'use client';

import { LandingNav } from './components/landing-nav';
import { LandingFooter } from './components/landing-footer';
import { LandingHero } from './components/landing-hero';
import { LandingShowcase } from './components/landing-showcase';
import { LandingMultimodal } from './components/landing-multimodal';
import { LandingPricing } from './components/landing-pricing';
import { LandingCTA } from './components/landing-cta';

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '15.5px', lineHeight: 1.5, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>
      <LandingNav />
      <LandingHero />
      <LandingShowcase />
      <LandingMultimodal />
      <LandingPricing />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
