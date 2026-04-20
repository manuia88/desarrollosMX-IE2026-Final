// H11 Infonavit Calculator — capacidad crediticia vía tablas hardcoded 2026.
// Plan 8.B.16. Catálogo 03.8 §H11. Tier 2 (comprador, gated en MX H1 hasta
// que tierGate rule relax — tests invocan computeH11Infonavit directo).
//
// Tablas base Infonavit 2026 (simplificadas — puede evolucionar con legal):
//   VSM_MENSUAL_MXN      = 8_364 MXN (salario mínimo mensual 2026)
//   TASA_PROMEDIO        = 10%
//   MONTO_MAX_ABS        = 2_500_000 MXN (tope institucional)
//   AMORTIZACION_FACTOR  = 0.012 (mensualidad ≈ monto × 0.012, 20y a 10%)
//
// Fórmula:
//   factor_edad  = clamp(0.3, 1, (65 − edad) / 35)            // 30y→1, 65y→0.3
//   factor_antig = clamp(0, 1, antiguedad_vsm / 5)             // 5y+ → 1.0
//   base_mensual = salario_mensual_vsm × 8_364
//   monto_max    = min(2_500_000, base_mensual × 12 × factor_edad × factor_antig × 0.9)
//   score        = monto_max / 2_500_000 × 100                 (capacidad relativa)
//
// Confidence: high si salario >0 + antiguedad >0 + edad ∈ [18, 64].

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const VSM_MENSUAL_MXN_2026 = 8_364;
export const TASA_PROMEDIO_2026 = 0.1;
export const MONTO_MAX_ABS_MXN_2026 = 2_500_000;
export const AMORTIZACION_FACTOR_2026 = 0.012;

export const methodology = {
  formula:
    'factor_edad=clamp(.3,1,(65−edad)/35); factor_antig=min(1,antiguedad/5); monto=min(2_500_000, salario_vsm·8364·12·fe·fa·0.9). Score=monto/2.5M·100.',
  sources: ['infonavit_tables_2026'],
  weights: { edad: 0.4, antiguedad: 0.3, salario: 0.3 },
  references: [
    {
      name: 'Infonavit Tablas 2026 (simplificadas)',
      url: 'https://portalmx.infonavit.org.mx/',
      period: '2026',
    },
  ],
  confidence_thresholds: { high: 3, medium: 2, low: 1 },
  validity: { unit: 'months', value: 3 },
} as const;

export const reasoning_template =
  'Infonavit capacity para user {user_id}: {salario_vsm} VSM mensuales + edad {edad} + antiguedad {antiguedad_vsm} años VSM → crédito máx {monto_credito_max} MXN, tasa {tasa_pct}%, mensualidad {mensualidad_estimada} MXN.';

export interface H11Components extends Record<string, unknown> {
  readonly salario_mensual_vsm: number;
  readonly edad: number;
  readonly antiguedad_vsm: number;
  readonly factor_edad: number;
  readonly factor_antiguedad: number;
  readonly monto_credito_max_mxn: number;
  readonly tasa_avg_pct: number;
  readonly mensualidad_estimada_mxn: number;
}

export interface H11RawInput {
  readonly salario_mensual_vsm: number;
  readonly edad: number;
  readonly antiguedad_vsm: number;
}

export interface H11ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H11Components;
}

function detectConfidence(input: H11RawInput): Confidence {
  const valid =
    input.salario_mensual_vsm > 0 &&
    input.edad >= 18 &&
    input.edad < 65 &&
    input.antiguedad_vsm >= 0;
  if (!valid) return 'insufficient_data';
  const factors = [input.salario_mensual_vsm > 0, input.antiguedad_vsm > 0, input.edad > 0].filter(
    Boolean,
  ).length;
  if (factors >= 3) return 'high';
  if (factors >= 2) return 'medium';
  return 'low';
}

export function computeH11Infonavit(input: H11RawInput): H11ComputeResult {
  const factor_edad = Math.max(0.3, Math.min(1, (65 - input.edad) / 35));
  const factor_antiguedad = Math.max(0, Math.min(1, input.antiguedad_vsm / 5));
  const base_mensual = input.salario_mensual_vsm * VSM_MENSUAL_MXN_2026;
  const monto_credito_max_mxn = Math.min(
    MONTO_MAX_ABS_MXN_2026,
    Math.round(base_mensual * 12 * factor_edad * factor_antiguedad * 0.9),
  );
  const tasa_avg_pct = TASA_PROMEDIO_2026 * 100;
  const mensualidad_estimada_mxn = Math.round(monto_credito_max_mxn * AMORTIZACION_FACTOR_2026);
  const value = Math.max(
    0,
    Math.min(100, Math.round((monto_credito_max_mxn / MONTO_MAX_ABS_MXN_2026) * 100)),
  );

  return {
    value,
    confidence: detectConfidence(input),
    components: {
      salario_mensual_vsm: input.salario_mensual_vsm,
      edad: input.edad,
      antiguedad_vsm: input.antiguedad_vsm,
      factor_edad: Number(factor_edad.toFixed(3)),
      factor_antiguedad: Number(factor_antiguedad.toFixed(3)),
      monto_credito_max_mxn,
      tasa_avg_pct,
      mensualidad_estimada_mxn,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h11.insufficient';
  if (value >= 80) return 'ie.score.h11.capacidad_alta';
  if (value >= 50) return 'ie.score.h11.capacidad_media';
  if (value >= 20) return 'ie.score.h11.capacidad_baja';
  return 'ie.score.h11.capacidad_minima';
}

export const h11InfonavitCalculator: Calculator = {
  scoreId: 'H11',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const params = input.params as
      | { salario_mensual_vsm?: number; edad?: number; antiguedad_vsm?: number }
      | undefined;
    const computed_at = new Date();
    if (
      !params ||
      typeof params.salario_mensual_vsm !== 'number' ||
      typeof params.edad !== 'number' ||
      typeof params.antiguedad_vsm !== 'number'
    ) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: { reason: 'params.salario_mensual_vsm/edad/antiguedad_vsm required' },
        inputs_used: { periodDate: input.periodDate, userId: input.userId ?? null },
        confidence: 'insufficient_data',
        citations: [
          {
            source: 'infonavit_tables_2026',
            url: 'https://portalmx.infonavit.org.mx/',
            period: '2026',
          },
        ],
        provenance: {
          sources: [{ name: 'infonavit_tables_2026', count: 0 }],
          computed_at: computed_at.toISOString(),
          calculator_version: version,
        },
        template_vars: { user_id: input.userId ?? 'desconocido' },
      };
    }
    const res = computeH11Infonavit({
      salario_mensual_vsm: params.salario_mensual_vsm,
      edad: params.edad,
      antiguedad_vsm: params.antiguedad_vsm,
    });
    return {
      score_value: res.value,
      score_label: getLabelKey(res.value, res.confidence),
      components: res.components,
      inputs_used: { periodDate: input.periodDate, userId: input.userId ?? null },
      confidence: res.confidence,
      citations: [
        {
          source: 'infonavit_tables_2026',
          url: 'https://portalmx.infonavit.org.mx/',
          period: '2026',
        },
      ],
      provenance: {
        sources: [{ name: 'infonavit_tables_2026', count: 1 }],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        user_id: input.userId ?? 'desconocido',
        salario_vsm: params.salario_mensual_vsm,
        edad: params.edad,
        antiguedad_vsm: params.antiguedad_vsm,
        monto_credito_max: res.components.monto_credito_max_mxn,
        tasa_pct: res.components.tasa_avg_pct,
        mensualidad_estimada: res.components.mensualidad_estimada_mxn,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default h11InfonavitCalculator;
