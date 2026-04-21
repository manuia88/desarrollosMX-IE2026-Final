import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { MoversClient } from '@/features/indices-publicos/components/MoversClient';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'IndicesPublic.movers' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/movers`] as const),
  ) as Record<string, string>;

  return {
    title: t('title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/indices/movers`,
      languages,
    },
    openGraph: {
      title: t('title'),
      description: t('meta_description'),
      type: 'website',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('meta_description'),
    },
    robots: { index: true, follow: true },
  };
}

export default async function IndicesMoversPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'IndicesPublic' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: t('movers.title'),
    description: t('movers.meta_description'),
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
      <nav aria-label="Breadcrumb" className="text-xs text-[color:var(--color-text-secondary)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:underline">
              DesarrollosMX
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${locale}/indices`} className="hover:underline">
              {t('page.title')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('movers.title')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-[color:var(--color-text-primary)]">
          {t('movers.title')}
        </h1>
        <p className="text-base text-[color:var(--color-text-secondary)]">{t('movers.subtitle')}</p>
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
        <MoversClient />
      </Suspense>
    </main>
  );
}
