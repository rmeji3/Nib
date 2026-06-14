import { LandingNav } from '../components/landing-nav';
import { LandingFooter } from '../components/landing-footer';

export const metadata = {
  title: 'About - Nib',
};

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '15.5px', lineHeight: 1.5, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' }}>
      <LandingNav />
      
      <main className="px-8 py-20" style={{ maxWidth: 880, margin: '0 auto', minHeight: 'calc(100vh - 300px)' }}>
        <h1 className="font-medium tracking-[-0.025em] m-0 mb-4" style={{ fontFamily: 'var(--font-doc)', fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.05 }}>
          About Nib
        </h1>
        <p className="text-[17px] mb-12" style={{ color: 'var(--text-dim)' }}>
          Built with care for researchers, analysts, and students.
        </p>

        <div className="flex flex-col gap-8 text-[15.5px]" style={{ color: 'var(--text-dim)' }}>
          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">The Story</h2>
            <p className="mb-4">
              Nib wasn't built by a massive corporation or a heavily-funded AI startup. It was built by an independent developer who was frustrated with how existing AI PDF tools handled dense, complex documents.
            </p>
            <p>
              Most tools simply extract raw text and hallucinate the rest - ignoring the crucial context provided by charts, tables, and figures. When reading technical papers or financial filings, getting the wrong answer is often worse than getting no answer at all. Nib was designed from the ground up to solve this exact problem, treating every visual element on a page as a first-class citizen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">Our Philosophy</h2>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li><strong>Accuracy over Answers:</strong> If Nib isn't confident, it won't guess. It's better to admit a limitation than to fabricate a hallucinated fact.</li>
              <li><strong>Grounded Verification:</strong> Every claim should point directly back to the source text or visual block, allowing you to instantly verify the information yourself.</li>
              <li><strong>Calm Software:</strong> Professional tools should get out of your way. No popups, no excessive notifications - just a clean, focused reading environment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-[var(--text)]">Built Independently</h2>
            <p>
              By remaining independent, Nib is able to focus entirely on building the best possible reading experience for its users, without the pressure of hyper-growth metrics or misaligned investor incentives.
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
