// DMX-FAM — Zona Familiar (padres con hijos).
// Plan FASE 11 XL. score_id 'DMX-FAM', tier 3, category 'agregado'.
//
// FÓRMULA:
//   FAM = N02·0.30 + F01·0.25 + N08·0.20 + N03·0.10 + N10·0.10 + N07_inv·0.05
// N07_inv = 100 − N07 (menos ruido → mejor para familias).
//
// Critical deps: N02 (equipamiento educativo 30%), F01 (seguridad 25%).

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

// Internamente trabajamos con N07_inv como componente derivado, pero la BD
// provee N07 raw y lo invertimos dentro del calculator.
export const DEFAULT_FAM_WEIGHTS: Readonly<Record<string, number>> = {
  N02: 0.3,
  F01: 0.25,
  N08: 0.2,
  N03: 0.1,
  N10: 0.1,
  N07_inv: 0.05,
} as const;

export const FAM_FETCH_DEPS: readonly string[] = [
  'N02',
  'F01',
  'N08',
  'N03',
  'N10',
  'N07',
] as const;
export const FAM_COMPONENT_KEYS: readonly string[] = [
  'N02',
  'F01',
  'N08',
  'N03',
  'N10',
  'N07_inv',
] as const;

export const CRITICAL_DEPS: readonly string[] = ['N02', 'F01'] as const;

export const methodology = {
  formula: 'FAM = N02·0.30 + F01·0.25 + N08·0.20 + N03·0.10 + N10·0.10 + (100−N07)·0.05',
  sources: FAM_FETCH_DEPS.map((d) => `zone_scores:${d}`),
  dependencies: [
    { score_id: 'N02', weight: 0.3, role: 'equipamiento_educativo', critical: true },
    { score_id: 'F01', weight: 0.25, role: 'seguridad', critical: true },
    { score_id: 'N08', weight: 0.2, role: 'parques_areas_verdes', critical: false },
    { score_id: 'N03', weight: 0.1, role: 'salud_pediatria', critical: false },
    { score_id: 'N10', weight: 0.1, role: 'calidad_aire', critical: false },
    { score_id: 'N07', weight: 0.05, role: 'ruido_inverso', critical: false, inverted: true },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-FAM Zona Familiar',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-fam',
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
    { dimension_id: 'N02', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'F01', impact_pct_per_10pct_change: 2.5 },
  ],
} as const;

export const reasoning_template =
  'Familiar Index {zone_id}: {score_value}/100 (N02={n02}, F01={f01}). Confianza {confidence}.';

export type FamBucket = 'bajo' | 'regular' | 'alto' | 'excelente';

export interface FamComponents extends Record<string, unknown> {
  readonly N02: IndexComponentDetail | null;
  readonly F01: IndexComponentDetail | null;
  readonly N08: IndexComponentDetail | null;
  readonly N03: IndexComponentDetail | null;
  readonly N10: IndexComponentDetail | null;
  readonly N07_inv: IndexComponentDetail | null;
  readonly bucket: FamBucket;
  readonly coverage_pct: number;
  readonly _meta: IndicesMeta;
}

export interface FamRawInput {
  readonly subscores: Readonly<Record<string, number | null>>;
  readonly period: string;
  readonly data_freshness_days?: number | undefined;
  readonly sample_size?: number | undefined;
  readonly previous_value?: number | null | undefined;
  readonly shadow_mode?: boolean | undefined;
  readonly weights_override?: Readonly<Record<string, number>> | undefined;
}

export interface FamComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: FamComponents;
  readonly trend_vs_previous: number | null;
}

function bucketFor(value: number): FamBucket {
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

export function computeDmxFam(input: FamRawInput): FamComputeResult {
  const weights = { ...DEFAULT_FAM_WEIGHTS, ...(input.weights_override ?? {}) };

  // Derivar N07_inv desde N07 raw.
  const n07Raw = input.subscores.N07;
  const n07Inv =
    n07Raw !== null && n07Raw !== undefined && Number.isFinite(n07Raw)
      ? clamp100(100 - n07Raw)
      : null;

  const values: Record<string, number | null> = {
    N02: input.subscores.N02 ?? null,
    F01: input.subscores.F01 ?? null,
    N08: input.subscores.N08 ?? null,
    N03: input.subscores.N03 ?? null,
    N10: input.subscores.N10 ?? null,
    N07_inv: n07Inv,
  };

  const missing: string[] = [];
  let weighted_sum = 0;
  let weight_sum_used = 0;
  let count = 0;

  for (const k of FAM_COMPONENT_KEYS) {
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

  const total_possible = FAM_COMPONENT_KEYS.length;
  const available = total_possible - missing.length;
  const coverage_pct = Math.round((available / total_possible) * 100);

  const criticalMissing = CRITICAL_DEPS.some((d) => missing.includes(d));

  if (criticalMissing || coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        N02: detail('N02', values.N02 ?? null, weights.N02 ?? 0, input.period),
        F01: detail('F01', values.F01 ?? null, weights.F01 ?? 0, input.period),
        N08: detail('N08', values.N08 ?? null, weights.N08 ?? 0, input.period),
        N03: detail('N03', values.N03 ?? null, weights.N03 ?? 0, input.period),
        N10: detail('N10', values.N10 ?? null, weights.N10 ?? 0, input.period),
        N07_inv: detail('N07', values.N07_inv ?? null, weights.N07_inv ?? 0, input.period),
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
          fallback_reason: criticalMissing ? 'critical_dep_missing' : 'coverage_below_min',
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
      N02: detail('N02', values.N02 ?? null, weights.N02 ?? 0, input.period),
      F01: detail('F01', values.F01 ?? null, weights.F01 ?? 0, input.period),
      N08: detail('N08', values.N08 ?? null, weights.N08 ?? 0, input.period),
      N03: detail('N03', values.N03 ?? null, weights.N03 ?? 0, input.period),
      N10: detail('N10', values.N10 ?? null, weights.N10 ?? 0, input.period),
      N07_inv: detail('N07', values.N07_inv ?? null, weights.N07_inv ?? 0, input.period),
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
  if (confidence === 'insufficient_data') return 'ie.index.fam.insufficient';
  if (value >= 80) return 'ie.index.fam.excelente';
  if (value >= 60) return 'ie.index.fam.alto';
  if (value >= 40) return 'ie.index.fam.regular';
  return 'ie.index.fam.bajo';
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

export const dmxFamCalculator: Calculator = {
  scoreId: 'DMX-FAM',
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
        components: { reason: 'DMX-FAM requiere zoneId.' },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'zone_scores:FAM_deps', count: 0 }],
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
        .in('score_type', FAM_FETCH_DEPS as readonly string[]);

      if (data) {
        const rows = data as unknown as ZoneScoreRow[];
        for (const row of rows) {
          if (!FAM_FETCH_DEPS.includes(row.score_type as (typeof FAM_FETCH_DEPS)[number])) continue;
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
      'DMX-FAM',
      input.periodDate,
    );

    const result = computeDmxFam({
      subscores,
      period: input.periodDate,
      data_freshness_days: maxFreshnessDays,
      sample_size: fetched,
      previous_value,
      shadow_mode,
    });

    if (audit_log) {
      const auditParams: AuditLogParams = {
        score_id: 'DMX-FAM',
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
      citations: FAM_FETCH_DEPS.map((d) => ({
        source: `zone_scores:${d}`,
        period: input.periodDate,
      })),
      ...(result.trend_vs_previous !== null ? { trend_vs_previous: result.trend_vs_previous } : {}),
      ...(dir !== undefined ? { trend_direction: dir } : {}),
      provenance: {
        sources: FAM_FETCH_DEPS.map((d) => ({
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

export default dmxFamCalculator;
