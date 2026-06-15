import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_DESCRIPTION } from './lib/site-config';

// Static route — rendered once at build time into a shareable OG card.
export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(135deg, #0a0c10 0%, #11141a 55%, #181c24 100%)',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(99, 102, 241, 0.16)',
              border: '1px solid rgba(99, 102, 241, 0.42)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgb(165, 180, 252)',
              fontSize: '32px',
              fontWeight: 700,
            }}
          >
            N
          </div>
          <span style={{ color: '#ecedf1', fontSize: '34px', fontWeight: 600 }}>
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div
            style={{
              color: '#ecedf1',
              fontSize: '68px',
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: '900px',
            }}
          >
            Read documents with grounded AI
          </div>
          <div
            style={{
              color: '#a4abb6',
              fontSize: '30px',
              lineHeight: 1.4,
              maxWidth: '880px',
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
