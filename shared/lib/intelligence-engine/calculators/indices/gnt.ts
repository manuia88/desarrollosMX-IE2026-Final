// DMX-GNT — Índice Gentrificación Tracker. Categoría zona, tier 3, country MX.
// Plan FASE 11 §DMX-GNT + Catálogo 03.8 §dmx-gnt.
//
// Fórmula:
//   GNT = MOM_12m·0.25 + influencer_heat·0.20 + denue_alpha_signals·0.20
//       + migration_inflow_high_income·0.15 + N09_delta_12m·0.10
//       + price_velocity_6m·0.10
//
// Componentes:
//   - MOM_12m: DMX-MOM rolling delta 12m (ratio vs snapshot 12 meses atrás).
//   - influencer_heat: score influencer_heat_zones (chef + gallery + creator).
//   - denue_alpha_signals: count DENUE new openings alpha (cafés especialidad,
//       galerías, fine dining) últimos 6m.
//   - migration_inflow_high_income: score zone_migration_flows origen decile ≥7.
//   - N09_delta_12m: delta ecosystem nocturno 12m.
//   - price_velocity_6m: (price_m2_6m_ago − price_m2_now) / price_m2_6m_ago × 100.
//
// Missing data:
//   - Tablas `influencer_heat_zones` y `zone_migration_flows` se crean en
//     BLOQUES 11.G/11.H. Si no existen → valor 0 + limitation array en _meta.
//   - MOM_12m o price_velocity_6m missing → confidence degrade pero no insufficient.
//   - Todos componentes zero → confidence='low' + limitations.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';
import {
  type AuditLogParams,
  buildConfidenceBreakdown,
  clamp100,
  detectCircuitBreaker,
  fetchPreviousSnapshot,
  type IndexComponentDetail,
  type IndicesMeta,
  tryInsertAuditLog,
} from './shared';

export const version = '1.0.0';

export const DEFAULT_GNT_WEIGHTS: Readonly<Record<string, number>> = {
  MOM_12m: 0.25,
  influencer_heat: 0.2,
  denue_alpha_signals: 0.2,
  migration_inflow_high_income: 0.15,
  N09_delta_12m: 0.1,
  price_velocity_6m: 0.1,
} as const;

export const CRITICAL_DEPS: readonly string[] = [] as const;

// Escalado: "alpha" openings (10 cafés especialidad en 6m = 100 signal).
export const DENUE_ALPHA_SCALE = 10;
// Scaling velocity: +20% en 6m → 100. clamp(pct × 5, 0, 100).
export const PRICE_VELOCITY_SCALE = 5;

export const methodology = {
  formula:
    'GNT = MOM_12m·0.25 + influencer_heat·0.20 + denue_alpha·0.20 + migration·0.15 + N09Δ·0.10 + priceVel6m·0.10.',
  sources: [
    'zone_scores:DMX-MOM (delta_12m)',
    'influencer_heat_zones',
    'denue_establishments (alpha categories)',
    'zone_migration_flows',
    'zone_scores:N09 (delta_12m)',
    'market_prices_secondary',
  ],
  dependencies: [
    { score_id: 'MOM_12m', weight: 0.25, role: 'momentum_rolling', critical: false },
    { score_id: 'influencer_heat', weight: 0.2, role: 'cultural_signal', critical: false },
    { score_id: 'denue_alpha_signals', weight: 0.2, role: 'commerce_alpha', critical: false },
    {
      score_id: 'migration_inflow_high_income',
      weight: 0.15,
      role: 'demographic_shift',
      critical: false,
    },
    { score_id: 'N09_delta_12m', weight: 0.1, role: 'ecosystem_delta', critical: false },
    { score_id: 'price_velocity_6m', weight: 0.1, role: 'price_velocity', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-GNT',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-gnt-gentrificacion-tracker',
    },
    {
      name: 'Plan FASE 11 §DMX-GNT',
      url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md#modulo-11b14-dmx-gnt',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_coverage_pct: 40, high_coverage_pct: 85 },
  circuit_breaker_pct: 20,
  sensitivity_analysis: [
    { dimension_id: 'MOM_12m', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'price_velocity_6m', impact_pct_per_10pct_change: 1.0 },
  ],
} as const;

export const reasoning_template =
  'GNT Gentrificación {zone_id}: {score_value}/100 (fase={fase}). Drivers MOM12m={MOM_12m}, priceVel={price_velocity_6m}%. Confianza {confidence}.';

export type GntPhase = 'dormant' | 'early' | 'active' | 'peaked' | 'post_gentrification';

export interface GntComponents extends Record<string, unknown> {
  readonly MOM_12m: IndexComponentDetail | null;
  readonly influencer_heat: IndexComponentDetail | null;
  readonly denue_alpha_signals: IndexComponentDetail | null;
  readonly migration_inflow_high_income: IndexComponentDetail | null;
  readonly N09_delta_12m: IndexComponentDetail | null;
  readonly price_velocity_6m: IndexComponentDetail | null;
  readonly fase: GntPhase;
  readonly coverage_pct: number;
  readonly limitations: readonly string[];
  readonly _meta: IndicesMeta;
}

export interface GntRawInput {
  readonly MOM_now: number | null;
  readonly MOM_12m_ago: number | null;
  readonly influencer_heat_raw: number | null;
  readonly denue_alpha_count_6m: number | null;
  readonly migration_high_income_score: number | null;
  readonly N09_now: number | null;
  readonly N09_12m_ago: number | null;
  readonly price_m2_now: number | null;
  readonly price_m2_6m_ago: number | null;
  readonly universe_period: string;
  readonly data_freshness_days?: number;
  readonly previous_value?: number | null;
  readonly shadow_mode?: boolean;
  readonly limitations_external?: readonly string[];
}

export interface GntComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: GntComponents;
  readonly trend_vs_previous: number | null;
}

function phaseFor(value: number): GntPhase {
  if (value >= 80) return 'post_gentrification';
  if (value >= 65) return 'peaked';
  if (value >= 45) return 'active';
  if (value >= 25) return 'early';
  return 'dormant';
}

function computeMomDelta(now: number | null, ago: number | null): number | null {
  if (now === null || ago === null || !Number.isFinite(now) || !Number.isFinite(ago)) return null;
  if (ago <= 0) return null;
  // delta % scaled to 0-100 (0% delta = 50 neutral; +20% = 100; -20% = 0).
  const deltaPct = ((now - ago) / ago) * 100;
  return clamp100(50 + deltaPct * 2.5);
}

function computeN09Delta(now: number | null, ago: number | null): number | null {
  if (now === null || ago === null || !Number.isFinite(now) || !Number.isFinite(ago)) return null;
  // Delta absoluto neutral-centered (0 delta = 50).
  const delta = now - ago;
  return clamp100(50 + delta * 2);
}

function computePriceVelocity6m(now: number | null, ago: number | null): number | null {
  if (now === null || ago === null || !Number.isFinite(now) || !Number.isFinite(ago)) return null;
  if (ago <= 0) return null;
  const pct = ((now - ago) / ago) * 100;
  return clamp100(pct * PRICE_VELOCITY_SCALE);
}

export function computeDmxGnt(input: GntRawInput): GntComputeResult {
  const MOM_12m_val = computeMomDelta(input.MOM_now, input.MOM_12m_ago);
  const influencer_heat_val =
    input.influencer_heat_raw !== null && Number.isFinite(input.influencer_heat_raw)
      ? clamp100(input.influencer_heat_raw)
      : null;
  const denue_alpha_val =
    input.denue_alpha_count_6m !== null && Number.isFinite(input.denue_alpha_count_6m)
      ? clamp100((input.denue_alpha_count_6m / DENUE_ALPHA_SCALE) * 100)
      : null;
  const migration_val =
    input.migration_high_income_score !== null && Number.isFinite(input.migration_high_income_score)
      ? clamp100(input.migration_high_income_score)
      : null;
  const n09_delta_val = computeN09Delta(input.N09_now, input.N09_12m_ago);
  const price_vel_val = computePriceVelocity6m(input.price_m2_now, input.price_m2_6m_ago);

  const parts: Array<{
    key: keyof typeof DEFAULT_GNT_WEIGHTS;
    value: number | null;
    citation_source: string;
  }> = [
    { key: 'MOM_12m', value: MOM_12m_val, citation_source: 'zone_scores:DMX-MOM (delta 12m)' },
    {
      key: 'influencer_heat',
      value: influencer_heat_val,
      citation_source: 'influencer_heat_zones',
    },
    {
      key: 'denue_alpha_signals',
      value: denue_alpha_val,
      citation_source: 'denue_establishments (alpha)',
    },
    {
      key: 'migration_inflow_high_income',
      value: migration_val,
      citation_source: 'zone_migration_flows',
    },
    { key: 'N09_delta_12m', value: n09_delta_val, citation_source: 'zone_scores:N09 (delta 12m)' },
    {
      key: 'price_velocity_6m',
      value: price_vel_val,
      citation_source: 'market_prices_secondary',
    },
  ];

  const missing: string[] = [];
  const limitations: string[] = [...(input.limitations_external ?? [])];
  let weighted = 0;
  let weightSum = 0;
  const details: Partial<Record<keyof typeof DEFAULT_GNT_WEIGHTS, IndexComponentDetail>> = {};

  for (const p of parts) {
    const w = DEFAULT_GNT_WEIGHTS[p.key] ?? 0;
    if (p.value === null || !Number.isFinite(p.value)) {
      missing.push(p.key);
      continue;
    }
    details[p.key] = {
      value: Number(p.value.toFixed(2)),
      weight: w,
      citation_source: p.citation_source,
      citation_period: input.universe_period,
    };
    weighted += p.value * w;
    weightSum += w;
  }

  // Limitations for known-future tables.
  if (influencer_heat_val === null && input.influencer_heat_raw === null) {
    limitations.push('tabla_influencer_heat_zones_no_disponible');
  }
  if (migration_val === null && input.migration_high_income_score === null) {
    limitations.push('tabla_zone_migration_flows_no_disponible');
  }

  const available = parts.length - missing.length;
  const coverage_pct = Math.round((available / parts.length) * 100);

  // Low coverage → insufficient_data (cap ≥40% para permitir H1 parcial).
  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        MOM_12m: details.MOM_12m ?? null,
        influencer_heat: details.influencer_heat ?? null,
        denue_alpha_signals: details.denue_alpha_signals ?? null,
        migration_inflow_high_income: details.migration_inflow_high_income ?? null,
        N09_delta_12m: details.N09_delta_12m ?? null,
        price_velocity_6m: details.price_velocity_6m ?? null,
        fase: 'dormant',
        coverage_pct,
        limitations,
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            ...(input.data_freshness_days !== undefined
              ? { data_freshness_days: input.data_freshness_days }
              : {}),
            coverage_pct,
            sample_size: available,
            methodology_maturity: 75,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          missing_components: missing,
          limitation: limitations.length > 0 ? limitations.join(';') : 'coverage_below_min',
          fallback_reason: 'coverage_below_min',
        },
      },
      trend_vs_previous: null,
    };
  }

  const weighted_normalized = weightSum > 0 ? weighted / weightSum : 0;
  const value = Math.round(clamp100(weighted_normalized));

  const trend_vs_previous =
    input.previous_value !== undefined && input.previous_value !== null
      ? Number((value - input.previous_value).toFixed(2))
      : null;

  const circuit_breaker_triggered = detectCircuitBreaker(
    value,
    input.previous_value ?? null,
    methodology.circuit_breaker_pct,
  );

  // Confidence: high requires full coverage + no limitations.
  const confidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct &&
    limitations.length === 0 &&
    missing.length === 0
      ? 'high'
      : coverage_pct >= methodology.confidence_thresholds.min_coverage_pct
        ? 'medium'
        : 'low';

  return {
    value,
    confidence,
    components: {
      MOM_12m: details.MOM_12m ?? null,
      influencer_heat: details.influencer_heat ?? null,
      denue_alpha_signals: details.denue_alpha_signals ?? null,
      migration_inflow_high_income: details.migration_inflow_high_income ?? null,
      N09_delta_12m: details.N09_delta_12m ?? null,
      price_velocity_6m: details.price_velocity_6m ?? null,
      fase: phaseFor(value),
      coverage_pct,
      limitations,
      _meta: {
        confidence_breakdown: buildConfidenceBreakdown({
          ...(input.data_freshness_days !== undefined
            ? { data_freshness_days: input.data_freshness_days }
            : {}),
          coverage_pct,
          sample_size: available,
          methodology_maturity: 75,
        }),
        circuit_breaker_triggered,
        shadow: input.shadow_mode ?? false,
        weights_used: DEFAULT_GNT_WEIGHTS,
        missing_components: missing,
        redistributed_weights: missing.length > 0,
        ...(limitations.length > 0 ? { limitation: limitations.join(';') } : {}),
      },
    },
    trend_vs_previous,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.index.gnt.insufficient';
  if (value >= 80) return 'ie.index.gnt.post_gentrification';
  if (value >= 65) return 'ie.index.gnt.peaked';
  if (value >= 45) return 'ie.index.gnt.active';
  if (value >= 25) return 'ie.index.gnt.early';
  return 'ie.index.gnt.dormant';
}

function trendDirection(delta: number | null): 'mejorando' | 'estable' | 'empeorando' | undefined {
  if (delta === null) return undefined;
  if (delta > 1) return 'mejorando';
  if (delta < -1) return 'empeorando';
  return 'estable';
}

type LooseClient = SupabaseClient<Record<string, unknown>>;

async function fetchZoneScoreAtPeriod(
  supabase: SupabaseClient,
  zoneId: string,
  scoreType: string,
  periodDate: string,
): Promise<number | null> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_value')
      .eq('zone_id', zoneId)
      .eq('score_type', scoreType)
      .lte('period_date', periodDate)
      .order('period_date', { ascending: false })
      .limit(1);
    if (!data) return null;
    const rows = data as unknown as Array<{ score_value: number | null }>;
    const row = rows[0];
    return row && typeof row.score_value === 'number' ? row.score_value : null;
  } catch {
    return null;
  }
}

async function tryFetchInfluencerHeat(
  supabase: SupabaseClient,
  zoneId: string,
): Promise<{ value: number | null; tableAvailable: boolean }> {
  try {
    const { data, error } = await (supabase as unknown as LooseClient)
      .from('influencer_heat_zones' as never)
      .select('heat_score')
      .eq('zone_id', zoneId)
      .limit(1);
    if (error) return { value: null, tableAvailable: false };
    const rows = data as unknown as Array<{ heat_score: number | null }>;
    const row = rows[0];
    return {
      value: row && typeof row.heat_score === 'number' ? row.heat_score : null,
      tableAvailable: true,
    };
  } catch {
    return { value: null, tableAvailable: false };
  }
}

async function tryFetchMigration(
  supabase: SupabaseClient,
  zoneId: string,
): Promise<{ value: number | null; tableAvailable: boolean }> {
  try {
    const { data, error } = await (supabase as unknown as LooseClient)
      .from('zone_migration_flows' as never)
      .select('high_income_inflow_score')
      .eq('destino_zone_id', zoneId)
      .limit(1);
    if (error) return { value: null, tableAvailable: false };
    const rows = data as unknown as Array<{ high_income_inflow_score: number | null }>;
    const row = rows[0];
    return {
      value:
        row && typeof row.high_income_inflow_score === 'number'
          ? row.high_income_inflow_score
          : null,
      tableAvailable: true,
    };
  } catch {
    return { value: null, tableAvailable: false };
  }
}

async function fetchDenueAlphaCount6m(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<number | null> {
  try {
    const sixMonthsAgo = new Date(`${periodDate}T00:00:00Z`);
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
    const { count } = await (supabase as unknown as LooseClient)
      .from('denue_establishments' as never)
      .select('id', { count: 'exact', head: true })
      .eq('zone_id', zoneId)
      .gte('fecha_alta', sixMonthsAgo.toISOString().slice(0, 10))
      .in('categoria_alpha', ['cafe_especialidad', 'galeria', 'fine_dining']);
    return typeof count === 'number' ? count : 0;
  } catch {
    return null;
  }
}

interface PriceRow {
  readonly price_m2: number | null;
  readonly period_date: string;
}

async function fetchPriceM2(
  supabase: SupabaseClient,
  zoneId: string,
  targetDate: string,
): Promise<number | null> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('market_prices_secondary' as never)
      .select('price_m2, period_date')
      .eq('zone_id', zoneId)
      .lte('period_date', targetDate)
      .order('period_date', { ascending: false })
      .limit(1);
    if (!data) return null;
    const rows = data as unknown as readonly PriceRow[];
    const row = rows[0];
    return row && typeof row.price_m2 === 'number' ? row.price_m2 : null;
  } catch {
    return null;
  }
}

function monthsAgo(periodDate: string, months: number): string {
  const d = new Date(`${periodDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

export const dmxGntCalculator: Calculator = {
  scoreId: 'DMX-GNT',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const shadow_mode = params.shadow_mode === true;
    const audit_log = params.audit_log === true;

    if (!input.zoneId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: { reason: 'DMX-GNT requiere zoneId.' },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'zone_scores', count: 0 }],
          computed_at: computed_at.toISOString(),
          calculator_version: version,
        },
        valid_until: computeValidUntil(computed_at, methodology.validity),
      };
    }

    const period12m = monthsAgo(input.periodDate, 12);
    const period6m = monthsAgo(input.periodDate, 6);

    const [
      MOM_now,
      MOM_12m_ago,
      N09_now,
      N09_12m_ago,
      price_now,
      price_6m_ago,
      influencer,
      migration,
      denue_count,
      previous_value,
    ] = await Promise.all([
      fetchZoneScoreAtPeriod(supabase, input.zoneId, 'DMX-MOM', input.periodDate),
      fetchZoneScoreAtPeriod(supabase, input.zoneId, 'DMX-MOM', period12m),
      fetchZoneScoreAtPeriod(supabase, input.zoneId, 'N09', input.periodDate),
      fetchZoneScoreAtPeriod(supabase, input.zoneId, 'N09', period12m),
      fetchPriceM2(supabase, input.zoneId, input.periodDate),
      fetchPriceM2(supabase, input.zoneId, period6m),
      tryFetchInfluencerHeat(supabase, input.zoneId),
      tryFetchMigration(supabase, input.zoneId),
      fetchDenueAlphaCount6m(supabase, input.zoneId, input.periodDate),
      fetchPreviousSnapshot(supabase, 'zone', input.zoneId, 'DMX-GNT', input.periodDate),
    ]);

    const limitations: string[] = [];
    if (!influencer.tableAvailable) limitations.push('tabla_influencer_heat_zones_no_disponible');
    if (!migration.tableAvailable) limitations.push('tabla_zone_migration_flows_no_disponible');

    const rawInput: GntRawInput = {
      MOM_now,
      MOM_12m_ago,
      influencer_heat_raw: influencer.tableAvailable ? influencer.value : 0,
      denue_alpha_count_6m: denue_count,
      migration_high_income_score: migration.tableAvailable ? migration.value : 0,
      N09_now,
      N09_12m_ago,
      price_m2_now: price_now,
      price_m2_6m_ago: price_6m_ago,
      universe_period: input.periodDate,
      ...(previous_value !== null ? { previous_value } : {}),
      shadow_mode,
      limitations_external: limitations,
    };

    const result = computeDmxGnt(rawInput);

    if (audit_log) {
      const auditParams: AuditLogParams = {
        score_id: 'DMX-GNT',
        entity_type: 'zone',
        entity_id: input.zoneId,
        country_code: input.countryCode,
        period_date: input.periodDate,
        score_value: result.value,
        confidence: result.confidence,
        computed_at: computed_at.toISOString(),
        calculator_version: version,
        inputs_hash: `mom:${MOM_now}|mom12:${MOM_12m_ago}|price:${price_now}|den:${denue_count}`,
      };
      await tryInsertAuditLog(supabase, auditParams);
    }

    const dir = trendDirection(result.trend_vs_previous);

    return {
      score_value: result.value,
      score_label: getLabelKey(result.value, result.confidence),
      components: result.components,
      inputs_used: {
        periodDate: input.periodDate,
        zoneId: input.zoneId,
        influencer_table_available: influencer.tableAvailable,
        migration_table_available: migration.tableAvailable,
        shadow_mode,
      },
      confidence: result.confidence,
      citations: [
        { source: 'zone_scores:DMX-MOM', period: input.periodDate },
        { source: 'influencer_heat_zones', period: input.periodDate },
        { source: 'denue_establishments', period: input.periodDate },
        { source: 'zone_migration_flows', period: input.periodDate },
        { source: 'zone_scores:N09', period: input.periodDate },
        { source: 'market_prices_secondary', period: input.periodDate },
      ],
      ...(result.trend_vs_previous !== null ? { trend_vs_previous: result.trend_vs_previous } : {}),
      ...(dir !== undefined ? { trend_direction: dir } : {}),
      provenance: {
        sources: [
          { name: 'zone_scores', period: input.periodDate },
          {
            name: 'influencer_heat_zones',
            count: influencer.tableAvailable ? 1 : 0,
          },
          {
            name: 'zone_migration_flows',
            count: migration.tableAvailable ? 1 : 0,
          },
          { name: 'market_prices_secondary', period: input.periodDate },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zone_id: input.zoneId,
        fase: result.components.fase,
        MOM_12m: String(MOM_now ?? 'n/a'),
        price_velocity_6m: String(price_now ?? 'n/a'),
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default dmxGntCalculator;
