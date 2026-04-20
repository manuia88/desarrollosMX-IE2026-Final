// B09 Cash Flow — proyección 24m de flujos de caja para desarrollador.
// Plan FASE 10 §10.A.5. Catálogo 03.8 §B09. Tier 2. Categoría proyecto.
//
// FÓRMULA mensual (m=0..23):
//   ingresos_m = unidades_vendidas_m × precio_promedio × split_esquema_pago_m
//   unidades_vendidas_m = absorcion_mensual_B08 × factor_estacional_m
//   egresos_m = costos_construccion_B12_m + amortizacion_terreno + gastos_fijos_m
//   flujo_m = ingresos_m − egresos_m
//   cumulative_m = Σ flujo_0..m
//
// Si cumulative se vuelve positivo en mes K → breakeven_month = K. Sino null.
//
// Critical deps (D13): B08 (absorption), B12 (costos construcción).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const HORIZON_MONTHS = 24;

export const CRITICAL_DEPS: readonly string[] = ['B08', 'B12'] as const;

export const methodology = {
  formula:
    'Mensual 24m: ingresos_m = abs_B08·precio·split_esquema_pago − costos_B12_m − amortizacion_terreno. cumulative_m = Σ flujo_0..m.',
  sources: [
    'project_scores:B08',
    'project_scores:B12',
    'projects.esquema_pago',
    'projects.unidades_totales',
    'projects.precio_promedio',
  ],
  weights: { horizon_months: HORIZON_MONTHS },
  dependencies: [
    { score_id: 'B08', weight: 0.5, role: 'absorption_forecast', critical: true },
    { score_id: 'B12', weight: 0.3, role: 'costos_construccion', critical: true },
    { score_id: 'B05', weight: 0.1, role: 'market_cycle', critical: false },
    { score_id: 'B10', weight: 0.1, role: 'unit_revenue_opt', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §B09 Cash Flow',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b09-cash-flow',
    },
    {
      name: 'Plan FASE 10 §10.A.5',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_months_with_data: 12,
    high_months_with_data: 24,
  },
  sensitivity_analysis: [
    { dimension_id: 'B08', impact_pct_per_10pct_change: 5.0 },
    { dimension_id: 'B12', impact_pct_per_10pct_change: 3.5 },
    { dimension_id: 'B05', impact_pct_per_10pct_change: 1.0 },
    { dimension_id: 'B10', impact_pct_per_10pct_change: 0.5 },
  ],
} as const;

export const reasoning_template =
  'Cash Flow 24m {project_id}: cumulative final {cumulative_final} MXN, breakeven mes {breakeven_month}, peor mes {worst_month} ({worst_flow} MXN). Confianza {confidence}.';

export interface B09MonthlyFlow extends Record<string, unknown> {
  readonly month: number;
  readonly ingresos: number;
  readonly egresos: number;
  readonly flujo_neto: number;
  readonly cumulative: number;
}

export interface B09Components extends Record<string, unknown> {
  readonly flujo_mensual: readonly B09MonthlyFlow[];
  readonly cumulative_final: number;
  readonly breakeven_month: number | null;
  readonly peak_negative: number;
  readonly peak_negative_month: number;
  readonly worst_flow: number;
  readonly worst_month: number;
  readonly total_ingresos: number;
  readonly total_egresos: number;
  readonly missing_dimensions: readonly string[];
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface B09PaymentSplit {
  // Fracción del precio unitario que entra en el mes relativo m (0..23).
  // Ej: enganche 20% mes venta, 80% entrega mes +18. Debe sumar 1.0.
  readonly schedule: readonly number[];
}

export interface B09RawInput {
  readonly projectId: string;
  readonly unidades_totales: number;
  readonly precio_promedio: number;
  readonly absorcion_mensual: number; // B08 forecast unidades/mes
  readonly payment_split: B09PaymentSplit;
  readonly costos_construccion_mensuales: readonly number[]; // B12 M0..M23
  readonly amortizacion_terreno_mensual: number;
  readonly gastos_fijos_mensuales: number;
  readonly deps?: readonly DepConfidence[];
}

export interface B09ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B09Components;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeB09CashFlow(input: B09RawInput): B09ComputeResult {
  const missing: string[] = [];
  if (!Number.isFinite(input.absorcion_mensual)) missing.push('B08_absorption');
  if (!input.costos_construccion_mensuales.length) missing.push('B12_costos');
  const sumSplit = input.payment_split.schedule.reduce((a, b) => a + b, 0);
  if (Math.abs(sumSplit - 1) > 0.05) missing.push('payment_split_invalid_sum');

  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({ critical, supporting });

  if (missing.length > 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        flujo_mensual: [],
        cumulative_final: 0,
        breakeven_month: null,
        peak_negative: 0,
        peak_negative_month: 0,
        worst_flow: 0,
        worst_month: 0,
        total_ingresos: 0,
        total_egresos: 0,
        missing_dimensions: missing,
        capped_by: [],
        cap_reason: 'critical_dependency_missing',
      },
    };
  }

  const flows: B09MonthlyFlow[] = [];
  const schedule = input.payment_split.schedule;
  let cumulative = 0;
  let breakeven: number | null = null;
  let peakNegative = 0;
  let peakNegativeMonth = 0;
  let worstFlow = Number.POSITIVE_INFINITY;
  let worstMonth = 0;
  let totalIngresos = 0;
  let totalEgresos = 0;

  // Vector de unidades vendidas por mes (constante = absorcion_mensual capped).
  const unidadesVendidasPorMes = Array.from({ length: HORIZON_MONTHS }, (_, m) => {
    const vendidasHastaMes = Math.min(input.unidades_totales, input.absorcion_mensual * (m + 1));
    const vendidasMesAnterior =
      m === 0 ? 0 : Math.min(input.unidades_totales, input.absorcion_mensual * m);
    return Math.max(0, vendidasHastaMes - vendidasMesAnterior);
  });

  for (let m = 0; m < HORIZON_MONTHS; m++) {
    // Ingresos mes m = Σ (unidades vendidas en mes k) × precio × split[m−k], k=0..m.
    let ingresos = 0;
    for (let k = 0; k <= m; k++) {
      const splitIdx = m - k;
      const splitFactor = schedule[splitIdx] ?? 0;
      const unidades = unidadesVendidasPorMes[k] ?? 0;
      ingresos += unidades * input.precio_promedio * splitFactor;
    }

    const costoConstruccion = input.costos_construccion_mensuales[m] ?? 0;
    const egresos =
      costoConstruccion + input.amortizacion_terreno_mensual + input.gastos_fijos_mensuales;

    const flujo_neto = ingresos - egresos;
    const flujo_neto_rounded = Math.round(flujo_neto);
    cumulative += flujo_neto_rounded;

    if (cumulative < peakNegative) {
      peakNegative = cumulative;
      peakNegativeMonth = m;
    }
    if (flujo_neto < worstFlow) {
      worstFlow = flujo_neto;
      worstMonth = m;
    }
    if (breakeven === null && cumulative > 0) breakeven = m;
    totalIngresos += ingresos;
    totalEgresos += egresos;

    flows.push({
      month: m,
      ingresos: Math.round(ingresos),
      egresos: Math.round(egresos),
      flujo_neto: flujo_neto_rounded,
      cumulative,
    });
  }

  // Score 0-100 proporcional a health: 100 si breakeven antes de 12m y cumulative final > 0.
  // 0 si cumulative final <= peakNegative · 2 (proyecto quema caja).
  let value: number;
  if (cumulative <= 0) {
    value = 0;
  } else if (breakeven !== null && breakeven <= 12) {
    value = 100;
  } else if (breakeven !== null && breakeven <= 24) {
    value = Math.round(clamp100(100 - ((breakeven - 12) / 12) * 40));
  } else {
    value = 30;
  }

  const monthsWithData = flows.filter((f) => f.ingresos > 0 || f.egresos > 0).length;
  const baselineConfidence: Confidence =
    monthsWithData >= methodology.confidence_thresholds.high_months_with_data
      ? 'high'
      : monthsWithData >= methodology.confidence_thresholds.min_months_with_data
        ? 'medium'
        : 'low';
  const confidence: Confidence = deps.length > 0 ? propagation.confidence : baselineConfidence;

  return {
    value,
    confidence,
    components: {
      flujo_mensual: flows,
      cumulative_final: Math.round(cumulative),
      breakeven_month: breakeven,
      peak_negative: Math.round(peakNegative),
      peak_negative_month: peakNegativeMonth,
      worst_flow: Math.round(Number.isFinite(worstFlow) ? worstFlow : 0),
      worst_month: worstMonth,
      total_ingresos: Math.round(totalIngresos),
      total_egresos: Math.round(totalEgresos),
      missing_dimensions: missing,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b09.insufficient';
  if (value >= 80) return 'ie.score.b09.breakeven_rapido';
  if (value >= 50) return 'ie.score.b09.breakeven_moderado';
  if (value > 0) return 'ie.score.b09.breakeven_tardio';
  return 'ie.score.b09.no_breakeven';
}

export const b09CashFlowCalculator: Calculator = {
  scoreId: 'B09',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams =
      typeof params.unidades_totales === 'number' && typeof params.absorcion_mensual === 'number';
    const confidence: Confidence = hasParams ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeB09CashFlow directo'
          : 'params unidades_totales/absorcion_mensual no provistos',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
      },
      confidence,
      citations: [
        { source: 'project_scores:B08', period: input.periodDate },
        { source: 'project_scores:B12', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'project_scores:B08', count: 0 },
          { name: 'project_scores:B12', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { project_id: input.projectId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default b09CashFlowCalculator;
