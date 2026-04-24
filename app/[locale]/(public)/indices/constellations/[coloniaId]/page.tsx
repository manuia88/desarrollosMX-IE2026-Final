// BLOQUE 11.R.3.2 — Constellation graph focalizado por colonia.
// Renderiza SVG force-directed + sliders + path finder widget.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ConstellationFocusClient } from '@/features/constellations/components/ConstellationFocusClient';
import { locales } from '@/shared/lib/i18n/config';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  params: Promise<{ locale: string; coloniaId: string }>;
}

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, coloniaId } = await params;
  const t = await getTranslations({ locale, namespace: 'Constellations.focus' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/constellations/${coloniaId}`] as const),
  ) as Record<string, string>;
  return {
    title: t('title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/indices/constellations/${coloniaId}`,
      languages,
    },
  };
}

export default async function ConstellationFocusPage({ params }: PageProps) {
  const { locale, coloniaId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Constellations' });

  if (!UUID_REGEX.test(coloniaId)) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-[color:var(--color-danger)]">{t('focus.invalid_id')}</p>
      </main>
    );
  }

  const supabase = createAdminClient();
  const sourceLabel = await resolveZoneLabel({
    scopeType: 'colonia',
    scopeId: coloniaId,
    countryCode: 'MX',
    supabase,
  }).catch(() => null);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-[color:var(--color-text-secondary)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}/indices/constellations`} className="hover:underline">
              {t('landing.title')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {sourceLabel ?? t('focus.unlabeled_zone')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">
          {t('focus.title_prefix')}: {sourceLabel ?? t('focus.unlabeled_zone')}
        </h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('focus.intro')}</p>
      </header>

      <ConstellationFocusClient coloniaId={coloniaId} sourceLabel={sourceLabel} />
    </main>
  );
}
