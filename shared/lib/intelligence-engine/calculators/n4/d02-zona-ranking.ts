// D02 Zona Ranking — score N4 público compuesto multi-índice.
// Combina DMX-IPV (Índice Precio-Valor) + DMX-LIV (Livability).
// Weights ADR-026 founder: D02 = IPV×0.6 + LIV×0.4.
// Público (sin tenant_scope_required). Tier 3. Categoría zona.
//
// DMX-IPV = F08×0.30 + F09×0.25 + N11×0.20 + A12×0.15 + N01×0.10
// DMX-LIV = F08×0.30 + N08×0.15 + N01×0.10 + N10×0.05 + N07×0.10
//         + H01×0.10 + H02×0.05 + N02×0.10 + N04×0.05

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const IPV_WEIGHTS = {
  F08: 0.3,
  F09: 0.25,
  N11: 0.2,
  A12: 0.15,
  N01: 0.1,
} as const;

export const LIV_WEIGHTS = {
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

export const COMPOSITE_WEIGHTS = { ipv: 0.6, liv: 0.4 } as const;

export const methodology = {
  formula:
    'D02 = DMX-IPV × 0.6 + DMX-LIV × 0.4. IPV = F08×0.30 + F09×0.25 + N11×0.20 + A12×0.15 + N01×0.10. LIV = F08×0.30 + N08×0.15 + N01×0.10 + N10×0.05 + N07×0.10 + H01×0.10 + H02×0.05 + N02×0.10 + N04×0.05. Renormaliza weights si faltan dimensiones.',
  sources: [
    'zone_scores:F08',
    'zone_scores:F09',
    'zone_scores:N11',
    'zone_scores:A12',
    'zone_scores:N01',
    'zone_scores:N08',
    'zone_scores:N10',
    'zone_scores:N07',
    'zone_scores:H01',
    'zone_scores:H02',
    'zone_scores:N02',
    'zone_scores:N04',
  ],
  dependencies: [
    { score_id: 'F08', weight: 0.3, role: 'livability_baseline_both', critical: true },
    { score_id: 'F09', weight: 0.25, role: 'ipv_value_anchor', critical: true },
    { score_id: 'N11', weight: 0.2, role: 'ipv_investment', critical: false },
    { score_id: 'A12', weight: 0.15, role: 'ipv_market_velocity', critical: false },
    { score_id: 'N01', weight: 0.1, role: 'diversity', critical: false },
    { score_id: 'N08', weight: 0.15, role: 'walkability', critical: false },
    { score_id: 'N10', weight: 0.05, role: 'cycling_infra', critical: false },
    { score_id: 'N07', weight: 0.1, role: 'amenities_density', critical: false },
    { score_id: 'H01', weight: 0.1, role: 'schools', critical: false },
    { score_id: 'H02', weight: 0.05, role: 'hospitals', critical: false },
    { score_id: 'N02', weight: 0.1, role: 'green_spaces', critical: false },
    { score_id: 'N04', weight: 0.05, role: 'community_cohesion', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §D02 Zona Ranking',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#d02-zona-ranking',
    },
    { name: 'Plan FASE 10 §10.C.D02', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
    {
      name: 'ADR-026 Composite Weights IPV/LIV',
      url: 'docs/01_DECISIONES_ARQUITECTONICAS/ADR-026_COMPOSITE_RANKING_WEIGHTS.md',
    },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 90 },
  sensitivity_analysis: [
    { dimension_id: 'F08', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'F09', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'N11', impact_pct_per_10pct_change: 2.0 },
  ],
  composite_weights: COMPOSITE_WEIGHTS,
} as const;

export const reasoning_template =
  'Zona Ranking {zone_id}: {score_value}/100. IPV={ipv_component}, LIV={liv_component}. Rank {rank}/{total_zones} (percentil {percentile_country}).';

export interface D02RankingContext {
  readonly rank?: number | null;
  readonly total_zones?: number | null;
  readonly percentile_country?: number | null;
  readonly peer_zones?: readonly string[];
}

export interface D02RawInput {
  readonly scores: Readonly<Record<string, number | null>>;
  readonly context?: D02RankingContext;
}

export interface D02Components extends Record<string, unknown> {
  readonly rank: number | null;
  readonly total_zones: number | null;
  readonly ipv_component: number;
  readonly liv_component: number;
  readonly percentile_country: number | null;
  readonly peer_zones: readonly string[];
  readonly ipv_weights_applied: Readonly<Record<string, number>>;
  readonly liv_weights_applied: Readonly<Record<string, number>>;
  readonly missing_dimensions: readonly string[];
  readonly coverage_pct: number;
}

export interface D02ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: D02Components;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

// Subindex computa un índice (IPV o LIV) con renormalization de weights
// cuando faltan dimensiones. Retorna {value, weights_used, missing}.
function computeSubindex(
  scores: Readonly<Record<string, number | null>>,
  weights: Readonly<Record<string, number>>,
): {
  value: number;
  weights_used: Record<string, number>;
  missing: string[];
  available_dims: number;
  total_dims: number;
} {
  const missing: string[] = [];
  const availableWeights: Record<string, number> = {};
  let sumAvailable = 0;

  for (const [dim, w] of Object.entries(weights)) {
    const raw = scores[dim];
    if (raw === null || raw === undefined || !Number.isFinite(raw)) {
      missing.push(dim);
    } else {
      availableWeights[dim] = w;
      sumAvailable += w;
    }
  }

  const weights_used: Record<string, number> = {};
  if (sumAvailable > 0) {
    for (const [k, w] of Object.entries(availableWeights)) {
      weights_used[k] = Number((w / sumAvailable).toFixed(6));
    }
  }

  let weighted_sum = 0;
  for (const [dim, w] of Object.entries(weights_used)) {
    const raw = scores[dim];
    if (raw !== null && raw !== undefined && Number.isFinite(raw)) {
      weighted_sum += raw * w;
    }
  }

  const total_dims = Object.keys(weights).length;
  const available_dims = total_dims - missing.length;

  return {
    value: clamp100(weighted_sum),
    weights_used,
    missing,
    available_dims,
    total_dims,
  };
}

export function computeD02ZonaRanking(input: D02RawInput): D02ComputeResult {
  const ipv = computeSubindex(input.scores, IPV_WEIGHTS);
  const liv = computeSubindex(input.scores, LIV_WEIGHTS);

  // Coverage global: unión de dims únicas entre IPV y LIV.
  const allDims = new Set([...Object.keys(IPV_WEIGHTS), ...Object.keys(LIV_WEIGHTS)]);
  const allMissing = new Set<string>();
  for (const d of ipv.missing) allMissing.add(d);
  for (const d of liv.missing) allMissing.add(d);
  // Filtrar dims que están missing en AMBOS (si solo falta en uno, todavía se usa en el otro).
  const missingInBoth = [...allMissing].filter(
    (d) =>
      (ipv.missing.includes(d) || !(d in IPV_WEIGHTS)) &&
      (liv.missing.includes(d) || !(d in LIV_WEIGHTS)),
  );
  const totalUniqueDims = allDims.size;
  const availableUniqueDims = totalUniqueDims - missingInBoth.length;
  const coverage_pct = Math.round((availableUniqueDims / totalUniqueDims) * 100);

  // Si ambos subíndices pierden >50% de sus dims o coverage global <50% → insufficient.
  const ipv_coverage = (ipv.available_dims / ipv.total_dims) * 100;
  const liv_coverage = (liv.available_dims / liv.total_dims) * 100;

  if (
    coverage_pct < methodology.confidence_thresholds.min_coverage_pct ||
    ipv_coverage < 50 ||
    liv_coverage < 50
  ) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        rank: input.context?.rank ?? null,
        total_zones: input.context?.total_zones ?? null,
        ipv_component: 0,
        liv_component: 0,
        percentile_country: input.context?.percentile_country ?? null,
        peer_zones: input.context?.peer_zones ?? [],
        ipv_weights_applied: {},
        liv_weights_applied: {},
        missing_dimensions: missingInBoth,
        coverage_pct,
      },
    };
  }

  const composite = ipv.value * COMPOSITE_WEIGHTS.ipv + liv.value * COMPOSITE_WEIGHTS.liv;
  const value = Math.round(clamp100(composite));

  const confidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';

  return {
    value,
    confidence,
    components: {
      rank: input.context?.rank ?? null,
      total_zones: input.context?.total_zones ?? null,
      ipv_component: Number(ipv.value.toFixed(2)),
      liv_component: Number(liv.value.toFixed(2)),
      percentile_country: input.context?.percentile_country ?? null,
      peer_zones: input.context?.peer_zones ?? [],
      ipv_weights_applied: ipv.weights_used,
      liv_weights_applied: liv.weights_used,
      missing_dimensions: missingInBoth,
      coverage_pct,
    },
  };
}

export function getLabelKey(
  value: number,
  confidence: Confidence,
  percentile?: number | null,
): string {
  if (confidence === 'insufficient_data') return 'ie.score.d02.insufficient';
  const p = typeof percentile === 'number' ? percentile : null;
  if (p !== null) {
    if (p >= 90) return 'ie.score.d02.top_decil';
    if (p >= 75) return 'ie.score.d02.top_cuartil';
    if (p >= 40) return 'ie.score.d02.medio';
    return 'ie.score.d02.bajo';
  }
  // Fallback por value absoluto si no hay percentile país.
  if (value >= 80) return 'ie.score.d02.top_decil';
  if (value >= 65) return 'ie.score.d02.top_cuartil';
  if (value >= 40) return 'ie.score.d02.medio';
  return 'ie.score.d02.bajo';
}

export const d02ZonaRankingCalculator: Calculator = {
  scoreId: 'D02',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const confidence: Confidence = 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence, null),
      components: {
        reason: 'prod path stub — invocar computeD02ZonaRanking directo',
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'zone_scores:F08', period: input.periodDate },
        { source: 'zone_scores:F09', period: input.periodDate },
        { source: 'zone_scores:N11', period: input.periodDate },
        { source: 'zone_scores:A12', period: input.periodDate },
        { source: 'zone_scores:N01', period: input.periodDate },
        { source: 'zone_scores:N08', period: input.periodDate },
        { source: 'zone_scores:N07', period: input.periodDate },
        { source: 'zone_scores:H01', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:F08', count: 0 },
          { name: 'zone_scores:F09', count: 0 },
          { name: 'zone_scores:N11', count: 0 },
          { name: 'zone_scores:A12', count: 0 },
          { name: 'zone_scores:N08', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zone_id: input.zoneId ?? 'desconocido',
        ipv_component: 0,
        liv_component: 0,
        rank: 0,
        total_zones: 0,
        percentile_country: 0,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default d02ZonaRankingCalculator;
