import { LandingNav } from '../components/landing-nav';
import { LandingFooter } from '../components/landing-footer';

export const metadata = {
  title: 'Security - Nib',
};

export default function SecurityPage() {
  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '15.5px', lineHeight: 1.5, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>
      <LandingNav />
      
      <main className="px-8 py-20" style={{ maxWidth: 880, margin: '0 auto', minHeight: 'calc(100vh - 300px)' }}>
        <h1 className="font-medium tracking-[-0.025em] m-0 mb-4" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.05 }}>
          Security
        </h1>
        <p className="text-[17px] mb-12" style={{ color: 'var(--text-dim)' }}>
          Protecting your documents is our top priority.
        </p>

        <div className="flex flex-col gap-8 text-[15.5px]" style={{ color: 'var(--text-dim)' }}>
          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">Cloud Infrastructure</h2>
            <p>
              Nib is hosted entirely on Amazon Web Services (AWS), utilizing their highly secure, compliant, and physically protected data centers. Our backend databases and storage buckets are strictly access-controlled and isolated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">Data Encryption</h2>
            <p className="mb-2">We enforce encryption across all points of the application:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>In Transit:</strong> All communication between your browser and our servers, as well as between our servers and third-party AI models, is encrypted using TLS 1.2 or higher.</li>
              <li><strong>At Rest:</strong> All uploaded PDFs and generated metadata are encrypted at rest using AES-256 encryption.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">AI Provider Policies</h2>
            <p>
              We utilize Enterprise tier APIs from Anthropic and OpenAI to power Nib's extraction and chat features. Under our enterprise agreements, <strong>zero customer data is used to train their foundational models.</strong> Your documents remain strictly confidential and are only processed in memory for the duration of the request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">Vulnerability Disclosure</h2>
            <p>
              If you believe you have discovered a security vulnerability in Nib, please reach out to <strong>security@readnib.com</strong> immediately. We take all reports seriously and will investigate and patch any valid issues promptly.
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
