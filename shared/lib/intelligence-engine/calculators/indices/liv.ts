// DMX-LIV — Livability Index (B2B: portales + fintechs).
// Plan FASE 11 XL. Registry entry: score_id 'DMX-LIV', tier 3, category
// 'agregado', deps [F08, N08, N01, N10, N07, H01, H02, N02, N04].
//
// FÓRMULA:
//   LIV = F08·0.30 + N08·0.15 + N01·0.10 + N10·0.05 + N07·0.10
//       + H01·0.10 + H02·0.05 + N02·0.10 + N04·0.05
//
// Missing data strategy:
//   - F08 (critical, 30% peso) missing → buscar último ≤90d; si no →
//     confidence='insufficient_data'.
//   - Cualquier otro missing: re-normaliza pesos presentes; confidence medium/low.

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

export const DEFAULT_LIV_WEIGHTS: Readonly<Record<string, number>> = {
  F08: 0.3,
  N08: 0.15,
  N01: 0.1,
  N10: 0.05,
  N07: 0.1,
  H01: 0.1,
  H02: 0.05,
  N02: 0.1,
  N04: 0.05,
} as const;

export const LIV_DEPS: readonly string[] = [
  'F08',
  'N08',
  'N01',
  'N10',
  'N07',
  'H01',
  'H02',
  'N02',
  'N04',
] as const;

export const CRITICAL_DEPS: readonly string[] = ['F08'] as const;

export const methodology = {
  formula:
    'LIV = F08·0.30 + N08·0.15 + N01·0.10 + N10·0.05 + N07·0.10 + H01·0.10 + H02·0.05 + N02·0.10 + N04·0.05',
  sources: LIV_DEPS.map((d) => `zone_scores:${d}`),
  dependencies: [
    { score_id: 'F08', weight: 0.3, role: 'zone_lqi', critical: true },
    { score_id: 'N08', weight: 0.15, role: 'walkability', critical: false },
    { score_id: 'N01', weight: 0.1, role: 'demografia', critical: false },
    { score_id: 'N10', weight: 0.05, role: 'aire', critical: false },
    { score_id: 'N07', weight: 0.1, role: 'ambiental', critical: false },
    { score_id: 'H01', weight: 0.1, role: 'salud', critical: false },
    { score_id: 'H02', weight: 0.05, role: 'educacion', critical: false },
    { score_id: 'N02', weight: 0.1, role: 'equipamiento', critical: false },
    { score_id: 'N04', weight: 0.05, role: 'ocio', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-LIV Livability Index',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-liv-livability-index-nuevo-v4',
    },
    { name: 'Plan FASE 11 XL', url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md' },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_coverage_pct: 50,
    high_coverage_pct: 85,
    max_data_age_days: 90,
    circuit_breaker_pct: 20,
  },
  sensitivity_analysis: [
    { dimension_id: 'F08', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'N08', impact_pct_per_10pct_change: 1.5 },
    { dimension_id: 'H01', impact_pct_per_10pct_change: 1.0 },
  ],
} as const;

export const reasoning_template =
  'Livability Index {zone_id}: {score_value}/100. Cobertura {coverage_pct}%. Confianza {confidence}.';

export type LivBucket = 'bajo' | 'regular' | 'alto' | 'excelente';

export interface LivComponents extends Record<string, unknown> {
  readonly F08: IndexComponentDetail | null;
  readonly N08: IndexComponentDetail | null;
  readonly N01: IndexComponentDetail | null;
  readonly N10: IndexComponentDetail | null;
  readonly N07: IndexComponentDetail | null;
  readonly H01: IndexComponentDetail | null;
  readonly H02: IndexComponentDetail | null;
  readonly N02: IndexComponentDetail | null;
  readonly N04: IndexComponentDetail | null;
  readonly bucket: LivBucket;
  readonly coverage_pct: number;
  readonly _meta: IndicesMeta;
}

export interface LivRawInput {
  readonly subscores: Readonly<Record<string, number | null>>;
  readonly period: string;
  readonly data_freshness_days?: number | undefined;
  readonly sample_size?: number | undefined;
  readonly previous_value?: number | null | undefined;
  readonly shadow_mode?: boolean | undefined;
  readonly weights_override?: Readonly<Record<string, number>> | undefined;
}

export interface LivComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: LivComponents;
  readonly trend_vs_previous: number | null;
}

function bucketFor(value: number): LivBucket {
  if (value >= 80) return 'excelente';
  if (value >= 60) return 'alto';
  if (value >= 40) return 'regular';
  return 'bajo';
}

function detailOrNull(
  depId: string,
  value: number | null,
  weight: number,
  period: string,
): IndexComponentDetail | null {
  if (value === null || !Number.isFinite(value)) return null;
  return {
    value,
    weight,
    citation_source: `zone_scores:${depId}`,
    citation_period: period,
  };
}

export function computeDmxLiv(input: LivRawInput): LivComputeResult {
  const weights = { ...DEFAULT_LIV_WEIGHTS, ...(input.weights_override ?? {}) };
  const missing: string[] = [];
  let weighted_sum = 0;
  let weight_sum_used = 0;
  let count = 0;

  for (const dep of LIV_DEPS) {
    const v = input.subscores[dep];
    const w = weights[dep] ?? 0;
    if (v === null || v === undefined || !Number.isFinite(v)) {
      missing.push(dep);
      continue;
    }
    weighted_sum += v * w;
    weight_sum_used += w;
    count += 1;
  }

  const total_possible = LIV_DEPS.length;
  const available = total_possible - missing.length;
  const coverage_pct = Math.round((available / total_possible) * 100);

  const isF08Missing = missing.includes('F08');
  if (isF08Missing || coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        F08: detailOrNull('F08', input.subscores.F08 ?? null, weights.F08 ?? 0, input.period),
        N08: detailOrNull('N08', input.subscores.N08 ?? null, weights.N08 ?? 0, input.period),
        N01: detailOrNull('N01', input.subscores.N01 ?? null, weights.N01 ?? 0, input.period),
        N10: detailOrNull('N10', input.subscores.N10 ?? null, weights.N10 ?? 0, input.period),
        N07: detailOrNull('N07', input.subscores.N07 ?? null, weights.N07 ?? 0, input.period),
        H01: detailOrNull('H01', input.subscores.H01 ?? null, weights.H01 ?? 0, input.period),
        H02: detailOrNull('H02', input.subscores.H02 ?? null, weights.H02 ?? 0, input.period),
        N02: detailOrNull('N02', input.subscores.N02 ?? null, weights.N02 ?? 0, input.period),
        N04: detailOrNull('N04', input.subscores.N04 ?? null, weights.N04 ?? 0, input.period),
        bucket: 'bajo',
        coverage_pct,
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            data_freshness_days: input.data_freshness_days,
            coverage_pct,
            sample_size: input.sample_size ?? count,
            methodology_maturity: 80,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          fallback_reason: isF08Missing ? 'critical_F08_missing' : 'coverage_below_min',
          weights_used: weights,
          missing_components: missing,
        },
      },
      trend_vs_previous: null,
    };
  }

  // Re-normaliza por pesos efectivamente usados.
  const raw = weight_sum_used > 0 ? weighted_sum / weight_sum_used : 0;
  const value = Math.round(clamp100(raw));
  const trend_vs_previous =
    input.previous_value !== undefined && input.previous_value !== null
      ? Number((value - input.previous_value).toFixed(2))
      : null;

  const circuit_breaker_triggered = detectCircuitBreaker(
    value,
    input.previous_value ?? null,
    methodology.confidence_thresholds.circuit_breaker_pct,
  );

  let confidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';
  if (coverage_pct < 70 && confidence === 'medium') confidence = 'low';

  return {
    value,
    confidence,
    components: {
      F08: detailOrNull('F08', input.subscores.F08 ?? null, weights.F08 ?? 0, input.period),
      N08: detailOrNull('N08', input.subscores.N08 ?? null, weights.N08 ?? 0, input.period),
      N01: detailOrNull('N01', input.subscores.N01 ?? null, weights.N01 ?? 0, input.period),
      N10: detailOrNull('N10', input.subscores.N10 ?? null, weights.N10 ?? 0, input.period),
      N07: detailOrNull('N07', input.subscores.N07 ?? null, weights.N07 ?? 0, input.period),
      H01: detailOrNull('H01', input.subscores.H01 ?? null, weights.H01 ?? 0, input.period),
      H02: detailOrNull('H02', input.subscores.H02 ?? null, weights.H02 ?? 0, input.period),
      N02: detailOrNull('N02', input.subscores.N02 ?? null, weights.N02 ?? 0, input.period),
      N04: detailOrNull('N04', input.subscores.N04 ?? null, weights.N04 ?? 0, input.period),
      bucket: bucketFor(value),
      coverage_pct,
      _meta: {
        confidence_breakdown: buildConfidenceBreakdown({
          data_freshness_days: input.data_freshness_days,
          coverage_pct,
          sample_size: input.sample_size ?? count,
          methodology_maturity: 80,
        }),
        circuit_breaker_triggered,
        shadow: input.shadow_mode ?? false,
        weights_used: weights,
        missing_components: missing,
        redistributed_weights: missing.length > 0,
      },
    },
    trend_vs_previous,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.index.liv.insufficient';
  if (value >= 80) return 'ie.index.liv.excelente';
  if (value >= 60) return 'ie.index.liv.alto';
  if (value >= 40) return 'ie.index.liv.regular';
  return 'ie.index.liv.bajo';
}

function trendDirection(delta: number | null): 'mejorando' | 'estable' | 'empeorando' | undefined {
  if (delta === null) return undefined;
  if (delta > 1) return 'mejorando';
  if (delta < -1) return 'empeorando';
  return 'estable';
}

interface ZoneScoreRow {
  readonly score_type: string;
  readonly score_value: number | null;
  readonly computed_at: string | null;
}

export const dmxLivCalculator: Calculator = {
  scoreId: 'DMX-LIV',
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
        components: { reason: 'DMX-LIV requiere zoneId.' },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'zone_scores:LIV_deps', count: 0 }],
          computed_at: computed_at.toISOString(),
          calculator_version: version,
        },
        valid_until: computeValidUntil(computed_at, methodology.validity),
      };
    }

    const subscores: Record<string, number | null> = {};
    let maxFreshnessDays = 0;
    let fetched = 0;

    try {
      const { data } = await (supabase as unknown as SupabaseClient<Record<string, unknown>>)
        .from('zone_scores' as never)
        .select('score_type, score_value, computed_at')
        .eq('zone_id', input.zoneId)
        .eq('country_code', input.countryCode)
        .eq('period_date', input.periodDate)
        .in('score_type', LIV_DEPS as readonly string[]);

      if (data) {
        const rows = data as unknown as ZoneScoreRow[];
        for (const row of rows) {
          if (!LIV_DEPS.includes(row.score_type as (typeof LIV_DEPS)[number])) continue;
          if (typeof row.score_value !== 'number' || !Number.isFinite(row.score_value)) continue;
          subscores[row.score_type] = row.score_value;
          fetched += 1;
          if (row.computed_at) {
            const age = Math.floor(
              (computed_at.getTime() - new Date(row.computed_at).getTime()) / 86_400_000,
            );
            if (age > maxFreshnessDays) maxFreshnessDays = age;
          }
        }
      }
    } catch {
      // swallow — falta de data propaga a insufficient.
    }

    const previous_value = await fetchPreviousSnapshot(
      supabase,
      'zone',
      input.zoneId,
      'DMX-LIV',
      input.periodDate,
    );

    const result = computeDmxLiv({
      subscores,
      period: input.periodDate,
      data_freshness_days: maxFreshnessDays,
      sample_size: fetched,
      previous_value,
      shadow_mode,
    });

    if (audit_log) {
      const auditParams: AuditLogParams = {
        score_id: 'DMX-LIV',
        entity_type: 'zone',
        entity_id: input.zoneId,
        country_code: input.countryCode,
        period_date: input.periodDate,
        score_value: result.value,
        confidence: result.confidence,
        computed_at: computed_at.toISOString(),
        calculator_version: version,
        inputs_hash: String(fetched),
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
        deps_fetched: fetched,
        shadow_mode,
      },
      confidence: result.confidence,
      citations: LIV_DEPS.map((d) => ({
        source: `zone_scores:${d}`,
        period: input.periodDate,
      })),
      ...(result.trend_vs_previous !== null ? { trend_vs_previous: result.trend_vs_previous } : {}),
      ...(dir !== undefined ? { trend_direction: dir } : {}),
      provenance: {
        sources: LIV_DEPS.map((d) => ({
          name: `zone_scores:${d}`,
          period: input.periodDate,
          count: subscores[d] !== undefined ? 1 : 0,
        })),
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zone_id: input.zoneId,
        coverage_pct: result.components.coverage_pct,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default dmxLivCalculator;
