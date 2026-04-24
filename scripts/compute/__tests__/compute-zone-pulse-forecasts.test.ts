import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildForecastSeries,
  computeMovingAverage,
  computeStdDev,
  type ForecastSeriesEntry,
} from '../09_compute-zone-pulse-forecasts.ts';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

function makeConstantHistory(value: number, n: number): number[] {
  return Array.from({ length: n }, () => value);
}

function makeLinearHistory(start: number, step: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => start + step * i);
}

describe('computeMovingAverage', () => {
  it('constant [50]*30 → 50', () => {
    const values = makeConstantHistory(50, 30);
    expect(computeMovingAverage(values)).toBe(50);
  });

  it('[10,20,30,40,50] → 30', () => {
    expect(computeMovingAverage([10, 20, 30, 40, 50])).toBe(30);
  });

  it('empty array throws', () => {
    expect(() => computeMovingAverage([])).toThrow(/empty array/);
  });
});

describe('computeStdDev', () => {
  it('constant array → 0', () => {
    expect(computeStdDev(makeConstantHistory(42, 30))).toBe(0);
  });

  it('[10,20,30,40,50] → population stddev sqrt(200) ≈ 14.1421', () => {
    const s = computeStdDev([10, 20, 30, 40, 50]);
    expect(s).toBeCloseTo(Math.sqrt(200), 4);
    expect(s).toBeCloseTo(14.1421, 3);
  });
});

describe('buildForecastSeries', () => {
  const REFERENCE = new Date(Date.UTC(2026, 3, 24)); // 2026-04-24

  it('30 days input + horizon 30 → returns 30 entries', () => {
    const history = makeConstantHistory(55, 30);
    const series = buildForecastSeries(history, 30, REFERENCE);
    expect(series).toHaveLength(30);
  });

  it('first entry is tomorrow, last entry is today+horizon', () => {
    const history = makeConstantHistory(55, 30);
    const series = buildForecastSeries(history, 30, REFERENCE);
    const first = series[0];
    const last = series[series.length - 1];
    expect(first?.forecast_date).toBe('2026-04-25');
    expect(last?.forecast_date).toBe('2026-05-24');
  });

  it('values are clamped to [0, 100]', () => {
    // history mean = 120 (out of range) → must clamp down to 100
    const history = makeConstantHistory(120, 30);
    const series = buildForecastSeries(history, 5, REFERENCE);
    for (const e of series) {
      expect(e.value).toBeGreaterThanOrEqual(0);
      expect(e.value).toBeLessThanOrEqual(100);
      expect(e.value_lower).toBeGreaterThanOrEqual(0);
      expect(e.value_lower).toBeLessThanOrEqual(100);
      expect(e.value_upper).toBeGreaterThanOrEqual(0);
      expect(e.value_upper).toBeLessThanOrEqual(100);
    }
  });

  it('value_lower ≤ value ≤ value_upper for every entry', () => {
    const history = makeLinearHistory(10, 2, 30); // 10..68
    const series = buildForecastSeries(history, 10, REFERENCE);
    expect(series.length).toBeGreaterThan(0);
    for (const e of series) {
      expect(e.value_lower).toBeLessThanOrEqual(e.value);
      expect(e.value).toBeLessThanOrEqual(e.value_upper);
    }
  });

  it('< 30 data points throws', () => {
    const short = makeConstantHistory(50, 29);
    expect(() => buildForecastSeries(short, 30, REFERENCE)).toThrow(/insufficient data/);
  });

  it('all entries have methodology === "moving_avg_v1"', () => {
    const history = makeConstantHistory(40, 30);
    const series = buildForecastSeries(history, 30, REFERENCE);
    for (const e of series) {
      expect(e.methodology).toBe('moving_avg_v1');
    }
  });

  it('dates are monotonic ascending without gaps (1 day apart)', () => {
    const history = makeConstantHistory(50, 30);
    const series = buildForecastSeries(history, 30, REFERENCE);
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      const curr = series[i];
      if (!prev || !curr) throw new Error('unexpected undefined');
      const prevMs = Date.parse(`${prev.forecast_date}T00:00:00Z`);
      const currMs = Date.parse(`${curr.forecast_date}T00:00:00Z`);
      expect(currMs - prevMs).toBe(86400000);
    }
  });

  it('horizon=0 → returns empty array', () => {
    const history = makeConstantHistory(50, 30);
    const series = buildForecastSeries(history, 0, REFERENCE);
    expect(series).toEqual([]);
  });

  it('constant history → stddev=0 → value_lower = value = value_upper', () => {
    const history = makeConstantHistory(50, 30);
    const series = buildForecastSeries(history, 5, REFERENCE);
    for (const e of series) {
      expect(e.value).toBe(50);
      expect(e.value_lower).toBe(50);
      expect(e.value_upper).toBe(50);
    }
  });

  it('uses only last 30 of history when more provided (tail selection)', () => {
    // First 60 are zeros, last 30 are 80s. Mean should reflect only the 80s.
    const history: number[] = [...makeConstantHistory(0, 60), ...makeConstantHistory(80, 30)];
    const series = buildForecastSeries(history, 3, REFERENCE);
    const sample: ForecastSeriesEntry | undefined = series[0];
    expect(sample).toBeDefined();
    expect(sample?.value).toBe(80);
    expect(sample?.value_lower).toBe(80);
    expect(sample?.value_upper).toBe(80);
  });
});
