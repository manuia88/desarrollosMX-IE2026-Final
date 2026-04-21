import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { AlphaZonesClient } from '@/features/trend-genome/components/AlphaZonesClient';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'TrendGenome' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/alpha`] as const),
  ) as Record<string, string>;

  return {
    title: t('page.title'),
    description: t('page.meta_description'),
    alternates: {
      canonical: `/${locale}/indices/alpha`,
      languages,
    },
    openGraph: {
      title: t('page.title'),
      description: t('page.meta_description'),
      type: 'website',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('page.title'),
      description: t('page.meta_description'),
    },
    robots: { index: true, follow: true },
  };
}

export default async function IndicesAlphaPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'TrendGenome' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: t('page.title'),
    description: t('page.meta_description'),
    inLanguage: locale,
    creator: {
      '@type': 'Organization',
      name: 'DesarrollosMX',
      url: `/${locale}`,
    },
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD SEO
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label={t('breadcrumb')}
        className="text-xs text-[color:var(--color-text-secondary)]"
      >
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:underline">
              DesarrollosMX
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${locale}/indices`} className="hover:underline">
              {t('breadcrumb')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('page.title')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-[color:var(--color-text-primary)]">
          {t('hero.title')}
        </h1>
        <p className="text-base text-[color:var(--color-text-secondary)]">{t('hero.subtitle')}</p>
      </header>

      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center text-[color:var(--color-text-secondary)]"
          >
            {t('page.loading')}
          </div>
        }
      >
        <AlphaZonesClient locale={locale} />
      </Suspense>

      <nav
        aria-label={t('breadcrumb')}
        className="flex flex-wrap gap-3 border-t border-[color:var(--color-border-subtle)] pt-6 text-sm"
      >
        <Link
          href={`/${locale}/indices`}
          className="text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:underline"
        >
          /indices
        </Link>
        <Link
          href={`/${locale}/indices/flujos`}
          className="text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:underline"
        >
          /indices/flujos
        </Link>
        <Link
          href={`/${locale}/indices/movers`}
          className="text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:underline"
        >
          /indices/movers
        </Link>
        <Link
          href={`/${locale}/indices/pro`}
          className="text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:underline"
        >
          /indices/pro
        </Link>
      </nav>
    </main>
  );
}
