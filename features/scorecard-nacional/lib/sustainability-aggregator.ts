// BLOQUE 11.I.4 — Sustainability aggregator (IDS / IRE / GRN) nacional.
//
// Calcula promedios nacionales + top 10 rankings para los tres índices
// sostenibilidad y genera narrativa de 4 páginas vía Causal Engine (inyectable).
//
// Consumer responsibility: causalHook caller must NOT pass forceRegenerate=true
// (cost budget).

import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { ScorecardRankingEntry, SustainabilityNationalSection } from '../types';

export type SustainabilityCausalHook = (
  prompt: string,
) => Promise<{ text: string; citations: readonly string[] }>;

export interface AggregateSustainabilityOpts {
  readonly scopeType?: 'colonia' | 'alcaldia' | 'city' | 'estado';
  readonly causalHook?: SustainabilityCausalHook;
}

type SustainabilityCode = 'IDS' | 'IRE' | 'GRN';

interface IndexRow {
  readonly index_code: string;
  readonly scope_id: string;
  readonly scope_type: string;
  readonly value: number;
  readonly trend_vs_previous: number | null;
  readonly trend_direction: string | null;
  readonly ranking_in_scope: number | null;
}

const NARRATIVE_SKIPPED_ES = 'Narrative generation skipped (no causalHook provided).';

function coerceTrendDirection(raw: string | null): ScorecardRankingEntry['trend_direction'] {
  if (raw === 'mejorando' || raw === 'estable' || raw === 'empeorando') return raw;
  return null;
}

function coerceScopeType(raw: string): ScorecardRankingEntry['scope_type'] {
  if (raw === 'colonia' || raw === 'alcaldia' || raw === 'city' || raw === 'estado') {
    return raw;
  }
  return 'colonia';
}

function toRankingEntries(rows: readonly IndexRow[]): readonly ScorecardRankingEntry[] {
  return rows.map((row, i) => ({
    rank: i + 1,
    zone_id: row.scope_id,
    zone_label: row.scope_id,
    scope_type: coerceScopeType(row.scope_type),
    value: row.value,
    delta_vs_previous: row.trend_vs_previous,
    trend_direction: coerceTrendDirection(row.trend_direction),
  }));
}

function averageOrNull(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((acc, v) => acc + v, 0);
  return total / values.length;
}

function formatSustainabilityPrompt(params: {
  readonly countryCode: string;
  readonly periodDate: string;
  readonly idsAvg: number | null;
  readonly ireAvg: number | null;
  readonly grnAvg: number | null;
  readonly topIds: readonly ScorecardRankingEntry[];
  readonly topIre: readonly ScorecardRankingEntry[];
  readonly topGrn: readonly ScorecardRankingEntry[];
}): string {
  const fmt = (n: number | null) => (n === null ? 'n/d' : n.toFixed(2));
  const top3 = (entries: readonly ScorecardRankingEntry[]) =>
    entries
      .slice(0, 3)
      .map((e) => `${e.rank}. ${e.zone_label} (${e.value.toFixed(2)})`)
      .join(' | ');

  return [
    `Redacta la sección Sostenibilidad Nacional del Scorecard ${params.countryCode} ${params.periodDate} (~4 páginas markdown es-MX).`,
    '',
    'Contexto obligatorio:',
    `- IDS promedio nacional: ${fmt(params.idsAvg)}`,
    `- IRE promedio nacional: ${fmt(params.ireAvg)}`,
    `- GRN promedio nacional: ${fmt(params.grnAvg)} (IGV alias GRN H1)`,
    `- Top 3 IDS: ${top3(params.topIds)}`,
    `- Top 3 IRE: ${top3(params.topIre)}`,
    `- Top 3 GRN: ${top3(params.topGrn)}`,
    '',
    'Estructura: 1) panorámica nacional, 2) liderazgo IDS, 3) resiliencia IRE, 4) áreas verdes GRN, 5) cierre.',
    'Reglas: tono editorial, cero hype, cita score_ids DMX. IGV alias GRN H1 — FASE 12 split potencial.',
  ].join('\n');
}

async function fetchNationalAverage(
  supabase: ReturnType<typeof createAdminClient>,
  code: SustainabilityCode,
  countryCode: string,
  periodDate: string,
  scopeType: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('dmx_indices')
    .select('value')
    .eq('index_code', code)
    .eq('country_code', countryCode)
    .eq('period_date', periodDate)
    .eq('scope_type', scopeType);
  if (error) {
    console.warn('[sustainability-aggregator] avg query error', { code, error });
    return null;
  }
  const values = (data ?? [])
    .map((r) => (typeof r.value === 'number' ? r.value : null))
    .filter((v): v is number => v !== null);
  return averageOrNull(values);
}

async function fetchTopTen(
  supabase: ReturnType<typeof createAdminClient>,
  code: SustainabilityCode,
  countryCode: string,
  periodDate: string,
  scopeType: string,
): Promise<readonly ScorecardRankingEntry[]> {
  const { data, error } = await supabase
    .from('dmx_indices')
    .select(
      'index_code,scope_id,scope_type,value,trend_vs_previous,trend_direction,ranking_in_scope',
    )
    .eq('index_code', code)
    .eq('country_code', countryCode)
    .eq('period_date', periodDate)
    .eq('scope_type', scopeType)
    .order('value', { ascending: false })
    .limit(10);
  if (error) {
    console.warn('[sustainability-aggregator] top10 query error', { code, error });
    return [];
  }
  const rows = (data ?? []).map(
    (r): IndexRow => ({
      index_code: r.index_code,
      scope_id: r.scope_id,
      scope_type: r.scope_type,
      value: r.value,
      trend_vs_previous: r.trend_vs_previous,
      trend_direction: r.trend_direction,
      ranking_in_scope: r.ranking_in_scope,
    }),
  );
  return toRankingEntries(rows);
}

export async function aggregateSustainabilityNational(
  countryCode: string,
  periodDate: string,
  opts: AggregateSustainabilityOpts = {},
): Promise<SustainabilityNationalSection> {
  const scopeType = opts.scopeType ?? 'colonia';
  const supabase = createAdminClient();

  const [idsAvg, ireAvg, grnAvg, topIds, topIre, topGrn] = await Promise.all([
    fetchNationalAverage(supabase, 'IDS', countryCode, periodDate, scopeType),
    fetchNationalAverage(supabase, 'IRE', countryCode, periodDate, scopeType),
    fetchNationalAverage(supabase, 'GRN', countryCode, periodDate, scopeType),
    fetchTopTen(supabase, 'IDS', countryCode, periodDate, scopeType),
    fetchTopTen(supabase, 'IRE', countryCode, periodDate, scopeType),
    fetchTopTen(supabase, 'GRN', countryCode, periodDate, scopeType),
  ]);

  let narrativeMd: string = NARRATIVE_SKIPPED_ES;
  if (opts.causalHook) {
    const prompt = formatSustainabilityPrompt({
      countryCode,
      periodDate,
      idsAvg,
      ireAvg,
      grnAvg,
      topIds,
      topIre,
      topGrn,
    });
    try {
      const result = await opts.causalHook(prompt);
      narrativeMd = result.text;
    } catch (err) {
      console.warn('[sustainability-aggregator] causalHook error', { err });
      narrativeMd = NARRATIVE_SKIPPED_ES;
    }
  }

  // IGV alias GRN H1 — FASE 12 split potencial.
  return {
    country_code: countryCode,
    period_date: periodDate,
    ids_national: idsAvg,
    ire_national: ireAvg,
    grn_national: grnAvg,
    igv_national: grnAvg,
    ranking_ids: topIds,
    ranking_ire: topIre,
    ranking_grn: topGrn,
    narrative_md: narrativeMd,
  };
}

export { formatSustainabilityPrompt, NARRATIVE_SKIPPED_ES };
