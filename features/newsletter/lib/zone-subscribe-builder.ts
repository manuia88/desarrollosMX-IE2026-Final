// features/newsletter/lib/zone-subscribe-builder.ts
//
// BLOQUE 11.J.3 — Newsletter personalizado por colonia(s).
// Construye el bundle mensual enfocado en N zonas preferidas del subscriber:
//   - Hero top 5 por dmx_indices rankings restringido a las zonas
//   - Pulse de la zona principal
//   - Migration inflows/outflows para la zona principal
//   - Streaks del país (no personalizable — es ranking global)
//   - Causal paragraphs placeholder (delegado al monthly-builder de A si existe)
//
// Graceful degradation: si zoneScopeIds viene vacío, produce un bundle
// "national" con los top 5 globales. Esto permite mostrar algo aunque el
// subscriber no haya configurado zonas.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  HeroTopEntry,
  NewsletterCta,
  NewsletterLocale,
  NewsletterMonthlyBundle,
} from '@/features/newsletter/types';
import { resolveZoneLabelSync, type ZoneScopeType } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import { buildMigrationSection } from './migration-section-builder';
import { buildStreaksSection } from './streaks-section-builder';

const DEFAULT_SITE_URL = 'https://desarrollosmx.com';

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  return DEFAULT_SITE_URL;
}

export interface BuildZonePersonalizedBundleInput {
  readonly subscriberId: string;
  readonly zoneScopeIds: ReadonlyArray<string>;
  readonly countryCode: string;
  readonly periodDate: string;
  readonly locale: NewsletterLocale;
  readonly supabase?: SupabaseClient<Database>;
}

interface IndexRankingRow {
  readonly scope_id: string;
  readonly scope_type: string;
  readonly value: number;
  readonly trend_vs_previous: number | null;
  readonly ranking_in_scope: number | null;
}

const HERO_INDEX_CODE = 'DMX-PULSE';
const HERO_TOP_LIMIT = 5;

async function fetchHeroRanking(
  client: SupabaseClient<Record<string, unknown>>,
  countryCode: string,
  periodDate: string,
  zoneScopeIds: ReadonlyArray<string>,
): Promise<ReadonlyArray<HeroTopEntry>> {
  let query = client
    .from('dmx_indices' as never)
    .select('scope_id, scope_type, value, trend_vs_previous, ranking_in_scope')
    .eq('country_code', countryCode)
    .eq('index_code', HERO_INDEX_CODE)
    .eq('period_date', periodDate)
    .eq('is_shadow', false)
    .order('ranking_in_scope', { ascending: true, nullsFirst: false })
    .limit(HERO_TOP_LIMIT);

  if (zoneScopeIds.length > 0) {
    query = query.in('scope_id', zoneScopeIds);
  }

  const { data, error } = await query;
  if (error) return [];

  const rows = (data as ReadonlyArray<IndexRankingRow> | null) ?? [];
  return rows.map((row, idx) => ({
    rank: row.ranking_in_scope ?? idx + 1,
    scope_type: row.scope_type,
    scope_id: row.scope_id,
    zone_label: resolveZoneLabelSync({
      scopeType: row.scope_type as ZoneScopeType,
      scopeId: row.scope_id,
    }),
    value: row.value,
    delta_pct: row.trend_vs_previous,
  }));
}

interface PulseRow {
  readonly scope_id: string;
  readonly scope_type: string;
  readonly pulse_score: number | null;
  readonly period_date: string;
}

async function fetchPulseSection(
  client: SupabaseClient<Record<string, unknown>>,
  countryCode: string,
  periodDate: string,
  zoneScopeId: string,
  locale: NewsletterLocale,
): Promise<NewsletterMonthlyBundle['pulse_section']> {
  const { data, error } = await client
    .from('zone_pulse_scores' as never)
    .select('scope_id, scope_type, pulse_score, period_date')
    .eq('country_code', countryCode)
    .eq('scope_id', zoneScopeId)
    .lte('period_date', periodDate)
    .order('period_date', { ascending: false })
    .limit(5);
  if (error) return null;

  const rows = (data as ReadonlyArray<PulseRow> | null) ?? [];
  const latest = rows[0];
  if (!latest) return null;

  const currentPulse = typeof latest.pulse_score === 'number' ? latest.pulse_score : 0;
  const fourWeeksAgo = rows[1];
  const delta4w =
    fourWeeksAgo && typeof fourWeeksAgo.pulse_score === 'number'
      ? currentPulse - fourWeeksAgo.pulse_score
      : null;

  const base = resolveSiteUrl().replace(/\/$/, '');
  return {
    scope_id: zoneScopeId,
    zone_label: resolveZoneLabelSync({
      scopeType: latest.scope_type as ZoneScopeType,
      scopeId: zoneScopeId,
    }),
    current_pulse: currentPulse,
    delta_4w: delta4w,
    sparkline_svg: '',
    detail_url: `${base}/${locale}/indices/pulse?zona=${zoneScopeId}`,
  };
}

function buildCta(locale: NewsletterLocale): NewsletterCta {
  const base = resolveSiteUrl().replace(/\/$/, '');
  return {
    label: 'Ver el panorama completo',
    url: `${base}/${locale}/indices`,
  };
}

export async function buildZonePersonalizedBundle(
  input: BuildZonePersonalizedBundleInput,
): Promise<NewsletterMonthlyBundle> {
  const { zoneScopeIds, countryCode, periodDate, locale } = input;
  const typedClient = input.supabase ?? createAdminClient();
  const client = typedClient as unknown as SupabaseClient<Record<string, unknown>>;

  const heroTopFive = await fetchHeroRanking(client, countryCode, periodDate, zoneScopeIds);

  const primaryScopeId = zoneScopeIds[0] ?? null;

  const pulseSection =
    primaryScopeId === null
      ? null
      : await fetchPulseSection(client, countryCode, periodDate, primaryScopeId, locale);

  const migrationSection =
    primaryScopeId === null
      ? null
      : await buildMigrationSection({
          scopeId: primaryScopeId,
          scopeType: 'colonia',
          countryCode,
          periodDate,
          locale,
          supabase: client,
        });

  const streaksSection = await buildStreaksSection({
    countryCode,
    periodDate,
    locale,
    supabase: typedClient,
  });

  return {
    period_date: periodDate,
    country_code: countryCode,
    locale,
    hero_top_five: heroTopFive,
    causal_paragraphs: [],
    pulse_section: pulseSection,
    migration_section: migrationSection,
    streaks_section: streaksSection,
    cta: buildCta(locale),
  };
}
