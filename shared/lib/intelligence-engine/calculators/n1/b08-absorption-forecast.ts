// B08 Absorption Forecast — score N1 dev que proyecta ventas 12 meses × 3
// escenarios (optimista/base/pesimista) y estima fecha fin absorción.
// Plan FASE 09 MÓDULO 9.C.5. Catálogo 03.8 §B08.
//
// Pipeline:
//   1) Regresión lineal simple sobre ventas últimos 6m (slope + intercept).
//   2) Estacionalidad trimestral: Q1=0.9, Q2=1.1, Q3=0.95, Q4=1.05.
//   3) Ajuste multiplicativo con z-scores de señales IE (D8 weights runtime):
//        adj = 1 + (0.30·z(N11) + 0.25·z(B01) + 0.25·z(B04) + 0.20·z_inv(macro_tiie)) × 0.5
//   4) 3 escenarios sobre base:
//        optimista = adj × 1.15
//        base      = adj × 1.00
//        pesimista = adj × 0.85
//   5) Proyección mensual 12 meses × 3 escenarios (components.monthly_projection).
//   6) fecha_fin_estimada_base = mes en que units_remaining_acumulado_base ≤ 1.
//   7) score_value: velocidad absorción normalizada 0-100
//      (100 = todas en 6m, 50 = en 18m, 0 = >36m) via interpolación.
//
// Tier 3 — requiere ≥50 proyectos zona + 6m data ventas. Si falta ventas 6m
// completos, D9 degrada a insufficient_data pero retorna shape de arrays.
// Category: dev → persist en project_scores.
//
// D8 runtime weights: score_weights(score_id='B08', country_code) override
//   { N11, B01, B04, macro_tiie }. Fallback defaults methodology.weights.
//
// z_score(x) = (x - 50) / 25 (asumiendo scores 0-100 centrados en 50, std~25).
// z_score_inverse para macro_tiie: valores TIIE más altos = contexto peor →
//   z_inv = (baseline_tiie - tiie) / baseline_std.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { loadWeights, type WeightsMap } from '../weights-loader';

export const version = '1.0.0';

export const DEFAULT_WEIGHTS: WeightsMap = {
  N11: 0.3,
  B01: 0.25,
  B04: 0.25,
  macro_tiie: 0.2,
};

// Baseline TIIE28 histórica para z_score_inverse (proxy: mediana 2010-2025 ≈ 6.5%).
const TIIE_BASELINE = 6.5;
const TIIE_STD = 2.5;

// Estacionalidad por trimestre (1-indexado 1..4 sobre mes del año).
const SEASONALITY: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 0.9,
  2: 1.1,
  3: 0.95,
  4: 1.05,
};

export const methodology = {
  formula:
    'base_m = intercept + slope·m (regresión ventas 6m) · SEASONALITY[trimestre]. adj = 1 + (0.30·z(N11) + 0.25·z(B01) + 0.25·z(B04) + 0.20·z_inv(macro_tiie)) · 0.5. optimista/base/pesimista = adj · {1.15, 1.00, 0.85}. score = interp(meses_absorcion_base → 0-100).',
  sources: [
    'project_sales',
    'zone_scores:N11',
    'zone_scores:B01',
    'project_scores:B04',
    'macro_series:tiie28',
  ],
  weights: { ...DEFAULT_WEIGHTS },
  dependencies: [
    { score_id: 'N11', weight: 0.3, role: 'momentum_zona' },
    { score_id: 'B01', weight: 0.25, role: 'demand_heatmap' },
    { score_id: 'B04', weight: 0.25, role: 'product_market_fit' },
    { score_id: 'macro_tiie', weight: 0.2, role: 'contexto_tasa' },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §B08 Absorption Forecast',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b08-absorption-forecast',
    },
    {
      name: 'Plan FASE 09 §9.C.5',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  tier_gate: { min_proyectos_zona: 50, min_meses_data: 6 },
} as const;

export const reasoning_template =
  'Absorption Forecast de {project_id} obtiene {score_value}. Velocidad base: {ventas_base_mensual}/mes. Adjustment multiplier {adjustment_multiplier} por N11={N11}, B01={B01}, B04={B04}, TIIE={macro_tiie}. Fin absorción base estimado: {fecha_fin_base}. Confianza {confidence}.';

export type AbsorptionBucket = 'rapida' | 'saludable' | 'lenta' | 'estancada' | 'insufficient';

export interface B08VentaMensual {
  readonly month: string; // YYYY-MM del periodo real histórico
  readonly count: number;
}

export interface B08MonthlyProjection {
  readonly month: string; // YYYY-MM proyectado (12 meses hacia adelante desde period)
  readonly optimista: number;
  readonly base: number;
  readonly pesimista: number;
}

export interface B08Components extends Record<string, unknown> {
  readonly monthly_projection: readonly B08MonthlyProjection[];
  readonly regression: {
    readonly slope: number;
    readonly intercept: number;
    readonly ventas_promedio_6m: number;
  };
  readonly adjustment_multiplier: number;
  readonly z_scores: {
    readonly N11: number;
    readonly B01: number;
    readonly B04: number;
    readonly macro_tiie_inverse: number;
  };
  readonly fecha_fin_estimada_base: string | null;
  readonly meses_absorcion_base: number | null;
  readonly total_ventas_12m: {
    readonly optimista: number;
    readonly base: number;
    readonly pesimista: number;
  };
  readonly weights_applied: Readonly<Record<string, number>>;
  readonly tier_gate_passed: boolean;
  readonly bucket: AbsorptionBucket;
}

export interface B08RawInput {
  readonly project_id: string;
  readonly ventas_ultimos_6m: readonly B08VentaMensual[];
  readonly momentum_zone_n11: number; // 0-100
  readonly b01_demand: number; // 0-100
  readonly b04_pmf: number; // 0-100
  readonly macro_tiie: number; // TIIE28 % ej 10.5
  readonly units_remaining: number;
  readonly period: string; // YYYY-MM-DD — base period del forecast
  readonly proyectos_zona?: number; // tier gate (default 50 si no pasa → gate passed)
}

export interface B08ComputeOptions {
  readonly weightsOverride?: WeightsMap;
}

export interface B08ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B08Components;
  readonly tier_gated: boolean;
}

function linearRegression(points: readonly B08VentaMensual[]): {
  slope: number;
  intercept: number;
  avg: number;
} {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, avg: 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  points.forEach((p, idx) => {
    const x = idx + 1; // 1..n
    const y = p.count;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  const avg = sumY / n;
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: avg, avg };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept, avg };
}

function quarterOf(monthIdx: number): 1 | 2 | 3 | 4 {
  // monthIdx 1..12
  if (monthIdx <= 3) return 1;
  if (monthIdx <= 6) return 2;
  if (monthIdx <= 9) return 3;
  return 4;
}

function zScore(value: number, mean: number = 50, std: number = 25): number {
  if (std <= 0) return 0;
  return (value - mean) / std;
}

function zScoreInverseTiie(tiie: number): number {
  return (TIIE_BASELINE - tiie) / TIIE_STD;
}

function addMonths(yyyymmdd: string, months: number): string {
  const parts = yyyymmdd.slice(0, 10).split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2] ?? '01');
  if (!Number.isFinite(y) || !Number.isFinite(m)) return yyyymmdd;
  const base = new Date(Date.UTC(y, m - 1 + months, Math.min(d || 1, 28)));
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

function velocityScoreFromMeses(meses: number | null): number {
  // 100 = 6m, 50 = 18m, 0 = ≥36m. Interpolación lineal por segmentos.
  if (meses === null || !Number.isFinite(meses)) return 0;
  if (meses <= 6) return 100;
  if (meses >= 36) return 0;
  if (meses <= 18) {
    // 6 → 100, 18 → 50
    return Math.round(100 - ((meses - 6) / 12) * 50);
  }
  // 18 → 50, 36 → 0
  return Math.round(50 - ((meses - 18) / 18) * 50);
}

function bucketFor(value: number, tier_passed: boolean): AbsorptionBucket {
  if (!tier_passed) return 'insufficient';
  if (value >= 75) return 'rapida';
  if (value >= 50) return 'saludable';
  if (value >= 25) return 'lenta';
  return 'estancada';
}

function confidenceFor(ventas_count: number, tier_passed: boolean): Confidence {
  if (!tier_passed) return 'insufficient_data';
  if (ventas_count >= 6) return 'high';
  if (ventas_count >= 3) return 'medium';
  if (ventas_count >= 1) return 'low';
  return 'insufficient_data';
}

export function computeB08AbsorptionForecast(
  input: B08RawInput,
  options: B08ComputeOptions = {},
): B08ComputeResult {
  const {
    project_id: _project_id,
    ventas_ultimos_6m,
    momentum_zone_n11,
    b01_demand,
    b04_pmf,
    macro_tiie,
    units_remaining,
    period,
    proyectos_zona = 50,
  } = input;

  const weights = options.weightsOverride ?? DEFAULT_WEIGHTS;
  const wN11 = weights.N11 ?? DEFAULT_WEIGHTS.N11 ?? 0.3;
  const wB01 = weights.B01 ?? DEFAULT_WEIGHTS.B01 ?? 0.25;
  const wB04 = weights.B04 ?? DEFAULT_WEIGHTS.B04 ?? 0.25;
  const wTiie = weights.macro_tiie ?? DEFAULT_WEIGHTS.macro_tiie ?? 0.2;

  const tier_passed =
    proyectos_zona >= methodology.tier_gate.min_proyectos_zona &&
    ventas_ultimos_6m.length >= methodology.tier_gate.min_meses_data;

  const weights_applied: Record<string, number> = {
    N11: Number(wN11.toFixed(4)),
    B01: Number(wB01.toFixed(4)),
    B04: Number(wB04.toFixed(4)),
    macro_tiie: Number(wTiie.toFixed(4)),
  };

  // Regresión + z-scores (calculados siempre para observabilidad).
  const regression = linearRegression(ventas_ultimos_6m);
  const zN11 = zScore(momentum_zone_n11);
  const zB01 = zScore(b01_demand);
  const zB04 = zScore(b04_pmf);
  const zTiie = zScoreInverseTiie(macro_tiie);

  const adjustmentRaw = 1 + (wN11 * zN11 + wB01 * zB01 + wB04 * zB04 + wTiie * zTiie) * 0.5;
  // Clamp para evitar explosión numérica extrema en proyección.
  const adjustment_multiplier = Math.max(0.3, Math.min(2.5, adjustmentRaw));

  // Proyección 12 meses hacia adelante desde 'period'.
  const nHistoric = ventas_ultimos_6m.length;
  const monthly_projection: B08MonthlyProjection[] = [];
  let acumulado_base = 0;
  let fecha_fin_estimada_base: string | null = null;
  let meses_absorcion_base: number | null = null;

  for (let offset = 1; offset <= 12; offset += 1) {
    const x = nHistoric + offset; // continuación de la serie
    const trendValue = regression.intercept + regression.slope * x;
    const baseProjMonth = Math.max(0, trendValue);
    const monthStr = addMonths(period, offset);
    const monthNum = Number(monthStr.split('-')[1] ?? '1');
    const q = quarterOf(Number.isFinite(monthNum) ? monthNum : 1);
    const seasonal = SEASONALITY[q];
    const seasonalized = baseProjMonth * seasonal;
    const baseVal = seasonalized * adjustment_multiplier;
    const optimistaVal = baseVal * 1.15;
    const pesimistaVal = baseVal * 0.85;
    const optimista = Math.max(0, Math.round(optimistaVal * 100) / 100);
    const base = Math.max(0, Math.round(baseVal * 100) / 100);
    const pesimista = Math.max(0, Math.round(pesimistaVal * 100) / 100);
    monthly_projection.push({ month: monthStr, optimista, base, pesimista });

    if (fecha_fin_estimada_base === null) {
      acumulado_base += base;
      if (units_remaining - acumulado_base <= 1) {
        fecha_fin_estimada_base = monthStr;
        meses_absorcion_base = offset;
      }
    }
  }

  // Si 12m no alcanzó: extrapolar linealmente meses restantes usando promedio escenario base.
  if (fecha_fin_estimada_base === null && monthly_projection.length === 12) {
    const sum12 = monthly_projection.reduce((acc, m) => acc + m.base, 0);
    const avgBase = sum12 / 12;
    if (avgBase > 0) {
      const unitsRestantes = Math.max(0, units_remaining - sum12);
      const extraMeses = Math.ceil(unitsRestantes / avgBase);
      meses_absorcion_base = 12 + extraMeses;
      // No fijamos fecha_fin_estimada_base (queda null indicando >12m proyectados).
    } else {
      meses_absorcion_base = null;
    }
  }

  const total_ventas_12m = monthly_projection.reduce(
    (acc, m) => ({
      optimista: acc.optimista + m.optimista,
      base: acc.base + m.base,
      pesimista: acc.pesimista + m.pesimista,
    }),
    { optimista: 0, base: 0, pesimista: 0 },
  );

  const value = tier_passed ? velocityScoreFromMeses(meses_absorcion_base) : 0;
  const confidence = confidenceFor(ventas_ultimos_6m.length, tier_passed);

  return {
    value,
    confidence,
    tier_gated: !tier_passed,
    components: {
      monthly_projection,
      regression: {
        slope: Number(regression.slope.toFixed(4)),
        intercept: Number(regression.intercept.toFixed(4)),
        ventas_promedio_6m: Number(regression.avg.toFixed(2)),
      },
      adjustment_multiplier: Number(adjustment_multiplier.toFixed(4)),
      z_scores: {
        N11: Number(zN11.toFixed(4)),
        B01: Number(zB01.toFixed(4)),
        B04: Number(zB04.toFixed(4)),
        macro_tiie_inverse: Number(zTiie.toFixed(4)),
      },
      fecha_fin_estimada_base,
      meses_absorcion_base,
      total_ventas_12m: {
        optimista: Number(total_ventas_12m.optimista.toFixed(2)),
        base: Number(total_ventas_12m.base.toFixed(2)),
        pesimista: Number(total_ventas_12m.pesimista.toFixed(2)),
      },
      weights_applied,
      tier_gate_passed: tier_passed,
      bucket: bucketFor(value, tier_passed),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b08.insufficient';
  if (value >= 75) return 'ie.score.b08.rapida';
  if (value >= 50) return 'ie.score.b08.saludable';
  if (value >= 25) return 'ie.score.b08.lenta';
  return 'ie.score.b08.estancada';
}

export const b08AbsorptionForecastCalculator: Calculator = {
  scoreId: 'B08',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    // Prod path: fetch ventas 6m + N11 + B01 + B04 + macro_series tiie28.
    // H1 degrada a insufficient_data si projectId ausente o tabla vacía.
    const computed_at = new Date().toISOString();
    const runtimeWeights = await loadWeights(supabase, 'B08', input.countryCode).catch(() => null);
    const projectId = input.projectId;
    const weights_applied: Record<string, number> = {};
    for (const [dim, w] of Object.entries(runtimeWeights ?? DEFAULT_WEIGHTS)) {
      weights_applied[dim] = Number(Number(w).toFixed(4));
    }
    const confidence: Confidence = 'insufficient_data';
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: projectId
          ? 'B08 requiere ventas 6m + N11 + B01 + B04 + macro_series:tiie28. Use computeB08AbsorptionForecast(rawInput) en tests.'
          : 'B08 requiere projectId para fetch ventas + dependencias.',
        monthly_projection: [],
        regression: { slope: 0, intercept: 0, ventas_promedio_6m: 0 },
        adjustment_multiplier: 1,
        z_scores: { N11: 0, B01: 0, B04: 0, macro_tiie_inverse: 0 },
        fecha_fin_estimada_base: null,
        meses_absorcion_base: null,
        total_ventas_12m: { optimista: 0, base: 0, pesimista: 0 },
        weights_applied,
        tier_gate_passed: false,
        bucket: 'insufficient' as AbsorptionBucket,
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: projectId ?? null,
        weights_source: runtimeWeights ? 'score_weights' : 'methodology_default',
      },
      confidence,
      citations: [
        { source: 'project_sales', period: input.periodDate },
        { source: 'zone_scores:N11', period: input.periodDate },
        { source: 'zone_scores:B01', period: input.periodDate },
        { source: 'project_scores:B04', period: input.periodDate },
        { source: 'macro_series:tiie28', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'project_sales', count: 0 },
          { name: 'zone_scores', count: 0 },
          { name: 'macro_series', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        project_id: projectId ?? 'desconocido',
        ventas_base_mensual: 0,
        adjustment_multiplier: 1,
        N11: 'n/a',
        B01: 'n/a',
        B04: 'n/a',
        macro_tiie: 'n/a',
        fecha_fin_base: 'n/a',
      },
    };
  },
};

export default b08AbsorptionForecastCalculator;
