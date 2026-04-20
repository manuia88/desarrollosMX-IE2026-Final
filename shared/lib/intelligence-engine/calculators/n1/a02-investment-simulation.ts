// A02 Investment Simulation — 4 escenarios (conservador, base, optimista, stress)
// con ROI anual, cashflow, valor apreciado 10y, IRR 10y y payback. Plan 9.B.1.
// Catálogo 03.8 §A02. Tier 2. Categoría comprador.
//
// ESCENARIOS:
//   conservador : momentum_pct = N11 p25 (fallback 3%), tasa = macro + 1.0pp
//   base        : momentum_pct = N11 p50 (fallback 5%), tasa = macro baseline
//   optimista   : momentum_pct = N11 p75 (fallback 8%), tasa = macro − 0.5pp
//   stress      : momentum_pct = N11 p10 (fallback 0%), tasa = macro + 3.0pp
//
// FÓRMULAS (por escenario):
//   loan                 = propertyValue − downPayment
//   mensualidad_hipotec  = loan · (r/12·(1+r/12)^n) / ((1+r/12)^n − 1), n = loanYears·12
//   renta_mensual_est    = propertyValue · 0.005        // 0.5% regla MX
//   cashflow_mensual     = renta_mensual − mensualidad_hipotec
//   valor_apreciado_10y  = propertyValue · (1 + momentum_pct)^10
//   IRR_10y              = bisección sobre cashflows 10y (downPayment invertido,
//                          cashflows mensuales anualizados, venta final −comisión
//                          −ISR y descuenta saldo pendiente hipoteca)
//   payback_years        = años donde acumulado (plusvalía + cashflows) = downPayment
//
// SCORE (composite rating IRR escenario base):
//   IRR >= 8%  → 90
//   IRR 5-8%   → 70
//   IRR 0-5%   → 50
//   IRR < 0%   → 20
//
// ASSUMPTIONS inline (components.assumptions):
//   IVA_pct 0.16; plusvalia_exento_primera_venta true;
//   ISR_utilidad_pct 0.25; comision_venta_pct 0.05.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { composeConfidence } from '../confidence';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula:
    '4 escenarios (conservador/base/optimista/stress): ROI, cashflow, plusvalía10y, IRR10y, payback. Renta=0.5% valor/mes. Hipoteca amortización francesa. IRR bisección 10y flows. Score basado en IRR base.',
  sources: ['macro_series', 'market_prices_secondary', 'zone_scores'],
  weights: {
    renta_pct_mensual: 0.005,
    iva_pct: 0.16,
    isr_utilidad_pct: 0.25,
    comision_venta_pct: 0.05,
  },
  references: [
    {
      name: 'Banxico — TIIE28 y tasa hipotecaria promedio',
      url: 'https://www.banxico.org.mx/SieInternet/',
      period: 'mensual',
    },
    {
      name: 'SHF — Índice de precios vivienda',
      url: 'https://www.gob.mx/shf',
      period: 'trimestral',
    },
  ],
  confidence_thresholds: { high: 3, medium: 2, low: 1 },
  validity: { unit: 'months', value: 1 },
} as const;

export const reasoning_template =
  'Investment Simulation propiedad {property_value} MXN con DP {down_payment} MXN a {loan_years}y: IRR base {irr_base_pct}%, stress {irr_stress_pct}%, optimista {irr_optimista_pct}%. Renta est. {renta_mensual} MXN/mes. Cashflow base {cashflow_base} MXN/mes. Plusvalía 10y {plusvalia_10y_base}.';

export const ASSUMPTIONS = {
  IVA_pct: 0.16,
  plusvalia_exento_primera_venta: true,
  ISR_utilidad_pct: 0.25,
  comision_venta_pct: 0.05,
  renta_pct_mensual: 0.005, // 0.5% MX rule-of-thumb
} as const;

export const MOMENTUM_DEFAULTS = {
  p10: 0.0,
  p25: 0.03,
  p50: 0.05,
  p75: 0.08,
} as const;

export const MACRO_BASELINE_TASA = 0.12; // 12% anual MX fallback si macro ausente

export type A02Escenario = 'conservador' | 'base' | 'optimista' | 'stress';

export interface A02EscenarioResult extends Record<string, unknown> {
  readonly escenario: A02Escenario;
  readonly momentum_pct: number;
  readonly tasa_hipotecaria_pct: number;
  readonly mensualidad_hipotecaria_mxn: number;
  readonly renta_mensual_estimada_mxn: number;
  readonly cashflow_mensual_mxn: number;
  readonly valor_apreciado_10y_mxn: number;
  readonly plusvalia_10y_mxn: number;
  readonly roi_anual_pct: number;
  readonly irr_10y_pct: number;
  readonly payback_years: number;
}

export interface A02Components extends Record<string, unknown> {
  readonly property_value_mxn: number;
  readonly down_payment_mxn: number;
  readonly loan_mxn: number;
  readonly loan_years: number;
  readonly escenarios: {
    readonly conservador: A02EscenarioResult;
    readonly base: A02EscenarioResult;
    readonly optimista: A02EscenarioResult;
    readonly stress: A02EscenarioResult;
  };
  readonly assumptions: typeof ASSUMPTIONS;
  readonly missing_dimensions: readonly string[];
}

export interface A02MacroInput {
  readonly tasa_hipotecaria_avg: number; // fracción, ej 0.12
  readonly tiie28?: number;
}

export interface A02MomentumInput {
  readonly p10: number;
  readonly p25: number;
  readonly p50: number;
  readonly p75: number;
}

export interface A02RawInput {
  readonly propertyValue: number;
  readonly downPayment: number;
  readonly loanYears: number;
  readonly loanRateHint?: number; // override opcional
  readonly zoneId?: string;
  readonly macro?: A02MacroInput | null;
  readonly momentum?: A02MomentumInput | null;
}

export interface A02ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A02Components;
}

// ==================== Helpers financieros ====================

// Mensualidad hipotecaria francesa: monto · (r_m · (1+r_m)^n) / ((1+r_m)^n − 1)
export function monthlyPayment(loan: number, annualRate: number, years: number): number {
  if (loan <= 0) return 0;
  if (years <= 0) return 0;
  const n = years * 12;
  const rm = annualRate / 12;
  if (rm <= 0) return loan / n;
  const pow = (1 + rm) ** n;
  return (loan * (rm * pow)) / (pow - 1);
}

// Saldo pendiente de hipoteca después de M meses de pagos.
export function remainingLoanBalance(
  loan: number,
  annualRate: number,
  years: number,
  monthsPaid: number,
): number {
  if (loan <= 0) return 0;
  const n = years * 12;
  const rm = annualRate / 12;
  if (rm <= 0) return Math.max(0, loan - (loan / n) * monthsPaid);
  const pow_n = (1 + rm) ** n;
  const pow_p = (1 + rm) ** monthsPaid;
  const bal = loan * ((pow_n - pow_p) / (pow_n - 1));
  return Math.max(0, bal);
}

// NPV dado un rate (anual) y flujos anuales (year 0 = inversión inicial negativa).
function npv(annualRate: number, flows: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < flows.length; i++) {
    const f = flows[i] ?? 0;
    sum += f / (1 + annualRate) ** i;
  }
  return sum;
}

// IRR por bisección. flows[0] = inversión inicial negativa. Retorna fracción anual.
// Si no converge en [-0.99, 2] → clamp al extremo más cercano a 0 NPV signo.
export function computeIRR(flows: readonly number[], tolerance = 1e-6, maxIter = 200): number {
  if (flows.length < 2) return 0;
  let lo = -0.9;
  let hi = 2.0;
  let npvLo = npv(lo, flows);
  let npvHi = npv(hi, flows);
  // Si no hay cambio de signo → retornar clamp
  if (npvLo * npvHi > 0) {
    // Si ambos positivos → IRR > hi; si ambos negativos → IRR < lo.
    return npvLo > 0 ? hi : lo;
  }
  let mid = 0;
  for (let i = 0; i < maxIter; i++) {
    mid = (lo + hi) / 2;
    const npvMid = npv(mid, flows);
    if (Math.abs(npvMid) < tolerance) return mid;
    if (npvMid * npvLo < 0) {
      hi = mid;
      npvHi = npvMid;
    } else {
      lo = mid;
      npvLo = npvMid;
    }
  }
  return mid;
}

// Payback: primer año donde (downPayment recuperado) dado cashflows anuales acumulados
// más valor de venta neto si salida ese año. Simplificación: usa cashflow anual
// + plusvalía acumulada como recuperación progresiva.
function computePayback(
  downPayment: number,
  cashflowAnual: number,
  propertyValue: number,
  momentum_pct: number,
  maxYears = 30,
): number {
  if (downPayment <= 0) return 0;
  let acumulado = 0;
  for (let year = 1; year <= maxYears; year++) {
    acumulado += cashflowAnual;
    const plusvalia = propertyValue * ((1 + momentum_pct) ** year - 1);
    if (acumulado + plusvalia >= downPayment) {
      return year;
    }
  }
  return maxYears;
}

// ==================== Compute por escenario ====================

function computeEscenario(
  escenario: A02Escenario,
  input: A02RawInput,
  momentum_pct: number,
  tasa: number,
): A02EscenarioResult {
  const { propertyValue, downPayment, loanYears } = input;
  const loan = Math.max(0, propertyValue - downPayment);
  const mensualidad = monthlyPayment(loan, tasa, loanYears);
  const renta = propertyValue * ASSUMPTIONS.renta_pct_mensual;
  const cashflow = renta - mensualidad;
  const valor_10y = propertyValue * (1 + momentum_pct) ** 10;
  const plusvalia_10y = valor_10y - propertyValue;

  // ROI anual (simplificado): (cashflow·12 + plusvalía_10y/10) / downPayment
  const roi_anual = downPayment > 0 ? (cashflow * 12 + plusvalia_10y / 10) / downPayment : 0;

  // IRR 10y: flujo año 0 = -downPayment. Años 1-9 = cashflow·12.
  // Año 10 = cashflow·12 + venta_neta.
  //   venta_neta = valor_10y - comision(5%) - ISR(25% utilidad) - saldo_hipoteca_pendiente
  const monthsPaid = Math.min(loanYears * 12, 120);
  const saldo_10y = remainingLoanBalance(loan, tasa, loanYears, monthsPaid);
  const comision_venta = valor_10y * ASSUMPTIONS.comision_venta_pct;
  const utilidad = Math.max(0, valor_10y - propertyValue - comision_venta);
  const isr = utilidad * ASSUMPTIONS.ISR_utilidad_pct;
  const venta_neta = valor_10y - comision_venta - isr - saldo_10y;

  const flows: number[] = [-downPayment];
  for (let y = 1; y <= 10; y++) {
    const anual = cashflow * 12;
    if (y === 10) flows.push(anual + venta_neta);
    else flows.push(anual);
  }
  const irr = computeIRR(flows);

  const payback = computePayback(downPayment, cashflow * 12, propertyValue, momentum_pct);

  return {
    escenario,
    momentum_pct: Number(momentum_pct.toFixed(4)),
    tasa_hipotecaria_pct: Number((tasa * 100).toFixed(3)),
    mensualidad_hipotecaria_mxn: Math.round(mensualidad),
    renta_mensual_estimada_mxn: Math.round(renta),
    cashflow_mensual_mxn: Math.round(cashflow),
    valor_apreciado_10y_mxn: Math.round(valor_10y),
    plusvalia_10y_mxn: Math.round(plusvalia_10y),
    roi_anual_pct: Number((roi_anual * 100).toFixed(3)),
    irr_10y_pct: Number((irr * 100).toFixed(3)),
    payback_years: payback,
  };
}

// ==================== Compute principal ====================

function scoreFromBaseIRR(irr_pct: number): number {
  if (irr_pct >= 8) return 90;
  if (irr_pct >= 5) return 70;
  if (irr_pct >= 0) return 50;
  return 20;
}

export function computeA02InvestmentSimulation(input: A02RawInput): A02ComputeResult {
  const missing: string[] = [];
  const momentum: A02MomentumInput = input.momentum ?? MOMENTUM_DEFAULTS;
  if (!input.momentum) missing.push('N11_momentum');

  const macro_base_tasa =
    input.loanRateHint !== undefined
      ? input.loanRateHint
      : (input.macro?.tasa_hipotecaria_avg ?? MACRO_BASELINE_TASA);
  if (!input.macro && input.loanRateHint === undefined) missing.push('macro_series');

  const escenarios = {
    conservador: computeEscenario('conservador', input, momentum.p25, macro_base_tasa + 0.01),
    base: computeEscenario('base', input, momentum.p50, macro_base_tasa),
    optimista: computeEscenario('optimista', input, momentum.p75, macro_base_tasa - 0.005),
    stress: computeEscenario('stress', input, momentum.p10, macro_base_tasa + 0.03),
  };

  const value = scoreFromBaseIRR(escenarios.base.irr_10y_pct);

  // Confidence: insufficient si inputs base inválidos, low si faltan ambas deps,
  // medium si falta una, high si completo.
  let confidence: Confidence;
  if (input.propertyValue <= 0 || input.downPayment < 0 || input.loanYears <= 0) {
    confidence = 'insufficient_data';
  } else if (missing.length >= 2) {
    confidence = 'low';
  } else if (missing.length === 1) {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }

  const loan = Math.max(0, input.propertyValue - input.downPayment);

  return {
    value,
    confidence,
    components: {
      property_value_mxn: input.propertyValue,
      down_payment_mxn: input.downPayment,
      loan_mxn: loan,
      loan_years: input.loanYears,
      escenarios,
      assumptions: ASSUMPTIONS,
      missing_dimensions: missing,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a02.insufficient';
  if (value >= 85) return 'ie.score.a02.excelente';
  if (value >= 60) return 'ie.score.a02.buena';
  if (value >= 40) return 'ie.score.a02.marginal';
  return 'ie.score.a02.mala';
}

export const a02InvestmentSimulationCalculator: Calculator = {
  scoreId: 'A02',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    // Prod path: params deben incluir propertyValue/downPayment/loanYears. Sin params
    // → insufficient_data. Tests invocan computeA02InvestmentSimulation() directo.
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams =
      typeof params.propertyValue === 'number' && typeof params.downPayment === 'number';
    const confidence: Confidence = hasParams ? composeConfidence(['medium']) : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeA02InvestmentSimulation directo'
          : 'params propertyValue/downPayment/loanYears no provistos',
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
          source: 'market_prices_secondary',
          url: 'https://www.gob.mx/shf',
          period: 'trimestral',
        },
      ],
      provenance: {
        sources: [
          { name: 'macro_series', count: 0 },
          { name: 'market_prices_secondary', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { user_id: input.userId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a02InvestmentSimulationCalculator;
