// H12 Zona Oportunidad — score N2 compuesto que identifica zonas ranked como
// "oportunidad de inversión" short/mid term. Combina F09 value + N11 momentum +
// A04 arbitrage. Plan FASE 10 §10.A.13. Catálogo 03.8 §H12. Tier 2. Categoría zona.
//
// FÓRMULA:
//   oportunidad_score = F09 · 0.40 + N11 · 0.35 + A04 · 0.25
//
// Semántica:
//   F09 (40%) → buen valor por dinero (calidad/precio)
//   N11 (35%) → momentum creciente (ojo compradores + demanda)
//   A04 (25%) → arbitraje precio vs zonas comparables
// Score alto = mejor combinación de valor + crecimiento + arbitraje.
//
// CATEGORIAS:
//   ≥75 oportunidad_alta   · ≥55 oportunidad_media · ≥35 estable · <35 declive
//
// RANKING NACIONAL:
//   Output incluye {position, total, percentile} dentro del país cuando se
//   proveen rankings_context. Percentile alto = top zonas del país.
//
// Critical deps (D13): F09 + N11. Si F09.confidence = low → H12.confidence cap
// a medium via propagateConfidence (D13 rule 2). A04 es supporting.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const WEIGHTS = {
  f09_value: 0.4,
  n11_momentum: 0.35,
  a04_arbitrage: 0.25,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['F09', 'N11'] as const;

export const CATEGORIA_THRESHOLDS = {
  oportunidad_alta: 75,
  oportunidad_media: 55,
  estable: 35,
} as const;

export const methodology = {
  formula:
    'oportunidad_score = F09 · 0.40 + N11 · 0.35 + A04 · 0.25. Categoría: ≥75 alta · ≥55 media · ≥35 estable · <35 declive.',
  sources: ['zone_scores:F09', 'zone_scores:N11', 'zone_scores:A04'],
  weights: WEIGHTS,
  dependencies: [
    { score_id: 'F09', weight: 0.4, role: 'value', critical: true },
    { score_id: 'N11', weight: 0.35, role: 'momentum', critical: true },
    { score_id: 'A04', weight: 0.25, role: 'arbitrage', critical: false },
  ],
  categoria_thresholds: CATEGORIA_THRESHOLDS,
  references: [
    {
      name: 'Catálogo 03.8 §H12 Zona Oportunidad',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#h12-zona-oportunidad',
    },
    {
      name: 'Plan FASE 10 §10.A.13',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_coverage_pct: 66, // al menos 2 de 3 dims presentes
    high_coverage_pct: 100,
  },
  sensitivity_analysis: [
    { dimension_id: 'F09', impact_pct_per_10pct_change: 4.0 },
    { dimension_id: 'N11', impact_pct_per_10pct_change: 3.5 },
    { dimension_id: 'A04', impact_pct_per_10pct_change: 2.5 },
  ],
  tier_gating: { tier: 2, min_months_data: 6 },
} as const;

export const reasoning_template =
  'Zona Oportunidad {zona_name}: F09 {f09}, N11 {n11}, A04 {a04} → score {score_value} ({categoria}). Ranking nacional: posición {ranking_position} de {ranking_total} (percentil {ranking_percentile}). Confianza {confidence}.';

export type H12Categoria = 'oportunidad_alta' | 'oportunidad_media' | 'estable' | 'declive';

export interface H12RankingContext {
  readonly position: number;
  readonly total: number;
}

export interface H12RankingOutput extends Record<string, unknown> {
  readonly position: number;
  readonly total: number;
  readonly percentile: number;
}

export interface H12Components extends Record<string, unknown> {
  readonly f09: number | null;
  readonly n11: number | null;
  readonly a04: number | null;
  readonly categoria: H12Categoria;
  readonly ranking_nacional: H12RankingOutput | null;
  readonly missing_dimensions: readonly string[];
  readonly coverage_pct: number;
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface H12RawInput {
  readonly f09: number | null;
  readonly n11: number | null;
  readonly a04: number | null;
  readonly ranking_context?: H12RankingContext;
  readonly deps?: readonly DepConfidence[];
}

export interface H12ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H12Components;
}

function categoriaFor(value: number): H12Categoria {
  if (value >= CATEGORIA_THRESHOLDS.oportunidad_alta) return 'oportunidad_alta';
  if (value >= CATEGORIA_THRESHOLDS.oportunidad_media) return 'oportunidad_media';
  if (value >= CATEGORIA_THRESHOLDS.estable) return 'estable';
  return 'declive';
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function buildRanking(ctx: H12RankingContext | undefined): H12RankingOutput | null {
  if (!ctx) return null;
  if (!Number.isFinite(ctx.position) || !Number.isFinite(ctx.total) || ctx.total <= 0) return null;
  const pos = Math.max(1, Math.min(ctx.total, Math.round(ctx.position)));
  // Percentile: top = 100. Si position=1 (mejor), percentile=100.
  const percentile = Math.round(((ctx.total - pos + 1) / ctx.total) * 100);
  return { position: pos, total: ctx.total, percentile };
}

export function computeH12ZonaOportunidad(input: H12RawInput): H12ComputeResult {
  const missing: string[] = [];
  if (input.f09 === null || !Number.isFinite(input.f09)) missing.push('F09_value');
  if (input.n11 === null || !Number.isFinite(input.n11)) missing.push('N11_momentum');
  if (input.a04 === null || !Number.isFinite(input.a04)) missing.push('A04_arbitrage');

  const total = 3;
  const available = total - missing.length;
  const coverage_pct = Math.round((available / total) * 100);

  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({
    critical,
    supporting,
    coverage_pct,
    min_coverage_pct: methodology.confidence_thresholds.min_coverage_pct,
    high_coverage_pct: methodology.confidence_thresholds.high_coverage_pct,
  });

  // Criticals (F09 o N11) faltantes → insufficient_data.
  if (input.f09 === null || !Number.isFinite(input.f09)) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        f09: null,
        n11: input.n11,
        a04: input.a04,
        categoria: 'declive',
        ranking_nacional: null,
        missing_dimensions: missing,
        coverage_pct,
        capped_by: ['F09'],
        cap_reason: 'critical_dependency_missing',
      },
    };
  }
  if (input.n11 === null || !Number.isFinite(input.n11)) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        f09: input.f09,
        n11: null,
        a04: input.a04,
        categoria: 'declive',
        ranking_nacional: null,
        missing_dimensions: missing,
        coverage_pct,
        capped_by: ['N11'],
        cap_reason: 'critical_dependency_missing',
      },
    };
  }

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        f09: input.f09,
        n11: input.n11,
        a04: input.a04,
        categoria: 'declive',
        ranking_nacional: null,
        missing_dimensions: missing,
        coverage_pct,
        capped_by: [],
        cap_reason: 'coverage_below_min',
      },
    };
  }

  const f09 = input.f09;
  const n11 = input.n11;
  const a04 = input.a04 ?? 0; // supporting missing → 0 contrib

  const weighted =
    f09 * WEIGHTS.f09_value + n11 * WEIGHTS.n11_momentum + a04 * WEIGHTS.a04_arbitrage;
  const value = Math.round(clamp100(weighted));
  const categoria = categoriaFor(value);
  const ranking_nacional = buildRanking(input.ranking_context);

  let confidence: Confidence =
    deps.length > 0
      ? propagation.confidence
      : coverage_pct >= methodology.confidence_thresholds.high_coverage_pct
        ? 'high'
        : 'medium';

  // Relax insufficient → low SÓLO cuando no hubo fail de dependencia crítica
  // (D13: critical_dependency_insufficient debe propagate).
  if (
    confidence === 'insufficient_data' &&
    value > 0 &&
    propagation.cap_reason !== 'critical_dependency_insufficient'
  ) {
    confidence = 'low';
  }

  return {
    value,
    confidence,
    components: {
      f09: input.f09,
      n11: input.n11,
      a04: input.a04,
      categoria,
      ranking_nacional,
      missing_dimensions: missing,
      coverage_pct,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h12.insufficient';
  if (value >= CATEGORIA_THRESHOLDS.oportunidad_alta) return 'ie.score.h12.oportunidad_alta';
  if (value >= CATEGORIA_THRESHOLDS.oportunidad_media) return 'ie.score.h12.oportunidad_media';
  if (value >= CATEGORIA_THRESHOLDS.estable) return 'ie.score.h12.estable';
  return 'ie.score.h12.declive';
}

export const h12ZonaOportunidadCalculator: Calculator = {
  scoreId: 'H12',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams = typeof params.f09 === 'number' && typeof params.n11 === 'number';
    const confidence: Confidence = hasParams ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeH12ZonaOportunidad directo'
          : 'params f09/n11 no provistos',
      },
      inputs_used: {
        periodDate: input.periodDate,
        zoneId: input.zoneId ?? null,
      },
      confidence,
      citations: [
        { source: 'zone_scores:F09', period: input.periodDate },
        { source: 'zone_scores:N11', period: input.periodDate },
        { source: 'zone_scores:A04', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:F09', count: 0 },
          { name: 'zone_scores:N11', count: 0 },
          { name: 'zone_scores:A04', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default h12ZonaOportunidadCalculator;
