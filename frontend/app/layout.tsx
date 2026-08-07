import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/components/providers/AppProvider';
import './globals.css';

/**
 * Where this site actually serves. Load-bearing for the social preview: Next
 * resolves the generated og:image against `metadataBase`, and without it the
 * tag is emitted as http://localhost:3000/opengraph-image — present, plausible,
 * and unfetchable by every scraper. Falls back to the real host, not localhost.
 */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sbb.orangecat.ch';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'SBB Lost & Found',
  description: 'Schnell und einfach verlorene Gegenstände melden - direkt in der SBB App',
  openGraph: {
    title: 'SBB Lost & Found',
    description: 'Schnell und einfach verlorene Gegenstände melden - direkt in der SBB App',
    url: SITE_URL,
    siteName: 'SBB Lost & Found',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SBB Lost & Found',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#EB0000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AppProvider>
          <div className="mobile-container">
            {children}
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
