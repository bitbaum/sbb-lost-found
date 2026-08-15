import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/components/providers/AppProvider';
import { ConceptNotice } from '@/components/ui/ConceptNotice';
import { tenant } from '@/lib/tenant';
import './globals.css';

// Every operator-facing string comes from the tenant SSOT (lib/tenant.ts).
// Nothing here names an operator.
export const metadata: Metadata = {
  title: tenant.productName,
  description: tenant.description,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: tenant.productName,
  },
  // A build carrying someone else's trademark is a pitch artefact and must not
  // be indexed — being findable is what turns a demo into impersonation.
  robots: tenant.isConcept ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: tenant.themeColor,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-tenant is the single switch: globals.css keys every operator
    // override off it, so the whole palette changes from this one attribute.
    <html lang={tenant.locale} data-tenant={tenant.id}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AppProvider>
          <div className="mobile-container">
            <ConceptNotice />
            {children}
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
