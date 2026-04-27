import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { locales } from '@/shared/lib/i18n/config';
import { AmbientBackground } from '@/shared/ui/motion';

interface LayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

export default async function StudioLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Studio.nav' });

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: 'var(--canon-bg)',
        color: 'var(--canon-cream)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <AmbientBackground intensity="subtle" coverage="page" />

      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{
          borderColor: 'var(--canon-border)',
          background: 'rgba(6, 8, 15, 0.72)',
        }}
      >
        <nav
          aria-label={t('ariaLabel')}
          className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3"
        >
          <Link
            href={`/${locale}/studio`}
            className="font-[var(--font-display)] text-base font-extrabold tracking-tight"
            style={{
              backgroundImage: 'var(--canon-gradient)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {t('brand')}
          </Link>

          <div className="flex items-center gap-5 text-sm">
            <Link
              href="#pricing"
              className="hidden transition-colors hover:opacity-80 md:inline"
              style={{ color: 'var(--canon-cream-2)' }}
            >
              {t('pricing')}
            </Link>
            <Link
              href="#faq"
              className="hidden transition-colors hover:opacity-80 md:inline"
              style={{ color: 'var(--canon-cream-2)' }}
            >
              {t('faq')}
            </Link>
            <Link
              href="#waitlist"
              className="rounded-[var(--canon-radius-pill)] px-4 py-2 text-xs font-semibold transition-all hover:-translate-y-px"
              style={{
                background: 'var(--canon-gradient)',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
              }}
            >
              {t('waitlist')}
            </Link>
            <details className="relative">
              <summary
                aria-label={t('localeSwitch')}
                className="cursor-pointer list-none rounded-[var(--canon-radius-pill)] border px-3 py-1.5 text-xs uppercase tracking-wide"
                style={{
                  borderColor: 'var(--canon-border-2)',
                  color: 'var(--canon-cream-2)',
                }}
              >
                {locale}
              </summary>
              <ul
                className="absolute right-0 top-full mt-2 flex min-w-[120px] flex-col gap-1 p-2"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--canon-border-2)',
                  borderRadius: 'var(--canon-radius-inner)',
                  boxShadow: 'var(--shadow-canon-hover)',
                }}
              >
                {locales.map((loc) => (
                  <li key={loc}>
                    <Link
                      href={`/${loc}/studio`}
                      className="block rounded-[var(--canon-radius-chip)] px-3 py-1.5 text-xs uppercase tracking-wide transition-colors"
                      style={{
                        color: loc === locale ? 'var(--canon-cream)' : 'var(--canon-cream-2)',
                        background: loc === locale ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      }}
                    >
                      {loc}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}
