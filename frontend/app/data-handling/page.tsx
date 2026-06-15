import { LandingNav } from '../components/landing-nav';
import { LandingFooter } from '../components/landing-footer';

export const metadata = {
  title: 'Data Handling - Nib',
};

export default function DataHandlingPage() {
  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '15.5px', lineHeight: 1.5, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>
      <LandingNav />
      
      <main className="px-4 sm:px-8 py-12 sm:py-20" style={{ maxWidth: 880, margin: '0 auto', minHeight: 'calc(100vh - 300px)' }}>
        <h1 className="font-medium tracking-[-0.025em] m-0 mb-4" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.05 }}>
          Data Handling
        </h1>
        <p className="text-[17px] mb-12" style={{ color: 'var(--text-dim)' }}>
          Transparency regarding how your PDFs are processed.
        </p>

        <div className="flex flex-col gap-8 text-[15.5px]" style={{ color: 'var(--text-dim)' }}>
          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">The Lifecycle of a Document</h2>
            <p className="mb-2">When you upload a document to Nib, here is exactly what happens:</p>
            <ol className="list-decimal pl-5 flex flex-col gap-2">
              <li><strong>Upload:</strong> Your PDF is securely transmitted over TLS and stored in a private, encrypted AWS S3 bucket.</li>
              <li><strong>Extraction:</strong> The document is passed through our multimodal extraction pipeline. Text, tables, and images are parsed and broken into semantic chunks.</li>
              <li><strong>Indexing:</strong> These chunks are vectorized and stored in our secure vector database, allowing the AI to search and retrieve specific paragraphs instantly when you ask a question.</li>
              <li><strong>Querying:</strong> When you chat with a document, relevant chunks are sent to our Enterprise AI partners (like Anthropic) to generate a response. The AI provider processes the data in memory and immediately discards it.</li>
              <li><strong>Deletion:</strong> When you click "Delete Document", the raw PDF and all associated vector database chunks are permanently purged from our active systems.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">Data Sovereignty</h2>
            <p>
              You own your data. We claim no ownership over the intellectual property of the documents you upload. The data is simply held in trust by our platform to provide you with the reading and extraction services you requested.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">Exporting Data</h2>
            <p>
              We believe in preventing vendor lock-in. While not all export features are available in the alpha version, our roadmap includes full support for exporting your documents, generated notes, and citations in standard formats (CSV, Markdown, JSON) at any time.
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
