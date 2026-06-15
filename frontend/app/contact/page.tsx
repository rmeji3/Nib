import { LandingNav } from '../components/landing-nav';
import { LandingFooter } from '../components/landing-footer';

export const metadata = {
  title: 'Contact - Nib',
};

export default function ContactPage() {
  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '15.5px', lineHeight: 1.5, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>
      <LandingNav />
      
      <main className="px-4 sm:px-8 py-12 sm:py-20" style={{ maxWidth: 880, margin: '0 auto', minHeight: 'calc(100vh - 300px)' }}>
        <h1 className="font-medium tracking-[-0.025em] m-0 mb-4" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.05 }}>
          Contact
        </h1>
        <p className="text-[17px] mb-12" style={{ color: 'var(--text-dim)' }}>
          We're always happy to hear from you.
        </p>

        <div className="flex flex-col gap-8 text-[15.5px]" style={{ color: 'var(--text-dim)' }}>
          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">Get in Touch</h2>
            <p className="mb-4">
              Whether you have a question about pricing, encountered a bug, or just want to share feedback on how Nib is helping you study or work, please feel free to reach out. As an independent developer, reading user feedback is the best part of the day!
            </p>
            <p>
              You can email me directly at:{' '}
              <a href="mailto:hello@readnib.com" className="text-[var(--text)] font-medium hover:underline">
                hello@readnib.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">Support Hours</h2>
            <p>
              Support is handled directly by the developer. While I try to respond to all inquiries as quickly as possible, please allow up to 24-48 hours for a response, especially during weekends.
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
