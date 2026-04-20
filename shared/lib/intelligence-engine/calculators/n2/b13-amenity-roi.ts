// B13 Amenity ROI — para cada amenidad del proyecto calcula retorno esperado vs
// costo de capital + mantenimiento 10y. Benchmark vs zona.
// Plan FASE 10 §10.A.7. Catálogo 03.8 §B13. Tier 2. Categoría proyecto.
//
// FÓRMULA por amenidad:
//   revenue_lift = precio_m2_lift_estimado × m2_total_proyecto
//   costo_total  = costo_inicial + costo_mantenimiento_anual × 10
//   roi          = revenue_lift / costo_total
//
// Recomendación:
//   roi ≥ 2.0 → invertir
//   1.0 ≤ roi < 2.0 → evaluar
//   roi < 1.0 → descartar
//
// Critical deps (D13): B07 (competitive_intel — amenity benchmark zona).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const ROI_THRESHOLDS = {
  invertir_min: 2.0,
  evaluar_min: 1.0,
  maintenance_years: 10,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['B07'] as const;

export const methodology = {
  formula:
    'Por amenidad: roi = (precio_m2_lift · m2_total) / (costo_inicial + costo_mantenimiento_anual · 10). invertir ≥ 2.0, evaluar ≥ 1.0, descartar < 1.0.',
  sources: [
    'amenidades_proyecto',
    'project_scores:B07',
    'zone_scores:N01',
    'benchmark_amenidades_zona',
  ],
  weights: ROI_THRESHOLDS,
  dependencies: [
    { score_id: 'B07', weight: 0.5, role: 'competitive_benchmark', critical: true },
    { score_id: 'N01', weight: 0.2, role: 'zone_diversity', critical: false },
    { score_id: 'F08', weight: 0.2, role: 'zone_quality_baseline', critical: false },
    { score_id: 'B04', weight: 0.1, role: 'pmf_signal', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §B13 Amenity ROI',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b13-amenity-roi',
    },
    {
      name: 'Plan FASE 10 §10.A.7',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 90 } as const,
  confidence_thresholds: {
    min_amenidades: 1,
    high_amenidades: 5,
  },
  sensitivity_analysis: [
    { dimension_id: 'B07', impact_pct_per_10pct_change: 4.5 },
    { dimension_id: 'N01', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'F08', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'B04', impact_pct_per_10pct_change: 1.5 },
  ],
} as const;

export const reasoning_template =
  'Amenity ROI {project_id}: {invertir_count} invertir, {evaluar_count} evaluar, {descartar_count} descartar. Top amenidad {top_amenidad} con ROI {top_roi}x.';

export type B13Recomendacion = 'invertir' | 'evaluar' | 'descartar';

export interface B13AmenidadInput {
  readonly nombre: string;
  readonly costo_inicial_mxn: number;
  readonly costo_mantenimiento_anual_mxn: number;
  readonly precio_m2_lift_mxn: number;
  readonly m2_total_proyecto: number;
  readonly saturacion_zona_pct?: number; // 0-100 — si alta, lift decae.
}

export interface B13AmenidadResult extends Record<string, unknown> {
  readonly nombre: string;
  readonly revenue_lift_mxn: number;
  readonly costo_total_mxn: number;
  readonly roi: number;
  readonly recomendacion: B13Recomendacion;
  readonly rationale: string;
}

export interface B13Components extends Record<string, unknown> {
  readonly amenidades: readonly B13AmenidadResult[];
  readonly amenidades_count: number;
  readonly invertir_count: number;
  readonly evaluar_count: number;
  readonly descartar_count: number;
  readonly top_amenidad: string | null;
  readonly top_roi: number;
  readonly missing_dimensions: readonly string[];
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface B13RawInput {
  readonly projectId: string;
  readonly amenidades: readonly B13AmenidadInput[];
  readonly deps?: readonly DepConfidence[];
}

export interface B13ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B13Components;
}

function classify(roi: number): B13Recomendacion {
  if (roi >= ROI_THRESHOLDS.invertir_min) return 'invertir';
  if (roi >= ROI_THRESHOLDS.evaluar_min) return 'evaluar';
  return 'descartar';
}

function analyzeAmenidad(a: B13AmenidadInput): B13AmenidadResult {
  const saturationFactor =
    a.saturacion_zona_pct !== undefined ? Math.max(0, 1 - a.saturacion_zona_pct / 100) : 1;
  const revenue_lift = a.precio_m2_lift_mxn * a.m2_total_proyecto * saturationFactor;
  const costo_total =
    a.costo_inicial_mxn + a.costo_mantenimiento_anual_mxn * ROI_THRESHOLDS.maintenance_years;
  const roi = costo_total > 0 ? revenue_lift / costo_total : 0;
  const recomendacion = classify(roi);
  const rationale = `${a.nombre}: revenue lift ${Math.round(revenue_lift).toLocaleString()} vs costo ${Math.round(costo_total).toLocaleString()} → ROI ${roi.toFixed(2)}x (${recomendacion}).`;

  return {
    nombre: a.nombre,
    revenue_lift_mxn: Math.round(revenue_lift),
    costo_total_mxn: Math.round(costo_total),
    roi: Math.round(roi * 100) / 100,
    recomendacion,
    rationale,
  };
}

export function computeB13AmenityRoi(input: B13RawInput): B13ComputeResult {
  const missing: string[] = [];
  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({ critical, supporting });

  if (input.amenidades.length < methodology.confidence_thresholds.min_amenidades) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        amenidades: [],
        amenidades_count: 0,
        invertir_count: 0,
        evaluar_count: 0,
        descartar_count: 0,
        top_amenidad: null,
        top_roi: 0,
        missing_dimensions: ['amenidades'],
        capped_by: [],
        cap_reason: 'no_amenidades',
      },
    };
  }

  for (const a of input.amenidades) {
    if (!Number.isFinite(a.precio_m2_lift_mxn)) missing.push(`lift_${a.nombre}`);
  }

  const results = input.amenidades.map(analyzeAmenidad);
  const invertir = results.filter((r) => r.recomendacion === 'invertir').length;
  const evaluar = results.filter((r) => r.recomendacion === 'evaluar').length;
  const descartar = results.filter((r) => r.recomendacion === 'descartar').length;
  const top: B13AmenidadResult | null = results.reduce<B13AmenidadResult | null>(
    (acc, r) => (acc === null || r.roi > acc.roi ? r : acc),
    null,
  );

  const avgRoi = results.reduce((a, r) => a + r.roi, 0) / Math.max(1, results.length);
  // Score 0-100: roi promedio clamp × 25 (roi=4 → 100).
  const value = Math.max(0, Math.min(100, Math.round(avgRoi * 25)));

  const baselineConfidence: Confidence =
    input.amenidades.length >= methodology.confidence_thresholds.high_amenidades
      ? 'high'
      : 'medium';
  const confidence: Confidence = deps.length > 0 ? propagation.confidence : baselineConfidence;

  return {
    value,
    confidence,
    components: {
      amenidades: results,
      amenidades_count: results.length,
      invertir_count: invertir,
      evaluar_count: evaluar,
      descartar_count: descartar,
      top_amenidad: top?.nombre ?? null,
      top_roi: top?.roi ?? 0,
      missing_dimensions: missing,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b13.insufficient';
  if (value >= 75) return 'ie.score.b13.amenity_mix_excelente';
  if (value >= 40) return 'ie.score.b13.amenity_mix_regular';
  return 'ie.score.b13.amenity_mix_pobre';
}

export const b13AmenityRoiCalculator: Calculator = {
  scoreId: 'B13',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams = Array.isArray(params.amenidades);
    const confidence: Confidence = hasParams ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeB13AmenityRoi directo'
          : 'params amenidades[] no provisto',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
      },
      confidence,
      citations: [
        { source: 'amenidades_proyecto', period: 'realtime' },
        { source: 'project_scores:B07', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'amenidades_proyecto', count: 0 },
          { name: 'project_scores:B07', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { project_id: input.projectId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default b13AmenityRoiCalculator;
