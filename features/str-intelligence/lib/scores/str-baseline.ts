// STR Baseline score (FASE 07b / BLOQUE 7b.A / MÓDULO 7b.A.3).
//
// Score 0-100 por market × periodo (mensual, rolling 12m) ponderando:
//   occupancy_component (40%)   — occupancy_rate_avg vs benchmark.
//   revpar_component    (30%)   — RevPAR avg vs benchmark.
//   volatility_component (15%)  — 100 − cv(occupancy, 12m) × 100 (low CV = mejor).
//   sample_component    (15%)   — min(sample_months × 100/12, 100).
//
// Confidence cascade (alineada con FASE 07 confidence_cascade):
//   'high'   — ≥12 meses de datos + benchmark disponible.
//   'medium' — ≥6 meses de datos o benchmark ausente.
//   'low'    — <6 meses.
//   'insufficient_data' — 0 meses.
//
// El score es puro — no persiste. La tabla zone_scores (FASE 08) se
// poblará por un worker separado cuando exista. Este módulo se usa
// desde tRPC strScores.* con materialización on-demand + cache en memoria.

export const STR_BASELINE_WEIGHTS = {
  occupancy: 0.4,
  revpar: 0.3,
  volatility: 0.15,
  sample: 0.15,
} as const;

export interface StrBaselineInputPeriod {
  readonly period: string; // ISO "YYYY-MM-DD".
  readonly occupancy_rate: number | null;
  readonly revpar_minor: number | null;
}

export interface StrBaselineBenchmark {
  readonly occupancy_rate_avg: number | null;
  readonly revpar_minor_avg: number | null;
}

export interface StrBaselineInput {
  readonly periods: readonly StrBaselineInputPeriod[];
  // Benchmark opcional (e.g., CDMX ciudad para comparar Roma Sur).
  readonly benchmark?: StrBaselineBenchmark | null;
}

export type Confidence = 'high' | 'medium' | 'low' | 'insufficient_data';

export interface StrBaselineResult {
  readonly score: number; // 0-100.
  readonly confidence: Confidence;
  readonly components: {
    readonly occupancy: number;
    readonly revpar: number;
    readonly volatility: number;
    readonly sample: number;
  };
  readonly metrics: {
    readonly periods_available: number;
    readonly occupancy_avg: number | null;
    readonly occupancy_cv: number | null;
    readonly revpar_avg_minor: number | null;
    readonly benchmark_ratio_occupancy: number | null;
    readonly benchmark_ratio_revpar: number | null;
  };
}

function mean(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((acc, v) => acc + v, 0) / xs.length;
}

// Coefficient of variation = stddev / mean. Undefined if mean=0.
function cv(xs: readonly number[]): number | null {
  const avg = mean(xs);
  if (avg == null || avg === 0 || xs.length < 2) return null;
  const variance = xs.reduce((acc, v) => acc + (v - avg) ** 2, 0) / xs.length;
  const stddev = Math.sqrt(variance);
  return stddev / avg;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export function computeStrBaseline(input: StrBaselineInput): StrBaselineResult {
  const occupancyValues = input.periods
    .map((p) => p.occupancy_rate)
    .filter((v): v is number => v != null && Number.isFinite(v));

  const revparValues = input.periods
    .map((p) => p.revpar_minor)
    .filter((v): v is number => v != null && Number.isFinite(v));

  const periodsAvailable = input.periods.length;
  const occupancyAvg = mean(occupancyValues);
  const occupancyCv = cv(occupancyValues);
  const revparAvg = mean(revparValues);

  // Short-circuit: sin periodos el score es 0 (evita que el valor neutro
  // de volatilidad contamine el resultado cuando no hay evidencia alguna).
  if (periodsAvailable === 0) {
    return {
      score: 0,
      confidence: 'insufficient_data',
      components: { occupancy: 0, revpar: 0, volatility: 0, sample: 0 },
      metrics: {
        periods_available: 0,
        occupancy_avg: null,
        occupancy_cv: null,
        revpar_avg_minor: null,
        benchmark_ratio_occupancy: null,
        benchmark_ratio_revpar: null,
      },
    };
  }

  const benchmark = input.benchmark ?? null;
  const benchmarkRatioOccupancy =
    occupancyAvg != null && benchmark?.occupancy_rate_avg
      ? occupancyAvg / benchmark.occupancy_rate_avg
      : null;
  const benchmarkRatioRevpar =
    revparAvg != null && benchmark?.revpar_minor_avg
      ? revparAvg / benchmark.revpar_minor_avg
      : null;

  // Occupancy component (40%): si hay benchmark, escala ratio [0.5..1.5] → [0..100];
  // si no, escala absoluto occupancy [0..1] × 100.
  const occupancyComponent = (() => {
    if (benchmarkRatioOccupancy != null) {
      const scaled = (benchmarkRatioOccupancy - 0.5) / (1.5 - 0.5);
      return clamp100(clamp01(scaled) * 100);
    }
    if (occupancyAvg != null) return clamp100(occupancyAvg * 100);
    return 0;
  })();

  // RevPAR component (30%): misma lógica.
  const revparComponent = (() => {
    if (benchmarkRatioRevpar != null) {
      const scaled = (benchmarkRatioRevpar - 0.5) / (1.5 - 0.5);
      return clamp100(clamp01(scaled) * 100);
    }
    // Sin benchmark, normaliza revpar absoluto con una cota empírica
    // pragmática para MX (3000 MXN/día promedio → 100). Revisar a futuro.
    if (revparAvg != null) return clamp100((revparAvg / 300_000) * 100);
    return 0;
  })();

  // Volatility component (15%): 100 − cv × 100; cv alto → score bajo.
  const volatilityComponent = (() => {
    if (occupancyCv == null) return 50; // valor neutro cuando no hay suficientes puntos.
    return clamp100(100 - occupancyCv * 100);
  })();

  // Sample component (15%): meses disponibles / 12 × 100.
  const sampleComponent = clamp100((periodsAvailable / 12) * 100);

  const score =
    occupancyComponent * STR_BASELINE_WEIGHTS.occupancy +
    revparComponent * STR_BASELINE_WEIGHTS.revpar +
    volatilityComponent * STR_BASELINE_WEIGHTS.volatility +
    sampleComponent * STR_BASELINE_WEIGHTS.sample;

  const confidence: Confidence = (() => {
    if (periodsAvailable === 0) return 'insufficient_data';
    if (periodsAvailable >= 12 && benchmark != null) return 'high';
    if (periodsAvailable >= 6) return 'medium';
    return 'low';
  })();

  return {
    score: Math.round(score * 100) / 100,
    confidence,
    components: {
      occupancy: Math.round(occupancyComponent * 100) / 100,
      revpar: Math.round(revparComponent * 100) / 100,
      volatility: Math.round(volatilityComponent * 100) / 100,
      sample: Math.round(sampleComponent * 100) / 100,
    },
    metrics: {
      periods_available: periodsAvailable,
      occupancy_avg: occupancyAvg != null ? Math.round(occupancyAvg * 10000) / 10000 : null,
      occupancy_cv: occupancyCv != null ? Math.round(occupancyCv * 10000) / 10000 : null,
      revpar_avg_minor: revparAvg != null ? Math.round(revparAvg) : null,
      benchmark_ratio_occupancy:
        benchmarkRatioOccupancy != null
          ? Math.round(benchmarkRatioOccupancy * 10000) / 10000
          : null,
      benchmark_ratio_revpar:
        benchmarkRatioRevpar != null ? Math.round(benchmarkRatioRevpar * 10000) / 10000 : null,
    },
  };
}
