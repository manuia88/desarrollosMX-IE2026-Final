// DMX-MOM — Momentum Index mensual publicable (B2B: fondos + bancos).
// Plan FASE 11 §11.XL. Registry entry: score_id 'DMX-MOM', tier 3, category
// 'agregado', dependencies: ['N11']. Eleva N11 (momentum base por zona) a un
// índice mensual comparable percentil vs universo CDMX.
//
// FÓRMULA:
//   MOM = percentile_cdmx(N11_colonia)
//       = rank(N11_colonia) / total_colonias × 100
//
// UPGRADES FASE 11 XL (ver methodology.references):
//   - Explainability: components cada pieza con citation_source + citation_period.
//   - Confidence granular 0-100 en components._meta.confidence_breakdown.
//   - Audit log hook: params.audit_log → best-effort insert dmx_indices_audit_log.
//   - Circuit breaker: Δ>20% vs último snapshot → flag components._meta.circuit_breaker_triggered.
//   - Shadow mode: params.shadow_mode → flag components._meta.shadow.
//   - Nowcasting: params.nowcast → usar partial period data y flag nowcast_partial.
//
// Missing data strategy:
//   - N11 (critical, 100% peso) missing → confidence='insufficient_data', skip cálculo.
//   - Si rank-universe <20 zonas (país chico o bug ingesta) → confidence='low'.
//
// Tests cubren: happy, missing N11, edge 0/100, circuit breaker, trend, nowcast.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';
import {
  type AuditLogParams,
  buildConfidenceBreakdown,
  clamp100,
  detectCircuitBreaker,
  fetchPreviousSnapshot,
  type IndicesMeta,
  tryInsertAuditLog,
} from './shared';

export const version = '1.0.0';

export const DEFAULT_MOM_WEIGHTS: Readonly<Record<string, number>> = {
  N11: 1.0,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['N11'] as const;

export const methodology = {
  formula: 'MOM = rank(N11_colonia) / total_colonias × 100 (percentile vs universo país).',
  sources: ['zone_scores:N11'],
  dependencies: [{ score_id: 'N11', weight: 1.0, role: 'momentum_base', critical: true }],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-MOM Momentum Index',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-mom-momentum-index-nuevo-v4',
    },
    {
      name: 'Plan FASE 11 XL DMX Indices',
      url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md',
    },
  ],
  validity: { unit: 'months', value: 1 } as const,
  confidence_thresholds: {
    min_universe_size: 20,
    high_universe_size: 100,
    max_data_age_days: 90,
    circuit_breaker_pct: 20,
  },
  sensitivity_analysis: [{ dimension_id: 'N11', impact_pct_per_10pct_change: 10.0 }],
} as const;

export const reasoning_template =
  'Momentum Index {zone_id}: percentil {score_value}/100 vs {total_colonias} colonias. Confianza {confidence}.';

export type MomBucket = 'rezagado' | 'estable' | 'acelerando' | 'lider';

export interface MomComponentDetail extends Record<string, unknown> {
  readonly value: number;
  readonly weight: number;
  readonly citation_source: string;
  readonly citation_period: string;
}

export interface MomComponents extends Record<string, unknown> {
  readonly n11_base: MomComponentDetail | null;
  readonly percentile_cdmx: number | null;
  readonly rank: number | null;
  readonly total_colonias: number;
  readonly bucket: MomBucket;
  readonly _meta: IndicesMeta;
}

export interface MomRawInput {
  readonly n11_value: number | null;
  readonly universe_values: readonly number[];
  readonly universe_period: string;
  readonly previous_value?: number | null | undefined;
  readonly data_freshness_days?: number | undefined;
  readonly sample_size?: number | undefined;
  readonly nowcast_periods_covered?: number | undefined;
  readonly shadow_mode?: boolean | undefined;
  readonly nowcast?: boolean | undefined;
}

export interface MomComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: MomComponents;
  readonly trend_vs_previous: number | null;
}

function bucketFor(value: number): MomBucket {
  if (value >= 80) return 'lider';
  if (value >= 60) return 'acelerando';
  if (value >= 40) return 'estable';
  return 'rezagado';
}

export function computeDmxMom(input: MomRawInput): MomComputeResult {
  const n11 = input.n11_value;
  const universe = input.universe_values.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  const total_colonias = universe.length;

  // Critical missing → insufficient_data.
  if (n11 === null || !Number.isFinite(n11)) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        n11_base: null,
        percentile_cdmx: null,
        rank: null,
        total_colonias,
        bucket: 'rezagado',
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            data_freshness_days: input.data_freshness_days,
            coverage_pct: 0,
            sample_size: input.sample_size ?? total_colonias,
            methodology_maturity: 85,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          nowcast_partial: input.nowcast ?? false,
          periods_covered: input.nowcast_periods_covered,
        },
      },
      trend_vs_previous: null,
    };
  }

  // Universe sanity check.
  if (total_colonias < methodology.confidence_thresholds.min_universe_size) {
    const fallbackPercentile = clamp100(n11);
    return {
      value: Math.round(fallbackPercentile),
      confidence: 'low',
      components: {
        n11_base: {
          value: n11,
          weight: DEFAULT_MOM_WEIGHTS.N11 ?? 1,
          citation_source: 'zone_scores:N11',
          citation_period: input.universe_period,
        },
        percentile_cdmx: fallbackPercentile,
        rank: null,
        total_colonias,
        bucket: bucketFor(fallbackPercentile),
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            data_freshness_days: input.data_freshness_days,
            coverage_pct: 100,
            sample_size: total_colonias,
            methodology_maturity: 85,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          nowcast_partial: input.nowcast ?? false,
          periods_covered: input.nowcast_periods_covered,
          fallback_reason: 'universe_below_min',
        },
      },
      trend_vs_previous: null,
    };
  }

  // Rank: 1-indexed position del valor self contando cuántos valores son ≤ n11.
  // Sort ascendente, rank = índice (inclusive) del último elemento ≤ n11.
  const sorted = [...universe].sort((a, b) => a - b);
  let rank = 0;
  for (const v of sorted) {
    if (v <= n11) rank += 1;
  }
  // Evita degenerar rank=0 cuando n11 es outlier bajo.
  if (rank === 0) rank = 1;
  const percentile = clamp100((rank / total_colonias) * 100);
  const value = Math.round(percentile);

  const trend_vs_previous =
    input.previous_value !== undefined && input.previous_value !== null
      ? Number((value - input.previous_value).toFixed(2))
      : null;

  const circuit_breaker_triggered = detectCircuitBreaker(
    value,
    input.previous_value ?? null,
    methodology.confidence_thresholds.circuit_breaker_pct,
  );

  const confidence: Confidence =
    total_colonias >= methodology.confidence_thresholds.high_universe_size ? 'high' : 'medium';

  return {
    value,
    confidence,
    components: {
      n11_base: {
        value: n11,
        weight: DEFAULT_MOM_WEIGHTS.N11 ?? 1,
        citation_source: 'zone_scores:N11',
        citation_period: input.universe_period,
      },
      percentile_cdmx: Number(percentile.toFixed(2)),
      rank,
      total_colonias,
      bucket: bucketFor(value),
      _meta: {
        confidence_breakdown: buildConfidenceBreakdown({
          data_freshness_days: input.data_freshness_days,
          coverage_pct: 100,
          sample_size: total_colonias,
          methodology_maturity: 85,
        }),
        circuit_breaker_triggered,
        shadow: input.shadow_mode ?? false,
        nowcast_partial: input.nowcast ?? false,
        periods_covered: input.nowcast_periods_covered,
      },
    },
    trend_vs_previous,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.index.mom.insufficient';
  if (value >= 80) return 'ie.index.mom.lider';
  if (value >= 60) return 'ie.index.mom.acelerando';
  if (value >= 40) return 'ie.index.mom.estable';
  return 'ie.index.mom.rezagado';
}

function trendDirection(delta: number | null): 'mejorando' | 'estable' | 'empeorando' | undefined {
  if (delta === null) return undefined;
  if (delta > 1) return 'mejorando';
  if (delta < -1) return 'empeorando';
  return 'estable';
}

interface ZoneN11Row {
  readonly zone_id: string;
  readonly score_value: number | null;
  readonly computed_at: string | null;
}

export const dmxMomCalculator: Calculator = {
  scoreId: 'DMX-MOM',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const shadow_mode = params.shadow_mode === true;
    const nowcast = params.nowcast === true;
    const audit_log = params.audit_log === true;

    if (!input.zoneId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: {
          reason: 'DMX-MOM requiere zoneId para fetch N11 base.',
        },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'zone_scores:N11', count: 0 }],
          computed_at: computed_at.toISOString(),
          calculator_version: version,
        },
        valid_until: computeValidUntil(computed_at, methodology.validity),
      };
    }

    // Fetch universe (all colonias mismo country + period) + self N11.
    let n11_value: number | null = null;
    const universe_values: number[] = [];
    let fetched_at: string | null = null;

    try {
      const { data } = await (supabase as unknown as SupabaseClient<Record<string, unknown>>)
        .from('zone_scores' as never)
        .select('zone_id, score_value, computed_at')
        .eq('country_code', input.countryCode)
        .eq('score_type', 'N11')
        .eq('period_date', input.periodDate);

      if (data) {
        const rows = data as unknown as ZoneN11Row[];
        for (const row of rows) {
          if (typeof row.score_value !== 'number' || !Number.isFinite(row.score_value)) continue;
          universe_values.push(row.score_value);
          if (row.zone_id === input.zoneId) {
            n11_value = row.score_value;
            fetched_at = row.computed_at;
          }
        }
      }
    } catch {
      // swallow — degrada a insufficient_data abajo.
    }

    // Previous snapshot para trend + circuit breaker.
    const previous_value = await fetchPreviousSnapshot(
      supabase,
      'zone',
      input.zoneId,
      'DMX-MOM',
      input.periodDate,
    );

    const data_freshness_days = fetched_at
      ? Math.max(
          0,
          Math.floor((computed_at.getTime() - new Date(fetched_at).getTime()) / 86_400_000),
        )
      : undefined;

    const result = computeDmxMom({
      n11_value,
      universe_values,
      universe_period: input.periodDate,
      previous_value,
      ...(data_freshness_days !== undefined ? { data_freshness_days } : {}),
      sample_size: universe_values.length,
      ...(typeof params.periods_covered === 'number'
        ? { nowcast_periods_covered: params.periods_covered }
        : {}),
      shadow_mode,
      nowcast,
    });

    // Audit log hook (best-effort).
    if (audit_log) {
      const auditParams: AuditLogParams = {
        score_id: 'DMX-MOM',
        entity_type: 'zone',
        entity_id: input.zoneId,
        country_code: input.countryCode,
        period_date: input.periodDate,
        score_value: result.value,
        confidence: result.confidence,
        computed_at: computed_at.toISOString(),
        calculator_version: version,
        inputs_hash: String(universe_values.length),
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
        universe_size: universe_values.length,
        n11_present: n11_value !== null,
        shadow_mode,
        nowcast,
      },
      confidence: result.confidence,
      citations: [
        {
          source: 'zone_scores:N11',
          period: input.periodDate,
          count: universe_values.length,
        },
      ],
      ...(result.trend_vs_previous !== null ? { trend_vs_previous: result.trend_vs_previous } : {}),
      ...(dir !== undefined ? { trend_direction: dir } : {}),
      provenance: {
        sources: [
          {
            name: 'zone_scores:N11',
            period: input.periodDate,
            count: universe_values.length,
          },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zone_id: input.zoneId,
        total_colonias: universe_values.length,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default dmxMomCalculator;
