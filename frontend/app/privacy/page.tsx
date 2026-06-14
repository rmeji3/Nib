import { LandingNav } from '../components/landing-nav';
import { LandingFooter } from '../components/landing-footer';

export const metadata = {
  title: 'Privacy Policy - Nib',
};

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '15.5px', lineHeight: 1.5, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>
      <LandingNav />
      
      <main className="px-8 py-20" style={{ maxWidth: 880, margin: '0 auto', minHeight: 'calc(100vh - 300px)' }}>
        <h1 className="font-medium tracking-[-0.025em] m-0 mb-4" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.05 }}>
          Privacy Policy
        </h1>
        <p className="text-[17px] mb-12" style={{ color: 'var(--text-dim)' }}>
          Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="flex flex-col gap-8 text-[15.5px]" style={{ color: 'var(--text-dim)' }}>
          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">1. Introduction</h2>
            <p>
              Welcome to Nib ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our document intelligence and PDF reading application (the "Service").
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">2. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>Account Information:</strong> Name, email address, and authentication credentials when you create an account.</li>
              <li><strong>Document Data:</strong> The PDF files you upload and the content within them, which we process to provide our extraction, citation, and chat features.</li>
              <li><strong>Usage Data:</strong> Analytics about how you interact with our Service (e.g., features used, session duration) to help us improve.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">3. How We Use Your Data</h2>
            <p>
              We use your data solely to provide, maintain, and improve the Service. We process your documents to extract text, tables, and images, and to generate accurate, grounded citations and chat responses. <strong>We do not use your personal documents to train our own foundational AI models.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">4. Third-Party Data Processors</h2>
            <p>
              To provide our advanced multimodal intelligence and document processing features, we share necessary data with trusted third-party service providers. These include:
            </p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
              <li><strong>OpenAI &amp; Anthropic:</strong> Used for large language model (LLM) inference, chat generation, and reasoning. Your data is sent securely via their enterprise APIs, and they are restricted from using your data to train their models.</li>
              <li><strong>Amazon Web Services (AWS):</strong> Used for secure cloud hosting, database storage, and document processing infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">5. Data Retention and Deletion</h2>
            <p>
              You have full control over your data. User-uploaded PDFs and generated document metadata are retained only as long as you keep them in your workspace. 
              <strong> You can delete your documents at any time. Upon request or when you delete a document from your account, the PDF and all associated extracted data are permanently and immediately deleted from our active servers.</strong> 
              If you delete your account, all associated data is permanently erased.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">6. Security</h2>
            <p>
              We implement industry-standard security measures, including encryption in transit (TLS) and at rest, to protect your documents and personal information from unauthorized access, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">7. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at <strong>privacy@readnib.com</strong>.
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
