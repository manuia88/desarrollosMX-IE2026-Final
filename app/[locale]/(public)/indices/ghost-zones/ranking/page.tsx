// BLOQUE 11.Q.3.2 — Ghost Zones ranking Pro+ (auth-gated via tRPC).
// Página lista /ghost-zones/ranking — oculta de robots, gating schema-native
// por authenticatedProcedure. Compradores free ven fallback CTA.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { GhostZoneRankingList } from '@/features/ghost-zones/components/GhostZoneRankingList';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'GhostZones.ranking' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/ghost-zones/ranking`] as const),
  ) as Record<string, string>;

  return {
    title: t('title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/indices/ghost-zones/ranking`,
      languages,
    },
    robots: { index: false, follow: false },
  };
}

export default async function GhostZonesRankingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'GhostZones' });

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-[color:var(--color-text-secondary)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}/indices/ghost-zones`} className="hover:underline">
              {t('landing.title')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('ranking.title')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t('ranking.title')}</h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('ranking.intro')}</p>
      </header>

      <GhostZoneRankingList locale={locale} />
    </main>
  );
}
