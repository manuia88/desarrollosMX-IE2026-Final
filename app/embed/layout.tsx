import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Minimal iframe-friendly layout para widgets embebibles /embed/*.
// NO incluye next-intl Provider ni app header — solo hereda <html>/<body>
// del root layout (app/layout.tsx) que ya expone tokens.css + TrpcProvider.
// CORS + frame-ancestors:* se aplican vía proxy.ts → applyEmbedHeaders.

export const metadata: Metadata = {
  title: 'DesarrollosMX — Embed',
  description: 'Widget embebible DesarrollosMX (iframe-friendly, CORS permisivo).',
  robots: {
    index: false,
    follow: false,
  },
};

export default function EmbedRootLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-dmx-embed="root"
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        background: 'transparent',
        fontFamily: 'var(--font-body, "DM Sans", system-ui, sans-serif)',
        color: 'var(--color-text-primary, #0f172a)',
      }}
    >
      {children}
    </div>
  );
}
