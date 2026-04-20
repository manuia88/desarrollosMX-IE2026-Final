// B10 Unit Revenue Optimization — por unidad encuentra combo {precio, esquema_pago,
// amenidades_incluidas} que maximiza ingreso_esperado × prob_venta.
// Plan FASE 10 §10.A.6. Catálogo 03.8 §B10. Tier 2. Categoría proyecto.
//
// FÓRMULA por combo:
//   prob_venta(combo) = baseline_lead_score(C01) · elasticity_precio(B03) · amenity_lift
//   ingreso_esperado(combo) = precio_combo × prob_venta × pago_schedule_npv
//
// El calculator evalúa combos [precio_actual−5%, precio_actual, precio_actual+5%] ×
// [contado, 12m sin interés, 24m con interés] × [incluir_roof/estacionamiento/nada].
//
// Critical deps (D13): C01 (lead score baseline), B03 (elasticity precio).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const PRICE_DELTAS = [-5, 0, 5] as const;
export const PAYMENT_SCHEMES = ['contado', '12m_sin_interes', '24m_con_interes'] as const;
export const AMENITY_INCLUSIONS = [
  'ninguna',
  'estacionamiento',
  'estacionamiento_y_bodega',
] as const;

export type B10PaymentScheme = (typeof PAYMENT_SCHEMES)[number];
export type B10AmenityInclusion = (typeof AMENITY_INCLUSIONS)[number];

export const CRITICAL_DEPS: readonly string[] = ['C01', 'B03'] as const;

export const methodology = {
  formula:
    'Por unidad, combos {precio±5%, esquema_pago, amenidades}. Maximiza ingreso_esperado = precio · prob_venta · npv_schedule.',
  sources: [
    'unidades',
    'project_scores:C01',
    'project_scores:B03',
    'project_scores:B04',
    'amenidades_proyecto',
  ],
  weights: {
    price_delta_range: PRICE_DELTAS,
    payment_schemes: PAYMENT_SCHEMES,
    amenity_inclusions: AMENITY_INCLUSIONS,
  },
  dependencies: [
    { score_id: 'C01', weight: 0.4, role: 'lead_score_baseline', critical: true },
    { score_id: 'B03', weight: 0.3, role: 'price_elasticity', critical: true },
    { score_id: 'B04', weight: 0.2, role: 'product_market_fit', critical: false },
    { score_id: 'A12', weight: 0.1, role: 'price_fairness_reference', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §B10 Unit Revenue Opt',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b10-unit-revenue-opt',
    },
    {
      name: 'Plan FASE 10 §10.A.6',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 14 } as const,
  confidence_thresholds: {
    min_unidades: 1,
    high_unidades: 10,
  },
  sensitivity_analysis: [
    { dimension_id: 'C01', impact_pct_per_10pct_change: 4.0 },
    { dimension_id: 'B03', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'B04', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'A12', impact_pct_per_10pct_change: 1.0 },
  ],
} as const;

export const reasoning_template =
  'Unit Revenue Opt {project_id}: {unidades_count} unidades optimizadas, lift promedio {lift_avg_pct}%, unidad top {top_unidad_id} con lift {top_lift_pct}%.';

export interface B10Combo extends Record<string, unknown> {
  readonly precio: number;
  readonly delta_pct: number;
  readonly esquema_pago: B10PaymentScheme;
  readonly amenidades: B10AmenityInclusion;
  readonly prob_venta: number;
  readonly ingreso_esperado: number;
}

export interface B10UnidadInput {
  readonly unidadId: string;
  readonly precio_actual: number;
  readonly lead_score_c01: number; // 0-100
  readonly pmf_score_b04?: number; // 0-100
}

export interface B10UnidadResult extends Record<string, unknown> {
  readonly unidadId: string;
  readonly precio_actual: number;
  readonly mejor_combo: B10Combo;
  readonly baseline_ingreso_esperado: number;
  readonly lift_pct: number;
}

export interface B10Components extends Record<string, unknown> {
  readonly unidades: readonly B10UnidadResult[];
  readonly unidades_count: number;
  readonly lift_avg_pct: number;
  readonly lift_total_mxn: number;
  readonly top_unidad_id: string | null;
  readonly top_lift_pct: number;
  readonly missing_dimensions: readonly string[];
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface B10RawInput {
  readonly projectId: string;
  readonly unidades: readonly B10UnidadInput[];
  readonly deps?: readonly DepConfidence[];
}

export interface B10ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B10Components;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function npvFactor(scheme: B10PaymentScheme): number {
  // Factor NPV aproximado: contado 1.0, 12m sin interés 0.95, 24m con interés 1.02.
  if (scheme === 'contado') return 1.0;
  if (scheme === '12m_sin_interes') return 0.95;
  return 1.02;
}

function amenityLift(amenidades: B10AmenityInclusion): { priceLift: number; probLift: number } {
  if (amenidades === 'ninguna') return { priceLift: 0, probLift: 1.0 };
  if (amenidades === 'estacionamiento') return { priceLift: 0.02, probLift: 1.05 };
  return { priceLift: 0.035, probLift: 1.08 };
}

function elasticityFactor(delta_pct: number): number {
  // Baja +10% → prob −15% aprox. Baja −10% → prob +20%.
  return clamp01(1 - delta_pct * 0.015);
}

function optimizeUnit(u: B10UnidadInput): B10UnidadResult {
  const baselineProb = clamp01(u.lead_score_c01 / 100);
  const pmfFactor = clamp01((u.pmf_score_b04 ?? 50) / 100 + 0.5);

  // Baseline combo = precio actual, contado, ninguna amenidad.
  const baseline_ingreso = u.precio_actual * baselineProb * pmfFactor * npvFactor('contado');

  let best: B10Combo = {
    precio: u.precio_actual,
    delta_pct: 0,
    esquema_pago: 'contado',
    amenidades: 'ninguna',
    prob_venta: Math.round(baselineProb * pmfFactor * 100) / 100,
    ingreso_esperado: Math.round(baseline_ingreso),
  };
  let bestIngreso = baseline_ingreso;

  for (const delta of PRICE_DELTAS) {
    for (const scheme of PAYMENT_SCHEMES) {
      for (const amen of AMENITY_INCLUSIONS) {
        const { priceLift, probLift } = amenityLift(amen);
        const precioCombo = u.precio_actual * (1 + delta / 100 + priceLift);
        const prob = baselineProb * pmfFactor * elasticityFactor(delta) * probLift;
        const ingreso = precioCombo * prob * npvFactor(scheme);
        if (ingreso > bestIngreso) {
          bestIngreso = ingreso;
          best = {
            precio: Math.round(precioCombo),
            delta_pct: Math.round(delta * 100) / 100,
            esquema_pago: scheme,
            amenidades: amen,
            prob_venta: Math.round(prob * 100) / 100,
            ingreso_esperado: Math.round(ingreso),
          };
        }
      }
    }
  }

  const lift_pct =
    baseline_ingreso > 0
      ? Math.round(((bestIngreso - baseline_ingreso) / baseline_ingreso) * 10000) / 100
      : 0;

  return {
    unidadId: u.unidadId,
    precio_actual: u.precio_actual,
    mejor_combo: best,
    baseline_ingreso_esperado: Math.round(baseline_ingreso),
    lift_pct,
  };
}

export function computeB10UnitRevenueOpt(input: B10RawInput): B10ComputeResult {
  const missing: string[] = [];
  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({ critical, supporting });

  if (input.unidades.length < methodology.confidence_thresholds.min_unidades) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        unidades: [],
        unidades_count: 0,
        lift_avg_pct: 0,
        lift_total_mxn: 0,
        top_unidad_id: null,
        top_lift_pct: 0,
        missing_dimensions: ['unidades_activas'],
        capped_by: [],
        cap_reason: 'no_unidades',
      },
    };
  }

  for (const u of input.unidades) {
    if (!Number.isFinite(u.lead_score_c01)) missing.push(`C01_unidad_${u.unidadId}`);
  }

  const results = input.unidades.map(optimizeUnit);
  const lift_avg = results.reduce((a, r) => a + r.lift_pct, 0) / Math.max(1, results.length);
  const lift_total = results.reduce(
    (a, r) => a + (r.mejor_combo.ingreso_esperado - r.baseline_ingreso_esperado),
    0,
  );
  const top: B10UnidadResult | null = results.reduce<B10UnidadResult | null>(
    (acc, r) => (acc === null || r.lift_pct > acc.lift_pct ? r : acc),
    null,
  );

  const value = Math.max(0, Math.min(100, Math.round(lift_avg * 2)));

  const baselineConfidence: Confidence =
    input.unidades.length >= methodology.confidence_thresholds.high_unidades ? 'high' : 'medium';
  const confidence: Confidence = deps.length > 0 ? propagation.confidence : baselineConfidence;

  return {
    value,
    confidence,
    components: {
      unidades: results,
      unidades_count: results.length,
      lift_avg_pct: Math.round(lift_avg * 100) / 100,
      lift_total_mxn: Math.round(lift_total),
      top_unidad_id: top?.unidadId ?? null,
      top_lift_pct: top?.lift_pct ?? 0,
      missing_dimensions: missing,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b10.insufficient';
  if (value >= 70) return 'ie.score.b10.lift_alto';
  if (value >= 30) return 'ie.score.b10.lift_medio';
  if (value > 0) return 'ie.score.b10.lift_bajo';
  return 'ie.score.b10.sin_lift';
}

export const b10UnitRevenueOptCalculator: Calculator = {
  scoreId: 'B10',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams = Array.isArray(params.unidades);
    const confidence: Confidence = hasParams ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeB10UnitRevenueOpt directo'
          : 'params unidades[] no provisto',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
      },
      confidence,
      citations: [
        { source: 'unidades', period: 'realtime' },
        { source: 'project_scores:C01', period: input.periodDate },
        { source: 'project_scores:B03', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'unidades', count: 0 },
          { name: 'project_scores:C01', count: 0 },
          { name: 'project_scores:B03', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { project_id: input.projectId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default b10UnitRevenueOptCalculator;
