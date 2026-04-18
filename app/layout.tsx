import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { AxeBoot } from '@/shared/lib/a11y/axe-boot';
import { defaultLocale, isLocale } from '@/shared/lib/i18n/config';
import { TrpcProvider } from '@/shared/lib/trpc/provider';
import { GlobalOverlays } from '@/shared/ui/layout/shell-client';
import { ThemeProvider } from '@/shared/ui/layout/theme-provider';
import { Toaster } from '@/shared/ui/primitives/toast';
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

async function detectLang(): Promise<string> {
  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') ?? hdrs.get('x-invoke-path') ?? '';
  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  return isLocale(segment) ? segment : defaultLocale;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await detectLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {FONT_LINKS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>
        <ThemeProvider>
          <TrpcProvider>
            {children}
            <GlobalOverlays />
            <Toaster />
            <AxeBoot />
          </TrpcProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
