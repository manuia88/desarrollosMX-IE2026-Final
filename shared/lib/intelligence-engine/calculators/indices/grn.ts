// DMX-GRN — Zona Verde / Sustentable.
// Plan FASE 11 XL. score_id 'DMX-GRN', tier 3, category 'agregado'.
//
// FÓRMULA:
//   GRN = N10·0.25 + N05·0.20 + N08·0.20 + F06·0.15 + H01_green·0.10 + F04·0.10
//
// PROXIES H1 (documentar en findings):
//   - H01_green no existe como score (propósito: "edificios certificados LEED/
//     EDGE"). Usamos N08 (parques+áreas verdes) como proxy — marcado en
//     components._meta.limitation. Migración definitiva FASE 27+.
//   - F04 en registry = Air Quality (no Energía limpia). Reutilizamos F04
//     fetched — en la práctica captura el componente ambiental. Marcado
//     limitation: 'F04_air_quality_proxy_for_clean_energy'.
//   - Si H01_green proxy (N08) no existe → peso H01_green se redistribuye.
//   - Si F04 no existe → peso F04 se redistribuye.
//
// Critical deps: N10 (aire 25%), N08 (parques 20%) — 45% combinado.

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

export const DEFAULT_GRN_WEIGHTS: Readonly<Record<string, number>> = {
  N10: 0.25,
  N05: 0.2,
  N08: 0.2,
  F06: 0.15,
  H01_green: 0.1, // proxy = N08 (re-uso del mismo valor) por limitation H1
  F04: 0.1, // proxy = Air Quality por limitation H1
} as const;

// Fetch set: inclui N08 (también sirve como proxy H01_green).
export const GRN_FETCH_DEPS: readonly string[] = ['N10', 'N05', 'N08', 'F06', 'F04'] as const;
export const GRN_COMPONENT_KEYS: readonly string[] = [
  'N10',
  'N05',
  'N08',
  'F06',
  'H01_green',
  'F04',
] as const;

// N10 (aire) y N08 (parques) mandatory — driver verde principal.
export const CRITICAL_DEPS: readonly string[] = ['N10', 'N08'] as const;

export const methodology = {
  formula: 'GRN = N10·0.25 + N05·0.20 + N08·0.20 + F06·0.15 + H01_green·0.10 + F04·0.10',
  sources: GRN_FETCH_DEPS.map((d) => `zone_scores:${d}`),
  dependencies: [
    { score_id: 'N10', weight: 0.25, role: 'calidad_aire', critical: true },
    { score_id: 'N05', weight: 0.2, role: 'agua_disponible', critical: false },
    { score_id: 'N08', weight: 0.2, role: 'parques_areas_verdes', critical: true },
    { score_id: 'F06', weight: 0.15, role: 'infraestructura_moderna', critical: false },
    {
      score_id: 'H01_green',
      weight: 0.1,
      role: 'edificios_certificados',
      critical: false,
      proxy: 'N08',
      limitation: 'no_direct_leed_edge_score_h1',
    },
    {
      score_id: 'F04',
      weight: 0.1,
      role: 'energia_limpia',
      critical: false,
      limitation: 'f04_is_air_quality_proxy_for_clean_energy',
    },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-GRN Zona Verde',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-grn',
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
    { dimension_id: 'N10', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'N08', impact_pct_per_10pct_change: 2.0 },
  ],
} as const;

export const reasoning_template =
  'Green Index {zone_id}: {score_value}/100. Cobertura {coverage_pct}%. Confianza {confidence}.';

export type GrnBucket = 'bajo' | 'regular' | 'alto' | 'excelente';

export interface GrnComponents extends Record<string, unknown> {
  readonly N10: IndexComponentDetail | null;
  readonly N05: IndexComponentDetail | null;
  readonly N08: IndexComponentDetail | null;
  readonly F06: IndexComponentDetail | null;
  readonly H01_green: IndexComponentDetail | null;
  readonly F04: IndexComponentDetail | null;
  readonly bucket: GrnBucket;
  readonly coverage_pct: number;
  readonly _meta: IndicesMeta;
}

export interface GrnRawInput {
  readonly subscores: Readonly<Record<string, number | null>>;
  readonly period: string;
  readonly data_freshness_days?: number | undefined;
  readonly sample_size?: number | undefined;
  readonly previous_value?: number | null | undefined;
  readonly shadow_mode?: boolean | undefined;
  readonly weights_override?: Readonly<Record<string, number>> | undefined;
}

export interface GrnComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: GrnComponents;
  readonly trend_vs_previous: number | null;
}

function bucketFor(value: number): GrnBucket {
  if (value >= 80) return 'excelente';
  if (value >= 60) return 'alto';
  if (value >= 40) return 'regular';
  return 'bajo';
}

// _depId preservado por simetría con fam/yng/liv (signature consistente) aunque
// en GRN la citation del proxy difiere del key lógico (H01_green cita N08).
function detail(
  _depId: string,
  citationId: string,
  value: number | null,
  weight: number,
  period: string,
): IndexComponentDetail | null {
  if (value === null || !Number.isFinite(value)) return null;
  return {
    value,
    weight,
    citation_source: `zone_scores:${citationId}`,
    citation_period: period,
  };
}

export function computeDmxGrn(input: GrnRawInput): GrnComputeResult {
  const weights = { ...DEFAULT_GRN_WEIGHTS, ...(input.weights_override ?? {}) };

  // H01_green proxy = N08 (copia el valor, limitation documentada en _meta).
  const n08 = input.subscores.N08;
  const h01GreenProxy = n08 !== null && n08 !== undefined && Number.isFinite(n08) ? n08 : null;

  const values: Record<string, number | null> = {
    N10: input.subscores.N10 ?? null,
    N05: input.subscores.N05 ?? null,
    N08: input.subscores.N08 ?? null,
    F06: input.subscores.F06 ?? null,
    H01_green: h01GreenProxy,
    F04: input.subscores.F04 ?? null,
  };

  const missing: string[] = [];
  let weighted_sum = 0;
  let weight_sum_used = 0;
  let count = 0;

  for (const k of GRN_COMPONENT_KEYS) {
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

  const total_possible = GRN_COMPONENT_KEYS.length;
  const available = total_possible - missing.length;
  const coverage_pct = Math.round((available / total_possible) * 100);

  const criticalMissing = CRITICAL_DEPS.some((d) => missing.includes(d));

  if (criticalMissing || coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        N10: detail('N10', 'N10', values.N10 ?? null, weights.N10 ?? 0, input.period),
        N05: detail('N05', 'N05', values.N05 ?? null, weights.N05 ?? 0, input.period),
        N08: detail('N08', 'N08', values.N08 ?? null, weights.N08 ?? 0, input.period),
        F06: detail('F06', 'F06', values.F06 ?? null, weights.F06 ?? 0, input.period),
        H01_green: detail(
          'H01_green',
          'N08',
          values.H01_green ?? null,
          weights.H01_green ?? 0,
          input.period,
        ),
        F04: detail('F04', 'F04', values.F04 ?? null, weights.F04 ?? 0, input.period),
        bucket: 'bajo',
        coverage_pct,
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            data_freshness_days: input.data_freshness_days,
            coverage_pct,
            sample_size: input.sample_size ?? count,
            methodology_maturity: 70,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          fallback_reason: criticalMissing ? 'critical_dep_missing' : 'coverage_below_min',
          weights_used: weights,
          missing_components: missing,
          limitation:
            'H01_green=proxy(N08); F04=air_quality_proxy_for_clean_energy; review FASE 27+.',
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
      N10: detail('N10', 'N10', values.N10 ?? null, weights.N10 ?? 0, input.period),
      N05: detail('N05', 'N05', values.N05 ?? null, weights.N05 ?? 0, input.period),
      N08: detail('N08', 'N08', values.N08 ?? null, weights.N08 ?? 0, input.period),
      F06: detail('F06', 'F06', values.F06 ?? null, weights.F06 ?? 0, input.period),
      H01_green: detail(
        'H01_green',
        'N08',
        values.H01_green ?? null,
        weights.H01_green ?? 0,
        input.period,
      ),
      F04: detail('F04', 'F04', values.F04 ?? null, weights.F04 ?? 0, input.period),
      bucket: bucketFor(value),
      coverage_pct,
      _meta: {
        confidence_breakdown: buildConfidenceBreakdown({
          data_freshness_days: input.data_freshness_days,
          coverage_pct,
          sample_size: input.sample_size ?? count,
          methodology_maturity: 70,
        }),
        circuit_breaker_triggered,
        shadow: input.shadow_mode ?? false,
        weights_used: weights,
        missing_components: missing,
        redistributed_weights: missing.length > 0,
        limitation:
          'H01_green=proxy(N08); F04=air_quality_proxy_for_clean_energy; review FASE 27+.',
      },
    },
    trend_vs_previous,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.index.grn.insufficient';
  if (value >= 80) return 'ie.index.grn.excelente';
  if (value >= 60) return 'ie.index.grn.alto';
  if (value >= 40) return 'ie.index.grn.regular';
  return 'ie.index.grn.bajo';
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

export const dmxGrnCalculator: Calculator = {
  scoreId: 'DMX-GRN',
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
        components: { reason: 'DMX-GRN requiere zoneId.' },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'zone_scores:GRN_deps', count: 0 }],
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
        .in('score_type', GRN_FETCH_DEPS as readonly string[]);

      if (data) {
        const rows = data as unknown as ZoneScoreRow[];
        for (const row of rows) {
          if (!GRN_FETCH_DEPS.includes(row.score_type as (typeof GRN_FETCH_DEPS)[number])) continue;
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
      'DMX-GRN',
      input.periodDate,
    );

    const result = computeDmxGrn({
      subscores,
      period: input.periodDate,
      data_freshness_days: maxFreshnessDays,
      sample_size: fetched,
      previous_value,
      shadow_mode,
    });

    if (audit_log) {
      const auditParams: AuditLogParams = {
        score_id: 'DMX-GRN',
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
      citations: GRN_FETCH_DEPS.map((d) => ({
        source: `zone_scores:${d}`,
        period: input.periodDate,
      })),
      ...(result.trend_vs_previous !== null ? { trend_vs_previous: result.trend_vs_previous } : {}),
      ...(dir !== undefined ? { trend_direction: dir } : {}),
      provenance: {
        sources: GRN_FETCH_DEPS.map((d) => ({
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

export default dmxGrnCalculator;
