// DMX-YNG — Zona Millennial / Joven Profesionista.
// Plan FASE 11 XL. score_id 'DMX-YNG', tier 3, category 'agregado'.
//
// FÓRMULA:
//   YNG = F08·0.20 + F02_inv·0.20 + N04·0.20 + N08·0.15 + N09·0.15 + F03·0.10
// F02_inv = 100 − F02 (menos commute → mejor).
//
// Critical deps: F08 (zone LQI 20%), F02 (commute 20%), N04 (ocio 20%) — 3 pilares.

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

export const DEFAULT_YNG_WEIGHTS: Readonly<Record<string, number>> = {
  F08: 0.2,
  F02_inv: 0.2,
  N04: 0.2,
  N08: 0.15,
  N09: 0.15,
  F03: 0.1,
} as const;

export const YNG_FETCH_DEPS: readonly string[] = [
  'F08',
  'F02',
  'N04',
  'N08',
  'N09',
  'F03',
] as const;
export const YNG_COMPONENT_KEYS: readonly string[] = [
  'F08',
  'F02_inv',
  'N04',
  'N08',
  'N09',
  'F03',
] as const;

export const CRITICAL_DEPS: readonly string[] = ['F08', 'F02', 'N04'] as const;

export const methodology = {
  formula: 'YNG = F08·0.20 + (100−F02)·0.20 + N04·0.20 + N08·0.15 + N09·0.15 + F03·0.10',
  sources: YNG_FETCH_DEPS.map((d) => `zone_scores:${d}`),
  dependencies: [
    { score_id: 'F08', weight: 0.2, role: 'zone_lqi', critical: true },
    { score_id: 'F02', weight: 0.2, role: 'commute_inverso', critical: true, inverted: true },
    { score_id: 'N04', weight: 0.2, role: 'entretenimiento_nightlife', critical: true },
    { score_id: 'N08', weight: 0.15, role: 'walkability', critical: false },
    { score_id: 'N09', weight: 0.15, role: 'cafes_coworking', critical: false },
    { score_id: 'F03', weight: 0.1, role: 'transporte_publico', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-YNG Zona Millennial',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-yng',
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
    { dimension_id: 'F08', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'F02', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'N04', impact_pct_per_10pct_change: 2.0 },
  ],
} as const;

export const reasoning_template =
  'Millennial Index {zone_id}: {score_value}/100. Cobertura {coverage_pct}%. Confianza {confidence}.';

export type YngBucket = 'bajo' | 'regular' | 'alto' | 'excelente';

export interface YngComponents extends Record<string, unknown> {
  readonly F08: IndexComponentDetail | null;
  readonly F02_inv: IndexComponentDetail | null;
  readonly N04: IndexComponentDetail | null;
  readonly N08: IndexComponentDetail | null;
  readonly N09: IndexComponentDetail | null;
  readonly F03: IndexComponentDetail | null;
  readonly bucket: YngBucket;
  readonly coverage_pct: number;
  readonly _meta: IndicesMeta;
}

export interface YngRawInput {
  readonly subscores: Readonly<Record<string, number | null>>;
  readonly period: string;
  readonly data_freshness_days?: number | undefined;
  readonly sample_size?: number | undefined;
  readonly previous_value?: number | null | undefined;
  readonly shadow_mode?: boolean | undefined;
  readonly weights_override?: Readonly<Record<string, number>> | undefined;
}

export interface YngComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: YngComponents;
  readonly trend_vs_previous: number | null;
}

function bucketFor(value: number): YngBucket {
  if (value >= 80) return 'excelente';
  if (value >= 60) return 'alto';
  if (value >= 40) return 'regular';
  return 'bajo';
}

function detail(
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

export function computeDmxYng(input: YngRawInput): YngComputeResult {
  const weights = { ...DEFAULT_YNG_WEIGHTS, ...(input.weights_override ?? {}) };

  const f02Raw = input.subscores.F02;
  const f02Inv =
    f02Raw !== null && f02Raw !== undefined && Number.isFinite(f02Raw)
      ? clamp100(100 - f02Raw)
      : null;

  const values: Record<string, number | null> = {
    F08: input.subscores.F08 ?? null,
    F02_inv: f02Inv,
    N04: input.subscores.N04 ?? null,
    N08: input.subscores.N08 ?? null,
    N09: input.subscores.N09 ?? null,
    F03: input.subscores.F03 ?? null,
  };

  const missing: string[] = [];
  let weighted_sum = 0;
  let weight_sum_used = 0;
  let count = 0;

  for (const k of YNG_COMPONENT_KEYS) {
    const v = values[k];
    const w = weights[k] ?? 0;
    if (v === null || v === undefined || !Number.isFinite(v)) {
      missing.push(k);
      continue;
    }
    weighted_sum += v * w;
    weight_sum_used += w;
    count += 1;
  }

  const total_possible = YNG_COMPONENT_KEYS.length;
  const available = total_possible - missing.length;
  const coverage_pct = Math.round((available / total_possible) * 100);

  // Critical missing check — CRITICAL_DEPS list raw IDs (F02), pero el componente
  // interno correspondiente es F02_inv.
  const criticalMissingRaw = CRITICAL_DEPS.some((d) => {
    if (d === 'F02') return missing.includes('F02_inv');
    return missing.includes(d);
  });

  if (criticalMissingRaw || coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        F08: detail('F08', values.F08 ?? null, weights.F08 ?? 0, input.period),
        F02_inv: detail('F02', values.F02_inv ?? null, weights.F02_inv ?? 0, input.period),
        N04: detail('N04', values.N04 ?? null, weights.N04 ?? 0, input.period),
        N08: detail('N08', values.N08 ?? null, weights.N08 ?? 0, input.period),
        N09: detail('N09', values.N09 ?? null, weights.N09 ?? 0, input.period),
        F03: detail('F03', values.F03 ?? null, weights.F03 ?? 0, input.period),
        bucket: 'bajo',
        coverage_pct,
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            data_freshness_days: input.data_freshness_days,
            coverage_pct,
            sample_size: input.sample_size ?? count,
            methodology_maturity: 78,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          fallback_reason: criticalMissingRaw ? 'critical_dep_missing' : 'coverage_below_min',
          weights_used: weights,
          missing_components: missing,
        },
      },
      trend_vs_previous: null,
    };
  }

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
      F08: detail('F08', values.F08 ?? null, weights.F08 ?? 0, input.period),
      F02_inv: detail('F02', values.F02_inv ?? null, weights.F02_inv ?? 0, input.period),
      N04: detail('N04', values.N04 ?? null, weights.N04 ?? 0, input.period),
      N08: detail('N08', values.N08 ?? null, weights.N08 ?? 0, input.period),
      N09: detail('N09', values.N09 ?? null, weights.N09 ?? 0, input.period),
      F03: detail('F03', values.F03 ?? null, weights.F03 ?? 0, input.period),
      bucket: bucketFor(value),
      coverage_pct,
      _meta: {
        confidence_breakdown: buildConfidenceBreakdown({
          data_freshness_days: input.data_freshness_days,
          coverage_pct,
          sample_size: input.sample_size ?? count,
          methodology_maturity: 78,
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
  if (confidence === 'insufficient_data') return 'ie.index.yng.insufficient';
  if (value >= 80) return 'ie.index.yng.excelente';
  if (value >= 60) return 'ie.index.yng.alto';
  if (value >= 40) return 'ie.index.yng.regular';
  return 'ie.index.yng.bajo';
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

export const dmxYngCalculator: Calculator = {
  scoreId: 'DMX-YNG',
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
        components: { reason: 'DMX-YNG requiere zoneId.' },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'zone_scores:YNG_deps', count: 0 }],
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
        .in('score_type', YNG_FETCH_DEPS as readonly string[]);

      if (data) {
        const rows = data as unknown as ZoneScoreRow[];
        for (const row of rows) {
          if (!YNG_FETCH_DEPS.includes(row.score_type as (typeof YNG_FETCH_DEPS)[number])) continue;
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
      // swallow
    }

    const previous_value = await fetchPreviousSnapshot(
      supabase,
      'zone',
      input.zoneId,
      'DMX-YNG',
      input.periodDate,
    );

    const result = computeDmxYng({
      subscores,
      period: input.periodDate,
      data_freshness_days: maxFreshnessDays,
      sample_size: fetched,
      previous_value,
      shadow_mode,
    });

    if (audit_log) {
      const auditParams: AuditLogParams = {
        score_id: 'DMX-YNG',
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
      citations: YNG_FETCH_DEPS.map((d) => ({
        source: `zone_scores:${d}`,
        period: input.periodDate,
      })),
      ...(result.trend_vs_previous !== null ? { trend_vs_previous: result.trend_vs_previous } : {}),
      ...(dir !== undefined ? { trend_direction: dir } : {}),
      provenance: {
        sources: YNG_FETCH_DEPS.map((d) => ({
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

export default dmxYngCalculator;
