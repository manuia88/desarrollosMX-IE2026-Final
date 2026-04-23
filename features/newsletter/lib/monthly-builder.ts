// FASE 11.J — Monthly newsletter bundle builder.
//
// Construye el bundle de datos (no HTML — eso va al template) para el envío
// mensual día 5 09:00 CDMX. Queries cross-function (11.E causal, 11.F pulse,
// 11.G migration, 11.I scorecard) usando admin supabase client directo — NO
// via tRPC (cron no tiene sesión de usuario).
//
// Respeta preferences del subscriber: cada sección se omite si
// preferences.sections.{pulse,migration,causal,streaks} === false.
// zone_scope_ids filtra secciones a zonas específicas.

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveZoneLabel, resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import type {
  HeroTopEntry,
  MigrationFlowEntry,
  MigrationSectionBundle,
  NewsletterCta,
  NewsletterLocale,
  NewsletterMonthlyBundle,
  NewsletterPreferences,
  PulseSectionBundle,
  StreaksSectionBundle,
} from '../types';
import { buildFuturesSection } from './futures-section-builder';

type Supabase = SupabaseClient<Database>;

const HERO_TOP_N = 5;
const DEFAULT_SECTIONS: NewsletterPreferences['sections'] = {
  pulse: true,
  migration: true,
  causal: true,
  alpha: false,
  scorecard: true,
  streaks: true,
  futures: true,
};

export interface BuildMonthlyBundleOpts {
  readonly countryCode: string;
  readonly periodDate: string; // YYYY-MM-DD
  readonly locale: NewsletterLocale;
  readonly subscriberPreferences?: NewsletterPreferences;
  readonly supabase?: Supabase;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.desarrollosmx.com';
}

interface DmxIndicesRow {
  readonly index_code: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly value: number;
  readonly trend_vs_previous: number | null;
  readonly ranking_in_scope: number | null;
}

async function queryHeroTopFive(
  supabase: Supabase,
  countryCode: string,
  periodDate: string,
): Promise<readonly HeroTopEntry[]> {
  const { data, error } = await supabase
    .from('dmx_indices')
    .select('index_code,scope_type,scope_id,value,trend_vs_previous,ranking_in_scope')
    .eq('country_code', countryCode)
    .eq('period_date', periodDate)
    .eq('is_shadow', false)
    .eq('index_code', 'IPV')
    .eq('scope_type', 'colonia')
    .order('value', { ascending: false })
    .limit(HERO_TOP_N);

  if (error || !data) return [];
  const rows = data as ReadonlyArray<DmxIndicesRow>;

  return await Promise.all(
    rows.map(async (row, idx) => {
      const zoneLabel = await resolveZoneLabel({
        scopeType: row.scope_type,
        scopeId: row.scope_id,
        countryCode,
        supabase,
      });
      return {
        rank: idx + 1,
        scope_type: row.scope_type,
        scope_id: row.scope_id,
        zone_label: zoneLabel,
        value: row.value,
        delta_pct: row.trend_vs_previous ?? null,
      } satisfies HeroTopEntry;
    }),
  );
}

interface CausalExplanationRow {
  readonly explanation_md: string;
}

async function queryCausalParagraphs(
  supabase: Supabase,
  periodDate: string,
  hero: readonly HeroTopEntry[],
): Promise<readonly string[]> {
  if (hero.length === 0) return [];
  const scopeIds = hero.slice(0, 2).map((h) => h.scope_id);
  const { data, error } = await supabase
    .from('causal_explanations')
    .select('explanation_md')
    .eq('period_date', periodDate)
    .in('scope_id', scopeIds)
    .limit(2);
  if (error || !data) return [];
  const rows = data as ReadonlyArray<CausalExplanationRow>;
  return rows.map((r) => r.explanation_md).filter((s) => typeof s === 'string' && s.length > 0);
}

interface PulseScoreRow {
  readonly scope_type: string;
  readonly scope_id: string;
  readonly pulse_score: number | null;
  readonly period_date: string;
}

async function queryPulseSection(
  supabase: Supabase,
  countryCode: string,
  periodDate: string,
  zoneScopeIds: readonly string[],
): Promise<PulseSectionBundle | null> {
  let query = supabase
    .from('zone_pulse_scores')
    .select('scope_type,scope_id,pulse_score,period_date')
    .eq('country_code', countryCode)
    .eq('period_date', periodDate);

  if (zoneScopeIds.length > 0) {
    query = query.in('scope_id', zoneScopeIds);
  }

  const { data, error } = await query.order('pulse_score', { ascending: false }).limit(1);
  if (error || !data || data.length === 0) return null;
  const row = (data as ReadonlyArray<PulseScoreRow>)[0];
  if (!row || typeof row.pulse_score !== 'number') return null;

  const zoneLabel = resolveZoneLabelSync({
    scopeType: row.scope_type,
    scopeId: row.scope_id,
  });

  return {
    scope_id: row.scope_id,
    zone_label: zoneLabel,
    current_pulse: row.pulse_score,
    delta_4w: null, // H1: computed by Pulse feature — placeholder null (L-NN-PULSE-DELTA)
    sparkline_svg: '',
    detail_url: `${siteUrl()}/${localeForPath('es-MX')}/pulse/${encodeURIComponent(row.scope_id)}`,
  };
}

interface MigrationFlowRow {
  readonly origin_scope_type: string;
  readonly origin_scope_id: string;
  readonly dest_scope_type: string;
  readonly dest_scope_id: string;
  readonly volume: number;
}

async function queryMigrationSection(
  supabase: Supabase,
  countryCode: string,
  periodDate: string,
  zoneScopeIds: readonly string[],
): Promise<MigrationSectionBundle | null> {
  // Pickamos una zona focal: primera de preferences.zone_scope_ids o la #1 del hero.
  const focalScopeId = zoneScopeIds[0];
  if (!focalScopeId) return null;

  const { data: originsData, error: originsErr } = await supabase
    .from('zone_migration_flows')
    .select('origin_scope_type,origin_scope_id,dest_scope_type,dest_scope_id,volume')
    .eq('country_code', countryCode)
    .eq('period_date', periodDate)
    .eq('dest_scope_id', focalScopeId)
    .order('volume', { ascending: false })
    .limit(3);

  const { data: destsData, error: destsErr } = await supabase
    .from('zone_migration_flows')
    .select('origin_scope_type,origin_scope_id,dest_scope_type,dest_scope_id,volume')
    .eq('country_code', countryCode)
    .eq('period_date', periodDate)
    .eq('origin_scope_id', focalScopeId)
    .order('volume', { ascending: false })
    .limit(3);

  if (originsErr || destsErr) return null;

  const originsRaw = (originsData ?? []) as ReadonlyArray<MigrationFlowRow>;
  const destsRaw = (destsData ?? []) as ReadonlyArray<MigrationFlowRow>;

  const totalOrigins = originsRaw.reduce((acc, r) => acc + r.volume, 0);
  const totalDests = destsRaw.reduce((acc, r) => acc + r.volume, 0);

  const topOrigins: MigrationFlowEntry[] = originsRaw.map((r) => ({
    scope_id: r.origin_scope_id,
    zone_label: resolveZoneLabelSync({
      scopeType: r.origin_scope_type,
      scopeId: r.origin_scope_id,
    }),
    volume: r.volume,
    share_pct: totalOrigins > 0 ? (r.volume / totalOrigins) * 100 : 0,
  }));
  const topDests: MigrationFlowEntry[] = destsRaw.map((r) => ({
    scope_id: r.dest_scope_id,
    zone_label: resolveZoneLabelSync({ scopeType: r.dest_scope_type, scopeId: r.dest_scope_id }),
    volume: r.volume,
    share_pct: totalDests > 0 ? (r.volume / totalDests) * 100 : 0,
  }));

  if (topOrigins.length === 0 && topDests.length === 0) return null;

  const zoneLabel = resolveZoneLabelSync({
    scopeType: 'colonia',
    scopeId: focalScopeId,
  });

  return {
    scope_id: focalScopeId,
    zone_label: zoneLabel,
    top_origins: topOrigins,
    top_destinations: topDests,
    detail_url: `${siteUrl()}/es-MX/indices/migration-flow/${encodeURIComponent(focalScopeId)}`,
  };
}

function localeForPath(locale: NewsletterLocale): string {
  return locale;
}

function buildCta(locale: NewsletterLocale): NewsletterCta {
  return {
    label: 'Ver los 15 índices',
    url: `${siteUrl()}/${localeForPath(locale)}/indices`,
  };
}

function buildStreaksSection(periodDate: string, locale: NewsletterLocale): StreaksSectionBundle {
  // H1: streaks viene de sub-agent B (lib/streaks-*). Dejamos section vacía
  // cuando no hay datos disponibles todavía — el orchestrator puede omitir
  // el render si top_streaks.length === 0.
  return {
    period_date: periodDate,
    top_streaks: [],
    detail_url: `${siteUrl()}/${localeForPath(locale)}/indices/streaks`,
  };
}

export async function buildMonthlyBundle(
  opts: BuildMonthlyBundleOpts,
): Promise<NewsletterMonthlyBundle> {
  const supabase = opts.supabase ?? createAdminClient();
  const sections = opts.subscriberPreferences?.sections ?? DEFAULT_SECTIONS;
  const zoneScopeIds = opts.subscriberPreferences?.zone_scope_ids ?? [];

  const heroTopFive = await queryHeroTopFive(supabase, opts.countryCode, opts.periodDate);

  const causalParagraphs = sections.causal
    ? await queryCausalParagraphs(supabase, opts.periodDate, heroTopFive)
    : [];

  const focalIds =
    zoneScopeIds.length > 0 ? zoneScopeIds : heroTopFive.slice(0, 1).map((h) => h.scope_id);

  const pulseSection = sections.pulse
    ? await queryPulseSection(supabase, opts.countryCode, opts.periodDate, focalIds)
    : null;

  const migrationSection = sections.migration
    ? await queryMigrationSection(supabase, opts.countryCode, opts.periodDate, focalIds)
    : null;

  const streaksSection = sections.streaks
    ? buildStreaksSection(opts.periodDate, opts.locale)
    : null;

  const futuresSection =
    sections.futures !== false && focalIds[0]
      ? await buildFuturesSection({
          scopeId: focalIds[0],
          countryCode: opts.countryCode,
          locale: opts.locale,
          supabase,
        }).catch(() => null)
      : null;

  return {
    period_date: opts.periodDate,
    country_code: opts.countryCode,
    locale: opts.locale,
    hero_top_five: heroTopFive,
    causal_paragraphs: causalParagraphs,
    pulse_section: pulseSection,
    migration_section: migrationSection,
    streaks_section: streaksSection,
    futures_section: futuresSection,
    cta: buildCta(opts.locale),
  };
}
