// A05 TCO 10y — Total Cost of Ownership a 10 años para comprador con hipoteca.
// Plan 9.B.2. Catálogo 03.8 §A05. Tier 2. Categoría comprador.
//
// FÓRMULA:
//   TCO_10y = precio_compra
//           + (mensualidad_hipotecaria · 120)
//           + (predial_anual · 10)
//           + (mantenimiento_mensual · 120)     // 1.2% valor/año → /12 mensual
//           + (seguros_anuales · 10)            // 0.45% valor (hogar 0.3 + vida 0.15)
//           + comisiones_venta                   // 5% del valor final
//           + ISR_si_aplica                     // 25% utilidad (plusvalía − costos venta)
//           − plusvalia_esperada_10y            // valor_10y − precio_compra
//
// ASSUMPTIONS inline:
//   IVA 16% NO aplica compra usados (transmisión exenta salvo notario).
//   Predial: input predial_anual_2026 (tabla CDMX 2026 provista externa).
//   Mantenimiento: 1.2% valor/año (amenidades típicas MX).
//   Seguros: 0.45% valor/año = hogar 0.3% + vida hipotecaria 0.15%.
//   Venta: comisión 5% + ISR 25% sobre utilidad (plusvalía − comisión).
//
// SCORE (normalizado 0-100):
//   TCO < precio_compra     → 100 (alta plusvalía cubre todos los costos)
//   TCO = precio_compra     → 50 (neutral — recuperas capital pero no más)
//   TCO = 2·precio_compra   → 0 (peor — pagas el doble sin recuperar)
//   Linear entre estos puntos, clamped 0-100.
//
// D9 fallback: si input.macro no provisto, usa baseline fallback (MACRO_BASELINE_TASA).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';
import { MACRO_BASELINE_TASA, monthlyPayment } from './a02-investment-simulation';

export const version = '1.0.0';

export const methodology = {
  formula:
    'TCO10y = precio + mensualidad·120 + predial·10 + mant·120 + seguros·10 + venta·5% + ISR·25% − plusvalía10y. Score normalizado: 100=TCO<precio, 50=neutral, 0=TCO=2·precio.',
  sources: ['macro_series', 'predial_cdmx_2026', 'market_prices_secondary'],
  weights: {
    mantenimiento_pct_anual: 0.012,
    seguros_pct_anual: 0.0045,
    comision_venta_pct: 0.05,
    isr_utilidad_pct: 0.25,
    periodo_anios: 10,
  },
  references: [
    {
      name: 'Banxico — tasa hipotecaria promedio',
      url: 'https://www.banxico.org.mx/SieInternet/',
      period: 'mensual',
    },
    {
      name: 'SHCP — ISR personas físicas',
      url: 'https://www.gob.mx/shcp',
      period: '2026',
    },
  ],
  confidence_thresholds: { high: 3, medium: 2, low: 1 },
  validity: { unit: 'months', value: 1 },
} as const;

export const reasoning_template =
  'TCO 10y propiedad {property_value} MXN: total erogado {total_erogado} MXN, plusvalía recuperada {total_recuperado_plusvalia} MXN, TCO neto {tco_neto} MXN. Score {score_value}.';

export const TCO_ASSUMPTIONS = {
  IVA_pct_compra: 0, // no aplica secundaria
  mantenimiento_pct_anual: 0.012,
  seguros_pct_anual: 0.0045,
  comision_venta_pct: 0.05,
  isr_utilidad_pct: 0.25,
  periodo_anios: 10,
} as const;

export interface A05BreakdownYear extends Record<string, unknown> {
  readonly year: number;
  readonly capital_pagado_mxn: number;
  readonly intereses_pagados_mxn: number;
  readonly predial_mxn: number;
  readonly mantenimiento_mxn: number;
  readonly seguros_mxn: number;
}

export interface A05Components extends Record<string, unknown> {
  readonly property_value_mxn: number;
  readonly down_payment_mxn: number;
  readonly loan_mxn: number;
  readonly loan_years: number;
  readonly tasa_hipotecaria_pct: number;
  readonly mensualidad_hipotecaria_mxn: number;
  readonly predial_anual_2026_mxn: number;
  readonly mantenimiento_pct_anual: number;
  readonly mantenimiento_mensual_mxn: number;
  readonly seguros_anual_mxn: number;
  readonly plusvalia_10y_estimada_mxn: number;
  readonly valor_final_10y_mxn: number;
  readonly comision_venta_mxn: number;
  readonly isr_venta_mxn: number;
  readonly total_pagos_hipotecarios_mxn: number;
  readonly total_predial_10y_mxn: number;
  readonly total_mantenimiento_10y_mxn: number;
  readonly total_seguros_10y_mxn: number;
  readonly total_erogado_mxn: number;
  readonly total_recuperado_plusvalia_mxn: number;
  readonly tco_neto_10y_mxn: number;
  readonly breakdown_por_ano: readonly A05BreakdownYear[];
  readonly assumptions: typeof TCO_ASSUMPTIONS;
  readonly missing_dimensions: readonly string[];
}

export interface A05MacroInput {
  readonly tasa: number; // fracción anual
  readonly inflacion?: number;
}

export interface A05RawInput {
  readonly propertyValue: number;
  readonly downPayment: number;
  readonly loanYears: number;
  readonly zoneId?: string;
  readonly predial_anual_2026_mxn: number;
  readonly mantenimiento_pct_anual?: number; // default 0.012
  readonly macro?: A05MacroInput | null;
  readonly plusvalia_10y_estimada_mxn: number; // estimación N11/AVM
}

export interface A05ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A05Components;
}

function normalizeScore(tco_neto: number, precio: number): number {
  if (precio <= 0) return 0;
  const ratio = tco_neto / precio;
  // ratio <= 0  → score 100  (plusvalía cubre todo)
  // ratio = 1   → score 50   (TCO = precio)
  // ratio = 2   → score 0    (TCO = 2·precio)
  // Piecewise linear:
  if (ratio <= 0) return 100;
  if (ratio <= 1) return Math.round(100 - ratio * 50);
  if (ratio <= 2) return Math.round(50 - (ratio - 1) * 50);
  return 0;
}

export function computeA05Tco10y(input: A05RawInput): A05ComputeResult {
  const missing: string[] = [];
  const tasa = input.macro?.tasa ?? MACRO_BASELINE_TASA;
  if (!input.macro) missing.push('macro_series');

  const mantPct = input.mantenimiento_pct_anual ?? TCO_ASSUMPTIONS.mantenimiento_pct_anual;
  const loan = Math.max(0, input.propertyValue - input.downPayment);
  const mensualidad = monthlyPayment(loan, tasa, input.loanYears);
  const mensualidad_120 = mensualidad * 120;

  const predial_10y = input.predial_anual_2026_mxn * 10;
  const mant_mensual = (input.propertyValue * mantPct) / 12;
  const mant_10y = mant_mensual * 120;
  const seguros_anual = input.propertyValue * TCO_ASSUMPTIONS.seguros_pct_anual;
  const seguros_10y = seguros_anual * 10;

  const valor_final = input.propertyValue + input.plusvalia_10y_estimada_mxn;
  const comision = valor_final * TCO_ASSUMPTIONS.comision_venta_pct;
  const utilidad = Math.max(0, input.plusvalia_10y_estimada_mxn - comision);
  const isr = utilidad * TCO_ASSUMPTIONS.isr_utilidad_pct;

  const total_erogado =
    input.propertyValue + mensualidad_120 + predial_10y + mant_10y + seguros_10y + comision + isr;

  const total_recuperado_plusvalia = input.plusvalia_10y_estimada_mxn;
  const tco_neto = total_erogado - total_recuperado_plusvalia;

  // Breakdown por año: amortización simple (capital/intereses aproximados por año).
  // Para cada año y ∈ [1..10]: capital_pagado_anual = mensualidad·12 proporcionado
  // al ratio de capital vs intereses. Aproximación: capital anual = loan/loanYears
  // si tasa > 0 para simplicidad breakdown (no afecta total — solo desglose visual).
  const breakdown: A05BreakdownYear[] = [];
  const capital_anual_aprox = loan > 0 && input.loanYears > 0 ? loan / input.loanYears : 0;
  const mensualidad_12 = mensualidad * 12;
  for (let y = 1; y <= 10; y++) {
    const capital = y <= input.loanYears ? capital_anual_aprox : 0;
    const intereses = y <= input.loanYears ? Math.max(0, mensualidad_12 - capital) : 0;
    breakdown.push({
      year: y,
      capital_pagado_mxn: Math.round(capital),
      intereses_pagados_mxn: Math.round(intereses),
      predial_mxn: Math.round(input.predial_anual_2026_mxn),
      mantenimiento_mxn: Math.round(mant_mensual * 12),
      seguros_mxn: Math.round(seguros_anual),
    });
  }

  const value = normalizeScore(tco_neto, input.propertyValue);

  let confidence: Confidence;
  if (input.propertyValue <= 0 || input.loanYears <= 0 || input.predial_anual_2026_mxn < 0) {
    confidence = 'insufficient_data';
  } else if (missing.length >= 2) {
    confidence = 'low';
  } else if (missing.length === 1) {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }

  return {
    value,
    confidence,
    components: {
      property_value_mxn: input.propertyValue,
      down_payment_mxn: input.downPayment,
      loan_mxn: Math.round(loan),
      loan_years: input.loanYears,
      tasa_hipotecaria_pct: Number((tasa * 100).toFixed(3)),
      mensualidad_hipotecaria_mxn: Math.round(mensualidad),
      predial_anual_2026_mxn: Math.round(input.predial_anual_2026_mxn),
      mantenimiento_pct_anual: mantPct,
      mantenimiento_mensual_mxn: Math.round(mant_mensual),
      seguros_anual_mxn: Math.round(seguros_anual),
      plusvalia_10y_estimada_mxn: Math.round(input.plusvalia_10y_estimada_mxn),
      valor_final_10y_mxn: Math.round(valor_final),
      comision_venta_mxn: Math.round(comision),
      isr_venta_mxn: Math.round(isr),
      total_pagos_hipotecarios_mxn: Math.round(mensualidad_120),
      total_predial_10y_mxn: Math.round(predial_10y),
      total_mantenimiento_10y_mxn: Math.round(mant_10y),
      total_seguros_10y_mxn: Math.round(seguros_10y),
      total_erogado_mxn: Math.round(total_erogado),
      total_recuperado_plusvalia_mxn: Math.round(total_recuperado_plusvalia),
      tco_neto_10y_mxn: Math.round(tco_neto),
      breakdown_por_ano: breakdown,
      assumptions: TCO_ASSUMPTIONS,
      missing_dimensions: missing,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a05.insufficient';
  if (value >= 80) return 'ie.score.a05.muy_eficiente';
  if (value >= 55) return 'ie.score.a05.eficiente';
  if (value >= 30) return 'ie.score.a05.costoso';
  return 'ie.score.a05.muy_costoso';
}

export const a05Tco10yCalculator: Calculator = {
  scoreId: 'A05',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams =
      typeof params.propertyValue === 'number' && typeof params.predial_anual_2026_mxn === 'number';
    const confidence: Confidence = hasParams ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeA05Tco10y directo'
          : 'params propertyValue/predial_anual_2026_mxn no provistos',
      },
      inputs_used: {
        periodDate: input.periodDate,
        zoneId: input.zoneId ?? null,
        userId: input.userId ?? null,
      },
      confidence,
      citations: [
        {
          source: 'macro_series',
          url: 'https://www.banxico.org.mx/SieInternet/',
          period: 'mensual',
        },
        {
          source: 'predial_cdmx_2026',
          url: 'https://data.consejeria.cdmx.gob.mx',
          period: '2026',
        },
      ],
      provenance: {
        sources: [
          { name: 'macro_series', count: 0 },
          { name: 'predial_cdmx_2026', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { user_id: input.userId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a05Tco10yCalculator;
