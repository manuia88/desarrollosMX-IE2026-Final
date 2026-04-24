// BLOQUE 11.Q.3.1 — Ghost Zones landing pública (marketing, sin data).
// "Rotten Tomatoes del real estate" — CTA para acceso Pro+.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'GhostZones.landing' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/ghost-zones`] as const),
  ) as Record<string, string>;

  return {
    title: t('title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/indices/ghost-zones`,
      languages,
    },
  };
}

export default async function GhostZonesLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'GhostZones.landing' });

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
          {t('kicker')}
        </p>
        <h1 className="text-3xl font-bold md:text-4xl">{t('title')}</h1>
        <p className="text-base text-[color:var(--color-text-secondary)] md:text-lg">
          {t('subtitle')}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-[color:var(--color-border)] p-4">
          <h2 className="text-sm font-semibold">{t('feature_1_title')}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
            {t('feature_1_body')}
          </p>
        </article>
        <article className="rounded-lg border border-[color:var(--color-border)] p-4">
          <h2 className="text-sm font-semibold">{t('feature_2_title')}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
            {t('feature_2_body')}
          </p>
        </article>
        <article className="rounded-lg border border-[color:var(--color-border)] p-4">
          <h2 className="text-sm font-semibold">{t('feature_3_title')}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
            {t('feature_3_body')}
          </p>
        </article>
      </section>

      <section className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] p-6">
        <h2 className="text-lg font-semibold">{t('cta_title')}</h2>
        <p className="mt-2 text-sm text-[color:var(--color-text-secondary)]">{t('cta_body')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/indices/ghost-zones/ranking`}
            className="inline-flex items-center rounded-md bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-[color:var(--color-on-accent)]"
          >
            {t('cta_primary')}
          </Link>
          <Link
            href={`/${locale}/metodologia`}
            className="inline-flex items-center rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm"
          >
            {t('cta_secondary')}
          </Link>
        </div>
      </section>
    </main>
  );
}
