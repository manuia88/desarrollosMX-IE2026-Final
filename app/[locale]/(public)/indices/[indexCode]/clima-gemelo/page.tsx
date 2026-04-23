// BLOQUE 11.P.3.1 — /indices/[indexCode]/clima-gemelo?scope_id=<uuid>.
// "Zillow del clima histórico" — twins climáticos 15y + chart comparativo.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ClimateChartPoint } from '@/features/climate-twin/components/ClimateComparisonChart';
import { ClimateTwinPanel } from '@/features/climate-twin/components/ClimateTwinPanel';
import {
  CLIMATE_METHODOLOGY,
  type ClimateTwinResult,
  DEFAULT_HISTORY_MONTHS,
} from '@/features/climate-twin/types';
import { INDEX_CODES, isIndexCode } from '@/features/indices-publicos/lib/index-registry-helpers';
import { defaultLocale, locales } from '@/shared/lib/i18n/config';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  params: Promise<{ locale: string; indexCode: string }>;
  searchParams: Promise<{ scope_id?: string }>;
}

export function generateStaticParams() {
  return INDEX_CODES.map((indexCode) => ({ locale: defaultLocale, indexCode }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, indexCode } = await params;
  if (!isIndexCode(indexCode)) return { title: 'DesarrollosMX' };
  const t = await getTranslations({ locale, namespace: 'ClimateTwin.page' });

  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/${indexCode}/clima-gemelo`] as const),
  ) as Record<string, string>;

  return {
    title: t('title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/indices/${indexCode}/clima-gemelo`,
      languages,
    },
  };
}

export default async function ClimateTwinPage({ params, searchParams }: PageProps) {
  const { locale, indexCode } = await params;
  if (!isIndexCode(indexCode)) notFound();
  const { scope_id: scopeId } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'ClimateTwin' });

  const supabase = createAdminClient();

  if (!scopeId) {
    // Empty state: listar top 10 zonas con cobertura climática ingestada.
    const { data: pickZonesRaw } = await supabase
      .from('climate_monthly_aggregates')
      .select('zone_id')
      .limit(500);
    const uniqueZoneIds = Array.from(
      new Set(
        (pickZonesRaw ?? [])
          .map((r) => r.zone_id)
          .filter((x): x is string => typeof x === 'string'),
      ),
    ).slice(0, 10);
    const pickZoneLabels = await Promise.all(
      uniqueZoneIds.map((zid) =>
        resolveZoneLabel({
          scopeType: 'colonia',
          scopeId: zid,
          countryCode: 'MX',
          supabase,
        })
          .catch(() => null)
          .then((label) => ({ zone_id: zid, label })),
      ),
    );

    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">{t('page.title')}</h1>
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('page.intro')}</p>
        </header>
        {uniqueZoneIds.length === 0 ? (
          <p className="rounded-lg border border-[color:var(--color-border)] p-4 text-sm text-[color:var(--color-text-secondary)]">
            {t('page.empty_state')}
          </p>
        ) : (
          <section className="space-y-3">
            <p className="text-sm text-[color:var(--color-text-secondary)]">
              {t('page.empty_state_pick_zone')}
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {pickZoneLabels.map((z) => (
                <li key={z.zone_id}>
                  <Link
                    href={`/${locale}/indices/${indexCode}/clima-gemelo?scope_id=${z.zone_id}`}
                    className="block rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm hover:bg-[color:var(--color-accent-muted)]"
                  >
                    {z.label ?? t('page.unlabeled_zone')}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    );
  }

  const [monthlyRes, twinsRes, labelP] = await Promise.all([
    supabase
      .from('climate_monthly_aggregates')
      .select('year_month, temp_avg, rainfall_mm')
      .eq('zone_id', scopeId)
      .order('year_month', { ascending: true })
      .limit(DEFAULT_HISTORY_MONTHS),
    supabase
      .from('climate_twin_matches')
      .select('zone_id, twin_zone_id, similarity, shared_patterns')
      .eq('zone_id', scopeId)
      .order('similarity', { ascending: false })
      .limit(10),
    resolveZoneLabel({
      scopeType: 'colonia',
      scopeId,
      countryCode: 'MX',
      supabase,
    }).catch(() => null),
  ]);

  const history: ClimateChartPoint[] = (monthlyRes.data ?? []).map((r) => ({
    year_month: r.year_month,
    temp_avg: r.temp_avg,
    rainfall_mm: r.rainfall_mm,
  }));

  const twinZoneIds = (twinsRes.data ?? [])
    .map((r) => r.twin_zone_id)
    .filter((x): x is string => typeof x === 'string');

  const twinLabels = await Promise.all(
    twinZoneIds.map((zid) =>
      resolveZoneLabel({
        scopeType: 'colonia',
        scopeId: zid,
        countryCode: 'MX',
        supabase,
      }).catch(() => null),
    ),
  );

  const twins: ClimateTwinResult[] = (twinsRes.data ?? []).map((r, idx) => ({
    zone_id: r.zone_id,
    twin_zone_id: r.twin_zone_id,
    twin_label: twinLabels[idx] ?? null,
    similarity: Number(r.similarity),
    shared_patterns:
      (r.shared_patterns as Record<string, number> | null) ?? ({} as Record<string, number>),
  }));

  const zoneLabel = await labelP;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-[color:var(--color-text-secondary)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}/indices`} className="hover:underline">
              {t('page.breadcrumb_indices')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${locale}/indices/${indexCode}`} className="hover:underline">
              {indexCode}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('page.title')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t('page.title')}</h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('page.intro')}</p>
      </header>

      <ClimateTwinPanel
        locale={locale}
        zoneLabel={zoneLabel}
        twins={twins}
        history={history}
        methodology={CLIMATE_METHODOLOGY}
      />
    </main>
  );
}
