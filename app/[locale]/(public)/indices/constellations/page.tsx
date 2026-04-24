// BLOQUE 11.R.3.1 — Constellations landing pública.
// "LinkedIn Network de zonas" — explicación + input coloniaId + contagion paths.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContagionPathsList } from '@/features/constellations/components/ContagionPathsList';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Constellations.landing' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/constellations`] as const),
  ) as Record<string, string>;

  return {
    title: t('title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/indices/constellations`,
      languages,
    },
  };
}

export default async function ConstellationsLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Constellations.landing' });

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
          {t('kicker')}
        </p>
        <h1 className="text-3xl font-bold md:text-4xl">{t('title')}</h1>
        <p className="text-base text-[color:var(--color-text-secondary)] md:text-lg">
          {t('subtitle')}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-[color:var(--color-border)] p-4">
          <h2 className="text-sm font-semibold">{t('edge_migration_title')}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
            {t('edge_migration_body')}
          </p>
        </article>
        <article className="rounded-lg border border-[color:var(--color-border)] p-4">
          <h2 className="text-sm font-semibold">{t('edge_climate_title')}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
            {t('edge_climate_body')}
          </p>
        </article>
        <article className="rounded-lg border border-[color:var(--color-border)] p-4">
          <h2 className="text-sm font-semibold">{t('edge_genoma_title')}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
            {t('edge_genoma_body')}
          </p>
        </article>
        <article className="rounded-lg border border-[color:var(--color-border)] p-4">
          <h2 className="text-sm font-semibold">{t('edge_pulse_title')}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
            {t('edge_pulse_body')}
          </p>
        </article>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('contagion_title')}</h2>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('contagion_body')}</p>
        <ContagionPathsList />
      </section>

      <section className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] p-6">
        <h2 className="text-lg font-semibold">{t('explore_title')}</h2>
        <p className="mt-2 text-sm text-[color:var(--color-text-secondary)]">{t('explore_body')}</p>
        <div className="mt-4">
          <Link
            href={`/${locale}/metodologia`}
            className="inline-flex rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm"
          >
            {t('methodology_cta')}
          </Link>
        </div>
      </section>
    </main>
  );
}
