import Link from 'next/link';
import { NibMark } from './landing-nav';

export function LandingFooter() {
  return (
    <footer className="px-4 sm:px-8 pt-[60px] pb-8" style={{ borderTop: '1px solid var(--border-faint)', background: 'rgba(255,255,255,0.012)' }}>
      <div className="grid gap-8 mb-10 grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]" style={{ maxWidth: 'var(--maxw)', margin: '0 auto 40px' }}>
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2 no-underline" style={{ color: 'inherit' }}>
            <NibMark />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">Nib</span>
          </Link>
          <p className="text-[13.5px] max-w-[280px] mt-3 mb-0" style={{ color: 'var(--text-faint)' }}>A calmer way to read the documents that matter.</p>
        </div>
        {[
          { heading: 'Product', links: [{ label: 'Features', href: '/#product' }, { label: 'Pricing', href: '/#pricing' }, { label: 'Changelog', href: '/#changelog' }] },
          { heading: 'Company', links: [{ label: 'About', href: '/about' }, { label: 'Contact', href: '/contact' }] },
          { heading: 'Trust', links: [{ label: 'Security', href: '/security' }, { label: 'Privacy', href: '/privacy' }, { label: 'Data handling', href: '/data-handling' }] },
        ].map((col) => (
          <div key={col.heading} className="flex flex-col gap-2.5">
            <h4 className="text-[12.5px] font-semibold m-0 mb-2 tracking-[-0.005em]" style={{ color: 'var(--text)' }}>{col.heading}</h4>
            {col.links.map((l) => (
              <Link key={l.label} href={l.href} className="text-[13.5px] no-underline transition-colors hover:text-[var(--text)]" style={{ color: 'var(--text-faint)' }}>{l.label}</Link>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row justify-between gap-2 pt-6 text-[12.5px]" style={{ maxWidth: 'var(--maxw)', margin: '0 auto', borderTop: '1px solid var(--border-faint)', color: 'var(--text-faint)' }}>
        <span>© 2026 Nib Reader, Inc.</span>
        <span>Made with care in Chicago.</span>
      </div>
    </footer>
  );
}
