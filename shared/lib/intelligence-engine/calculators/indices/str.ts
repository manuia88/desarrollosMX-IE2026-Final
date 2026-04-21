// DMX-STR — Airbnb-Ready / Short-Term Rental Index. Categoría mercado, tier 3,
// country MX. Plan FASE 11 §DMX-STR + Catálogo 03.8 §dmx-str.
//
// Fórmula:
//   STR = airroi_occ_norm·0.30 + airroi_adr_norm·0.25 + N09·0.15 + F01·0.10
//       + str_permits_inv·0.10 + str_saturation_inv·0.10
//
// Componentes:
//   - airroi_occ_norm: occupancy rate normalizado 0-100 vs CDMX (str_market_metrics).
//   - airroi_adr_norm: average daily rate normalizado 0-100 vs CDMX.
//   - N09: Ecosystem nocturno (restaurantes, atractivos) lookup zone_scores.
//   - F01: Safety score (turistas requieren seguridad).
//   - str_permits_inv: 100 − regulación STR (menos regulación = mejor turismo).
//   - str_saturation_inv: 100 − densidad listings (menos saturación = oportunidad).
//
// Missing data:
//   - AirROI data faltante (occ + adr null) → confidence='insufficient_data'.
//   - N09/F01 missing → confidence degrade + weights renormalize.
//   - str_permits_zone/str_saturation (tablas H2) → proxy constante + limitation.
//
// Upgrades FASE 11 XL:
//   - Explainability: cada componente con {value, weight, citation_source, period}.
//   - Confidence granular 0-100 en _meta.confidence_breakdown.
//   - Audit log hook (params.audit_log).
//   - Circuit breaker Δ>20% vs snapshot anterior.
//   - Shadow mode (params.shadow_mode).

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

export const DEFAULT_STR_WEIGHTS: Readonly<Record<string, number>> = {
  airroi_occ_norm: 0.3,
  airroi_adr_norm: 0.25,
  N09: 0.15,
  F01: 0.1,
  str_permits_inv: 0.1,
  str_saturation_inv: 0.1,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['airroi_occ_norm', 'airroi_adr_norm'] as const;

// Proxy constant cuando str_permits_zone / str_saturation tablas no disponibles.
// Valor neutro (50) = sin signal, degrada confidence. H2 activa tablas reales.
export const STR_PROXY_NEUTRAL = 50;

export const methodology = {
  formula:
    'STR = airroi_occ_norm·0.30 + airroi_adr_norm·0.25 + N09·0.15 + F01·0.10 + (100−str_permits)·0.10 + (100−str_saturation)·0.10.',
  sources: [
    'str_market_metrics:airroi_occupancy',
    'str_market_metrics:airroi_adr',
    'zone_scores:N09',
    'zone_scores:F01',
    'str_permits_zone',
    'str_listings_density',
  ],
  dependencies: [
    { score_id: 'airroi_occ_norm', weight: 0.3, role: 'occupancy_demand', critical: true },
    { score_id: 'airroi_adr_norm', weight: 0.25, role: 'revenue_per_night', critical: true },
    { score_id: 'N09', weight: 0.15, role: 'ecosistema_turistico', critical: false },
    { score_id: 'F01', weight: 0.1, role: 'safety_turismo', critical: false },
    { score_id: 'str_permits_inv', weight: 0.1, role: 'regulacion_inversa', critical: false },
    { score_id: 'str_saturation_inv', weight: 0.1, role: 'saturacion_inversa', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-STR',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-str-airbnb-ready',
    },
    {
      name: 'Plan FASE 11 §DMX-STR',
      url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md#modulo-11b11-dmx-str',
    },
    {
      name: 'Plan FASE 07b STR Intelligence',
      url: 'docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 85 },
  circuit_breaker_pct: 20,
  sensitivity_analysis: [
    { dimension_id: 'airroi_occ_norm', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'airroi_adr_norm', impact_pct_per_10pct_change: 2.5 },
  ],
} as const;

export const reasoning_template =
  'STR Index zona={zone_id}: {score_value}/100 (banda={bucket}). OCC {airroi_occ}%, ADR MXN {airroi_adr}. Confianza {confidence}.';

export type StrBucket = 'excelente' | 'bueno' | 'regular' | 'bajo';

export interface StrComponents extends Record<string, unknown> {
  readonly airroi_occ_norm: IndexComponentDetail | null;
  readonly airroi_adr_norm: IndexComponentDetail | null;
  readonly N09: IndexComponentDetail | null;
  readonly F01: IndexComponentDetail | null;
  readonly str_permits_inv: IndexComponentDetail | null;
  readonly str_saturation_inv: IndexComponentDetail | null;
  readonly bucket: StrBucket;
  readonly coverage_pct: number;
  readonly _meta: IndicesMeta;
}

export interface StrRawInput {
  readonly airroi_occupancy_rate: number | null;
  readonly airroi_adr: number | null;
  readonly airroi_occupancy_cdmx_max?: number;
  readonly airroi_adr_cdmx_max?: number;
  readonly n09_value: number | null;
  readonly f01_value: number | null;
  readonly str_permits_pct: number | null;
  readonly str_saturation_pct: number | null;
  readonly universe_period: string;
  readonly data_freshness_days?: number;
  readonly previous_value?: number | null;
  readonly shadow_mode?: boolean;
}

export interface StrComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: StrComponents;
  readonly trend_vs_previous: number | null;
}

function bucketFor(value: number): StrBucket {
  if (value >= 80) return 'excelente';
  if (value >= 60) return 'bueno';
  if (value >= 40) return 'regular';
  return 'bajo';
}

function normalizeMetric(raw: number | null, denom: number | undefined): number | null {
  if (raw === null || !Number.isFinite(raw)) return null;
  const d = denom && Number.isFinite(denom) && denom > 0 ? denom : 100;
  return clamp100((raw / d) * 100);
}

export function computeDmxStr(input: StrRawInput): StrComputeResult {
  const occ_norm = normalizeMetric(
    input.airroi_occupancy_rate,
    input.airroi_occupancy_cdmx_max ?? 100,
  );
  const adr_norm = normalizeMetric(input.airroi_adr, input.airroi_adr_cdmx_max ?? 5000);

  // Critical check: ambos AirROI null → insufficient.
  if (occ_norm === null && adr_norm === null) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        airroi_occ_norm: null,
        airroi_adr_norm: null,
        N09: null,
        F01: null,
        str_permits_inv: null,
        str_saturation_inv: null,
        bucket: 'bajo',
        coverage_pct: 0,
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            ...(input.data_freshness_days !== undefined
              ? { data_freshness_days: input.data_freshness_days }
              : {}),
            coverage_pct: 0,
            sample_size: 0,
            methodology_maturity: 80,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          missing_components: ['airroi_occ_norm', 'airroi_adr_norm'],
          fallback_reason: 'airroi_data_missing',
        },
      },
      trend_vs_previous: null,
    };
  }

  const str_permits_inv =
    input.str_permits_pct !== null && Number.isFinite(input.str_permits_pct)
      ? clamp100(100 - input.str_permits_pct)
      : null;
  const str_saturation_inv =
    input.str_saturation_pct !== null && Number.isFinite(input.str_saturation_pct)
      ? clamp100(100 - input.str_saturation_pct)
      : null;

  const parts: Array<{
    key: keyof typeof DEFAULT_STR_WEIGHTS;
    value: number | null;
    citation_source: string;
  }> = [
    { key: 'airroi_occ_norm', value: occ_norm, citation_source: 'str_market_metrics:occupancy' },
    { key: 'airroi_adr_norm', value: adr_norm, citation_source: 'str_market_metrics:adr' },
    { key: 'N09', value: input.n09_value, citation_source: 'zone_scores:N09' },
    { key: 'F01', value: input.f01_value, citation_source: 'zone_scores:F01' },
    {
      key: 'str_permits_inv',
      value: str_permits_inv,
      citation_source: 'str_permits_zone',
    },
    {
      key: 'str_saturation_inv',
      value: str_saturation_inv,
      citation_source: 'str_listings_density',
    },
  ];

  const missing: string[] = [];
  let weighted = 0;
  let weightSum = 0;
  const componentDetails: Partial<Record<keyof typeof DEFAULT_STR_WEIGHTS, IndexComponentDetail>> =
    {};

  for (const p of parts) {
    const w = DEFAULT_STR_WEIGHTS[p.key] ?? 0;
    if (p.value === null || !Number.isFinite(p.value)) {
      missing.push(p.key);
      continue;
    }
    componentDetails[p.key] = {
      value: Number(p.value.toFixed(2)),
      weight: w,
      citation_source: p.citation_source,
      citation_period: input.universe_period,
    };
    weighted += p.value * w;
    weightSum += w;
  }

  const available = parts.length - missing.length;
  const coverage_pct = Math.round((available / parts.length) * 100);

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        airroi_occ_norm: componentDetails.airroi_occ_norm ?? null,
        airroi_adr_norm: componentDetails.airroi_adr_norm ?? null,
        N09: componentDetails.N09 ?? null,
        F01: componentDetails.F01 ?? null,
        str_permits_inv: componentDetails.str_permits_inv ?? null,
        str_saturation_inv: componentDetails.str_saturation_inv ?? null,
        bucket: 'bajo',
        coverage_pct,
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            ...(input.data_freshness_days !== undefined
              ? { data_freshness_days: input.data_freshness_days }
              : {}),
            coverage_pct,
            sample_size: available,
            methodology_maturity: 80,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          missing_components: missing,
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

  const confidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct && missing.length === 0
      ? 'high'
      : coverage_pct >= methodology.confidence_thresholds.high_coverage_pct
        ? 'medium'
        : 'medium';

  return {
    value,
    confidence,
    components: {
      airroi_occ_norm: componentDetails.airroi_occ_norm ?? null,
      airroi_adr_norm: componentDetails.airroi_adr_norm ?? null,
      N09: componentDetails.N09 ?? null,
      F01: componentDetails.F01 ?? null,
      str_permits_inv: componentDetails.str_permits_inv ?? null,
      str_saturation_inv: componentDetails.str_saturation_inv ?? null,
      bucket: bucketFor(value),
      coverage_pct,
      _meta: {
        confidence_breakdown: buildConfidenceBreakdown({
          ...(input.data_freshness_days !== undefined
            ? { data_freshness_days: input.data_freshness_days }
            : {}),
          coverage_pct,
          sample_size: available,
          methodology_maturity: 80,
        }),
        circuit_breaker_triggered,
        shadow: input.shadow_mode ?? false,
        weights_used: DEFAULT_STR_WEIGHTS,
        missing_components: missing,
        redistributed_weights: missing.length > 0,
      },
    },
    trend_vs_previous,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.index.str.insufficient';
  if (value >= 80) return 'ie.index.str.excelente';
  if (value >= 60) return 'ie.index.str.bueno';
  if (value >= 40) return 'ie.index.str.regular';
  return 'ie.index.str.bajo';
}

function trendDirection(delta: number | null): 'mejorando' | 'estable' | 'empeorando' | undefined {
  if (delta === null) return undefined;
  if (delta > 1) return 'mejorando';
  if (delta < -1) return 'empeorando';
  return 'estable';
}

type LooseClient = SupabaseClient<Record<string, unknown>>;

interface ZoneScoreRow {
  readonly score_type: string;
  readonly score_value: number | null;
  readonly computed_at: string | null;
}

interface StrMarketRow {
  readonly airroi_occupancy_rate: number | null;
  readonly airroi_adr: number | null;
  readonly computed_at: string | null;
}

async function fetchZoneScoreValues(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<{ n09: number | null; f01: number | null; fetched: number }> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_type, score_value, computed_at')
      .eq('zone_id', zoneId)
      .eq('period_date', periodDate)
      .in('score_type', ['N09', 'F01']);
    if (!data) return { n09: null, f01: null, fetched: 0 };
    const rows = data as unknown as readonly ZoneScoreRow[];
    let n09: number | null = null;
    let f01: number | null = null;
    for (const r of rows) {
      if (typeof r.score_value !== 'number' || !Number.isFinite(r.score_value)) continue;
      if (r.score_type === 'N09') n09 = r.score_value;
      if (r.score_type === 'F01') f01 = r.score_value;
    }
    return { n09, f01, fetched: rows.length };
  } catch {
    return { n09: null, f01: null, fetched: 0 };
  }
}

async function fetchAirroi(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<{
  occupancy: number | null;
  adr: number | null;
  freshness_days: number | undefined;
}> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('str_market_metrics' as never)
      .select('airroi_occupancy_rate, airroi_adr, computed_at')
      .eq('zone_id', zoneId)
      .lte('period_date', periodDate)
      .order('period_date', { ascending: false })
      .limit(1);
    if (!data) return { occupancy: null, adr: null, freshness_days: undefined };
    const rows = data as unknown as readonly StrMarketRow[];
    const row = rows[0];
    if (!row) return { occupancy: null, adr: null, freshness_days: undefined };
    const freshness_days = row.computed_at
      ? Math.max(
          0,
          Math.floor(
            (new Date(`${periodDate}T00:00:00Z`).getTime() - new Date(row.computed_at).getTime()) /
              86_400_000,
          ),
        )
      : undefined;
    return {
      occupancy: typeof row.airroi_occupancy_rate === 'number' ? row.airroi_occupancy_rate : null,
      adr: typeof row.airroi_adr === 'number' ? row.airroi_adr : null,
      freshness_days,
    };
  } catch {
    return { occupancy: null, adr: null, freshness_days: undefined };
  }
}

export const dmxStrCalculator: Calculator = {
  scoreId: 'DMX-STR',
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
        components: { reason: 'DMX-STR requiere zoneId.' },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'str_market_metrics', count: 0 }],
          computed_at: computed_at.toISOString(),
          calculator_version: version,
        },
        valid_until: computeValidUntil(computed_at, methodology.validity),
      };
    }

    const [airroi, zoneScores] = await Promise.all([
      fetchAirroi(supabase, input.zoneId, input.periodDate),
      fetchZoneScoreValues(supabase, input.zoneId, input.periodDate),
    ]);

    const previous_value = await fetchPreviousSnapshot(
      supabase,
      'zone',
      input.zoneId,
      'DMX-STR',
      input.periodDate,
    );

    const rawInput: StrRawInput = {
      airroi_occupancy_rate: airroi.occupancy,
      airroi_adr: airroi.adr,
      n09_value: zoneScores.n09,
      f01_value: zoneScores.f01,
      str_permits_pct: null,
      str_saturation_pct: null,
      universe_period: input.periodDate,
      ...(airroi.freshness_days !== undefined
        ? { data_freshness_days: airroi.freshness_days }
        : {}),
      ...(previous_value !== null ? { previous_value } : {}),
      shadow_mode,
    };

    const result = computeDmxStr(rawInput);

    if (audit_log) {
      const auditParams: AuditLogParams = {
        score_id: 'DMX-STR',
        entity_type: 'zone',
        entity_id: input.zoneId,
        country_code: input.countryCode,
        period_date: input.periodDate,
        score_value: result.value,
        confidence: result.confidence,
        computed_at: computed_at.toISOString(),
        calculator_version: version,
        inputs_hash: `occ:${airroi.occupancy}|adr:${airroi.adr}|n09:${zoneScores.n09}|f01:${zoneScores.f01}`,
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
        airroi_present: airroi.occupancy !== null || airroi.adr !== null,
        n09_present: zoneScores.n09 !== null,
        f01_present: zoneScores.f01 !== null,
        shadow_mode,
      },
      confidence: result.confidence,
      citations: [
        { source: 'str_market_metrics', period: input.periodDate },
        { source: 'zone_scores:N09', period: input.periodDate },
        { source: 'zone_scores:F01', period: input.periodDate },
      ],
      ...(result.trend_vs_previous !== null ? { trend_vs_previous: result.trend_vs_previous } : {}),
      ...(dir !== undefined ? { trend_direction: dir } : {}),
      provenance: {
        sources: [
          { name: 'str_market_metrics', period: input.periodDate },
          { name: 'zone_scores', period: input.periodDate, count: zoneScores.fetched },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zone_id: input.zoneId,
        bucket: result.components.bucket,
        airroi_occ: String(airroi.occupancy ?? 'n/a'),
        airroi_adr: String(airroi.adr ?? 'n/a'),
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default dmxStrCalculator;
