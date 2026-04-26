import type { Metadata } from 'next';
import { type ReactNode, Suspense } from 'react';
import { AxeBoot } from '@/shared/lib/a11y/axe-boot';
import { defaultLocale } from '@/shared/lib/i18n/config';
import { TrpcProvider } from '@/shared/lib/trpc/provider';
import { GlobalOverlays } from '@/shared/ui/layout/shell-client';
import { ThemeProvider } from '@/shared/ui/layout/theme-provider';
import { Toaster } from '@/shared/ui/primitives/toast';
import { dmSans, outfit } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'DesarrollosMX',
  description:
    'Plataforma AI-native de inteligencia inmobiliaria para LATAM: captación, scoring de zonas, operaciones y marketplace.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang={defaultLocale}
      className={`${outfit.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <Suspense>
            <TrpcProvider>
              {children}
              <GlobalOverlays />
              <Toaster />
              <AxeBoot />
            </TrpcProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
