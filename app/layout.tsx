import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TrpcProvider } from '@/shared/lib/trpc/provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'DesarrollosMX',
  description:
    'Plataforma AI-native de inteligencia inmobiliaria para LATAM: captación, scoring de zonas, operaciones y marketplace.',
};

const FONT_LINKS = [
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&display=swap',
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {FONT_LINKS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
