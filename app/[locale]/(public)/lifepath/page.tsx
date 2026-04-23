// BLOQUE 11.O.2.1 — LifePath landing.
// "Stitch Fix de real estate": cuestionario 15 preguntas → top colonias
// con afinidad personalizada.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LifePath.page' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/lifepath`] as const),
  ) as Record<string, string>;

  return {
    title: t('title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/lifepath`,
      languages,
    },
    openGraph: {
      title: t('title'),
      description: t('meta_description'),
      type: 'website',
      locale,
    },
  };
}

export default async function LifePathLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'LifePath' });

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-[color:var(--color-text-secondary)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:underline">
              DesarrollosMX
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('page.title')}
          </li>
        </ol>
      </nav>

      <header className="space-y-3">
        <h1 className="text-3xl font-bold">{t('page.title')}</h1>
        <p className="text-lg text-[color:var(--color-text-secondary)]">{t('page.intro')}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-[color:var(--color-border)] p-4">
          <h2 className="mb-2 font-semibold">{t('page.how_it_works_title')}</h2>
          <p className="text-sm text-[color:var(--color-text-secondary)]">
            {t('page.how_it_works_body')}
          </p>
        </article>
        <article className="rounded-lg border border-[color:var(--color-border)] p-4">
          <h2 className="mb-2 font-semibold">{t('page.why_different_title')}</h2>
          <p className="text-sm text-[color:var(--color-text-secondary)]">
            {t('page.why_different_body')}
          </p>
        </article>
      </section>

      <div className="flex justify-center">
        <Link
          href={`/${locale}/lifepath/quiz`}
          className="rounded-md bg-[color:var(--color-accent)] px-6 py-3 font-semibold text-[color:var(--color-on-accent)] hover:opacity-90"
        >
          {t('page.cta_start')}
        </Link>
      </div>
    </main>
  );
}
