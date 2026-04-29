import type { UpgDisclosure } from './types';

export interface BenchmarkCohortMetric {
  readonly desarrolladoraId: string;
  readonly value: number;
}

export interface BenchmarkComputeInput {
  readonly metric: string;
  readonly value: number;
  readonly cohort: readonly BenchmarkCohortMetric[];
}

export interface BenchmarkComputeResult {
  readonly metric: string;
  readonly value: number;
  readonly percentile: number;
  readonly cohortSize: number;
  readonly cohortMedian: number;
  readonly cohortTop10: number;
  readonly cohortTop25: number;
  readonly disclosure: UpgDisclosure;
}

export function percentileOf(value: number, sortedAsc: readonly number[]): number {
  if (sortedAsc.length === 0) return 0;
  let countBelowOrEq = 0;
  for (const v of sortedAsc) {
    if (v <= value) countBelowOrEq++;
    else break;
  }
  return Math.round((countBelowOrEq / sortedAsc.length) * 100);
}

function quantile(sortedAsc: readonly number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) {
    const only = sortedAsc[0];
    return only ?? 0;
  }
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const a = sortedAsc[base] ?? 0;
  const b = sortedAsc[base + 1] ?? a;
  return a + rest * (b - a);
}

export function runBenchmarkEngine(input: BenchmarkComputeInput): BenchmarkComputeResult {
  const sortedAsc = input.cohort.map((c) => c.value).sort((a, b) => a - b);
  const cohortSize = sortedAsc.length;

  const percentile = percentileOf(input.value, sortedAsc);
  const cohortMedian = quantile(sortedAsc, 0.5);
  const cohortTop25 = quantile(sortedAsc, 0.75);
  const cohortTop10 = quantile(sortedAsc, 0.9);

  const disclosure: UpgDisclosure =
    cohortSize >= 20 ? 'observed' : cohortSize >= 5 ? 'mixed' : 'synthetic';

  return {
    metric: input.metric,
    value: input.value,
    percentile,
    cohortSize,
    cohortMedian: Number(cohortMedian.toFixed(4)),
    cohortTop10: Number(cohortTop10.toFixed(4)),
    cohortTop25: Number(cohortTop25.toFixed(4)),
    disclosure,
  };
}

export const BENCHMARK_METRICS = [
  'absorption_rate_monthly',
  'price_per_m2_avg_mxn',
  'days_to_sell_avg',
  'units_delivered_on_time_pct',
] as const;

export type BenchmarkMetric = (typeof BENCHMARK_METRICS)[number];
