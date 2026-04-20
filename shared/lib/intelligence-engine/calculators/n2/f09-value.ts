// F09 Value Score — score N2 que mide si un proyecto ofrece buen valor por dinero
// combinando calidad de vida zonal (F08), posición en percentil de precio m2 (A12)
// y momentum de la zona (N11).
// Plan FASE 10 §10.A.1. Catálogo 03.8 §F09. Tier 2. Categoría proyecto.
//
// FÓRMULA:
//   value = F08_LQI × 0.30 + (100 − percentil_precio_m2_zona) × 0.40 + N11_momentum × 0.30
//
// Percentil invertido: cuanto más barato para la calidad, mayor value.
//
// Buckets oportunidad_valor:
//   ≥80 excelente · ≥60 buena · ≥40 regular · <40 sobreprecio
//
// Critical deps (D13): A12 (percentil precio vía comparables). Sin comparables
// válidos el value no existe — propagate fail.
// Supporting deps: F08 LQI + N11 momentum.

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
  lqi: 0.3,
  percentil_precio: 0.4,
  momentum: 0.3,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['A12'] as const;

export const methodology = {
  formula: 'value = F08_LQI · 0.30 + (100 − percentil_precio_m2_zona) · 0.40 + N11_momentum · 0.30',
  sources: ['zone_scores:F08', 'project_scores:A12', 'zone_scores:N11'],
  weights: WEIGHTS,
  dependencies: [
    { score_id: 'F08', weight: 0.3, role: 'calidad_vida', critical: false },
    { score_id: 'A12', weight: 0.4, role: 'percentil_precio', critical: true },
    { score_id: 'N11', weight: 0.3, role: 'momentum_zona', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §F09 Value Score',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#f09-value-score',
    },
    {
      name: 'Plan FASE 10 §10.A.1',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_coverage_pct: 60,
    high_coverage_pct: 100,
  },
  sensitivity_analysis: [
    { dimension_id: 'F08', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'A12', impact_pct_per_10pct_change: 4.0 },
    { dimension_id: 'N11', impact_pct_per_10pct_change: 3.0 },
  ],
} as const;

export const reasoning_template =
  'Value Score {project_id}: LQI {lqi}, percentil precio {percentil_precio} (inverso {percentil_invertido}), momentum {momentum} → value {score_value} ({oportunidad_valor}). Confianza {confidence}.';

export type F09OportunidadValor = 'excelente' | 'buena' | 'regular' | 'sobreprecio';

export interface F09Components extends Record<string, unknown> {
  readonly lqi: number | null;
  readonly percentil_precio: number | null;
  readonly percentil_invertido: number | null;
  readonly momentum: number | null;
  readonly oportunidad_valor: F09OportunidadValor;
  readonly missing_dimensions: readonly string[];
  readonly coverage_pct: number;
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface F09RawInput {
  readonly lqi: number | null;
  readonly percentil_precio_m2: number | null;
  readonly momentum: number | null;
  readonly deps?: readonly DepConfidence[];
}

export interface F09ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: F09Components;
}

function bucketFor(value: number): F09OportunidadValor {
  if (value >= 80) return 'excelente';
  if (value >= 60) return 'buena';
  if (value >= 40) return 'regular';
  return 'sobreprecio';
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeF09Value(input: F09RawInput): F09ComputeResult {
  const missing: string[] = [];
  if (input.lqi === null || !Number.isFinite(input.lqi)) missing.push('F08_lqi');
  if (input.percentil_precio_m2 === null || !Number.isFinite(input.percentil_precio_m2))
    missing.push('A12_percentil_precio');
  if (input.momentum === null || !Number.isFinite(input.momentum)) missing.push('N11_momentum');

  const total = 3;
  const available = total - missing.length;
  const coverage_pct = Math.round((available / total) * 100);

  // Propagación D13 si se proveen deps confidence. Critical: A12.
  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({
    critical,
    supporting,
    coverage_pct,
    min_coverage_pct: methodology.confidence_thresholds.min_coverage_pct,
    high_coverage_pct: methodology.confidence_thresholds.high_coverage_pct,
  });

  // Si A12 es crítica y falta percentil → insufficient.
  if (input.percentil_precio_m2 === null || !Number.isFinite(input.percentil_precio_m2)) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        lqi: input.lqi,
        percentil_precio: null,
        percentil_invertido: null,
        momentum: input.momentum,
        oportunidad_valor: 'sobreprecio',
        missing_dimensions: missing,
        coverage_pct,
        capped_by: ['A12'],
        cap_reason: 'critical_dependency_missing',
      },
    };
  }

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        lqi: input.lqi,
        percentil_precio: input.percentil_precio_m2,
        percentil_invertido: null,
        momentum: input.momentum,
        oportunidad_valor: 'sobreprecio',
        missing_dimensions: missing,
        coverage_pct,
        capped_by: [],
        cap_reason: 'coverage_below_min',
      },
    };
  }

  const lqi = input.lqi ?? 0;
  const percentil = input.percentil_precio_m2;
  const momentum = input.momentum ?? 0;
  const percentil_invertido = clamp100(100 - percentil);

  const weighted =
    lqi * WEIGHTS.lqi +
    percentil_invertido * WEIGHTS.percentil_precio +
    momentum * WEIGHTS.momentum;
  const value = Math.round(clamp100(weighted));

  const baselineConfidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';
  // Si se proveen deps confidence, propagación D13 manda (puede forzar insufficient_data
  // aunque tengamos valor computado — ej. A12 insufficient crítica).
  const confidence: Confidence = deps.length > 0 ? propagation.confidence : baselineConfidence;

  return {
    value,
    confidence,
    components: {
      lqi: input.lqi,
      percentil_precio: percentil,
      percentil_invertido,
      momentum: input.momentum,
      oportunidad_valor: bucketFor(value),
      missing_dimensions: missing,
      coverage_pct,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.f09.insufficient';
  if (value >= 80) return 'ie.score.f09.excelente';
  if (value >= 60) return 'ie.score.f09.buena';
  if (value >= 40) return 'ie.score.f09.regular';
  return 'ie.score.f09.sobreprecio';
}

export const f09ValueCalculator: Calculator = {
  scoreId: 'F09',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams =
      typeof params.lqi === 'number' &&
      typeof params.percentil_precio_m2 === 'number' &&
      typeof params.momentum === 'number';
    const confidence: Confidence = hasParams ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeF09Value directo'
          : 'params lqi/percentil_precio_m2/momentum no provistos',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
      },
      confidence,
      citations: [
        { source: 'zone_scores:F08', period: input.periodDate },
        { source: 'project_scores:A12', period: input.periodDate },
        { source: 'zone_scores:N11', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:F08', count: 0 },
          { name: 'project_scores:A12', count: 0 },
          { name: 'zone_scores:N11', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { project_id: input.projectId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default f09ValueCalculator;
