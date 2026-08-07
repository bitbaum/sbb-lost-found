import { ImageResponse } from 'next/og';

/**
 * Social preview card (1200x630 — the 1.91:1 size Slack, Telegram and the
 * OpenGraph scrapers crop to). This app shipped no og:image, so every shared
 * link rendered as a blank grey rectangle.
 *
 * Satori cannot read CSS custom properties, so the SBB palette is repeated
 * here as literals mirroring --sbb-red / --sbb-white in globals.css.
 */

export const runtime = 'edge';
export const alt = 'SBB Lost & Found';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SBB_RED = '#EB0000';
const WHITE = '#FFFFFF';
const MILK = '#F6F6F6';
const ANTHRACITE = '#5A5A5A';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: WHITE,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: SBB_RED, display: 'flex' }} />
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111111', letterSpacing: '-0.01em' }}>
            SBB Lost &amp; Found
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
              color: '#111111',
              maxWidth: 960,
            }}
          >
            Verlorenes schnell melden
          </div>
          <div style={{ marginTop: 28, fontSize: 32, lineHeight: 1.35, color: ANTHRACITE, maxWidth: 900 }}>
            Gegenstände direkt in der SBB App melden — einfach und ohne Umwege.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: MILK,
            padding: '14px 20px',
            borderRadius: 12,
          }}
        >
          <div style={{ width: 48, height: 5, borderRadius: 999, background: SBB_RED, display: 'flex' }} />
          <div style={{ fontSize: 24, color: ANTHRACITE }}>sbb.orangecat.ch</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
