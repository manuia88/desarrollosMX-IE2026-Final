// BLOQUE 11.O.3.1 — LifePath resultados page.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LifePathResultsList } from '@/features/lifepath/components/LifePathResultsList';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LifePath.results' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/lifepath/resultados`] as const),
  ) as Record<string, string>;

  return {
    title: t('title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/lifepath/resultados`,
      languages,
    },
    robots: { index: false, follow: false },
  };
}

export default async function LifePathResultsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'LifePath' });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-[color:var(--color-text-secondary)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}/lifepath`} className="hover:underline">
              {t('page.title')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('results.title')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t('results.title')}</h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('results.intro')}</p>
      </header>

      <LifePathResultsList locale={locale} />
    </main>
  );
}
