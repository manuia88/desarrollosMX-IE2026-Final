import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aggregateAnnual,
  buildSignatureVector,
  classifyClimateType,
  computeSlope,
  computeSyntheticMonthly,
  computeSyntheticYear,
  cosineSimilarity,
  detectAnomalies,
  findTopTwins,
  hashSeed,
  type MonthlyClimate,
  mean,
  serializeVector12,
  stddev,
} from '../10_compute-climate-signatures.ts';

const SIGNATURE_DIM = 12;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('hashSeed', () => {
  it('same input → same output (determinism)', () => {
    expect(hashSeed('zone-abc', 3)).toBe(hashSeed('zone-abc', 3));
  });

  it('different scopeId → different output', () => {
    expect(hashSeed('zone-a', 0)).not.toBe(hashSeed('zone-b', 0));
  });

  it('output in [0, 1)', () => {
    for (let i = 0; i < 20; i++) {
      const v = hashSeed(`scope-${i}`, i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('computeSyntheticMonthly', () => {
  it('deterministic: same zone/year/month → same temp_avg', () => {
    const a = computeSyntheticMonthly('zone-x', 2020, 6);
    const b = computeSyntheticMonthly('zone-x', 2020, 6);
    expect(a.temp_avg).toBe(b.temp_avg);
    expect(a.rainfall_mm).toBe(b.rainfall_mm);
    expect(a.humidity_avg).toBe(b.humidity_avg);
  });

  it('summer (June) > winter (Dec) for CDMX-calibrated zone', () => {
    // Average over many zones to wash out jitter.
    let summerSum = 0;
    let winterSum = 0;
    const N = 25;
    for (let i = 0; i < N; i++) {
      summerSum += computeSyntheticMonthly(`zone-${i}`, 2020, 6).temp_avg;
      winterSum += computeSyntheticMonthly(`zone-${i}`, 2020, 12).temp_avg;
    }
    expect(summerSum / N).toBeGreaterThan(winterSum / N);
  });

  it('monsoon months (May-Oct) have higher rainfall than dry months on average', () => {
    let monsoonRain = 0;
    let dryRain = 0;
    const N = 25;
    for (let i = 0; i < N; i++) {
      for (let m = 5; m <= 10; m++) {
        monsoonRain += computeSyntheticMonthly(`zone-${i}`, 2020, m).rainfall_mm;
      }
      for (const m of [1, 2, 3, 4, 11, 12]) {
        dryRain += computeSyntheticMonthly(`zone-${i}`, 2020, m).rainfall_mm;
      }
    }
    expect(monsoonRain / (N * 6)).toBeGreaterThan(dryRain / (N * 6));
  });

  it('humidity always clamped to [0, 100]', () => {
    for (let y = 2011; y <= 2026; y++) {
      for (let m = 1; m <= 12; m++) {
        for (let i = 0; i < 5; i++) {
          const row = computeSyntheticMonthly(`zone-${i}`, y, m);
          expect(row.humidity_avg).toBeGreaterThanOrEqual(0);
          expect(row.humidity_avg).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('rainfall always >= 0', () => {
    for (let y = 2011; y <= 2026; y++) {
      for (let m = 1; m <= 12; m++) {
        const row = computeSyntheticMonthly('zone-test', y, m);
        expect(row.rainfall_mm).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('temp_max > temp_avg > temp_min invariant', () => {
    for (let y = 2015; y <= 2022; y++) {
      for (let m = 1; m <= 12; m++) {
        const row = computeSyntheticMonthly('zone-inv', y, m);
        expect(row.temp_max).toBeGreaterThan(row.temp_avg);
        expect(row.temp_avg).toBeGreaterThan(row.temp_min);
      }
    }
  });
});

describe('aggregateAnnual', () => {
  it('averages 12 synthetic months correctly', () => {
    const months = computeSyntheticYear('zone-agg', 2020);
    const summary = aggregateAnnual(months);
    const expectedAvgTemp = months.reduce((acc, m) => acc + m.temp_avg, 0) / 12;
    const expectedTotalRain = months.reduce((acc, m) => acc + m.rainfall_mm, 0);
    const expectedAvgHum = months.reduce((acc, m) => acc + m.humidity_avg, 0) / 12;
    expect(summary.avg_temp).toBeCloseTo(expectedAvgTemp, 6);
    expect(summary.total_rainfall).toBeCloseTo(expectedTotalRain, 6);
    expect(summary.avg_humidity).toBeCloseTo(expectedAvgHum, 6);
    expect(summary.seasonality_amplitude).toBeGreaterThan(0);
    expect(summary.year).toBe(2020);
  });
});

describe('classifyClimateType', () => {
  it('tropical when avg_temp > 25 and rainfall >= 400', () => {
    expect(classifyClimateType(28, 1500)).toBe('tropical');
  });

  it('temperate when 10-18 avg_temp and rainfall >= 400', () => {
    expect(classifyClimateType(15, 800)).toBe('temperate');
  });

  it('humid_subtropical when 18-25 avg_temp', () => {
    expect(classifyClimateType(21, 900)).toBe('humid_subtropical');
  });

  it('arid when rainfall < 400', () => {
    expect(classifyClimateType(22, 200)).toBe('arid');
  });

  it('cold when avg_temp < 10', () => {
    expect(classifyClimateType(5, 800)).toBe('cold');
  });
});

describe('buildSignatureVector', () => {
  it('pure builder returns length 12', () => {
    const months: MonthlyClimate[] = [];
    for (let y = 2015; y <= 2020; y++) {
      for (const m of computeSyntheticYear('zone-sig', y)) months.push(m);
    }
    const sig = buildSignatureVector(months, 2);
    expect(sig).toHaveLength(SIGNATURE_DIM);
  });

  it('all dims clamped to [0, 1]', () => {
    const months: MonthlyClimate[] = [];
    for (let y = 2011; y <= 2026; y++) {
      for (const m of computeSyntheticYear('zone-clamp', y)) months.push(m);
    }
    const sig = buildSignatureVector(months, 50);
    for (const v of sig) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('serializeVector12', () => {
  it('correct format with 8 decimals', () => {
    const v = Array.from({ length: SIGNATURE_DIM }, () => 0.5);
    const s = serializeVector12(v);
    expect(s.startsWith('[')).toBe(true);
    expect(s.endsWith(']')).toBe(true);
    const inner = s.slice(1, -1);
    const parts = inner.split(',');
    expect(parts).toHaveLength(SIGNATURE_DIM);
    for (const p of parts) {
      expect(p).toMatch(/^-?\d+\.\d{8}$/);
    }
  });

  it('roundtrips floats with 8-decimal tolerance', () => {
    const raw = Array.from({ length: SIGNATURE_DIM }, (_, i) => i / 20 + 0.01);
    const parsed = serializeVector12(raw)
      .slice(1, -1)
      .split(',')
      .map((p) => Number.parseFloat(p));
    for (let i = 0; i < SIGNATURE_DIM; i++) {
      const p = parsed[i];
      const r = raw[i];
      if (p === undefined || r === undefined) {
        throw new Error(`missing value at index ${i}`);
      }
      expect(p).toBeCloseTo(r, 6);
    }
  });

  it('throws if vector length ≠ 12', () => {
    expect(() => serializeVector12([1, 2, 3])).toThrow();
    expect(() => serializeVector12(new Array<number>(13).fill(0))).toThrow();
  });
});

describe('detectAnomalies', () => {
  it('when value > mean + 2σ for same month-of-year, returns temp_high flag', () => {
    // 6 Januaries with low temps + 1 synthetic January outlier.
    const months: MonthlyClimate[] = [];
    for (let y = 2015; y <= 2020; y++) {
      months.push({
        year: y,
        month: 1,
        temp_avg: 10,
        temp_max: 14,
        temp_min: 6,
        rainfall_mm: 20,
        humidity_avg: 55,
      });
    }
    // Outlier year 2021 Jan, temp 40 → far above mean 10.
    months.push({
      year: 2021,
      month: 1,
      temp_avg: 40,
      temp_max: 44,
      temp_min: 36,
      rainfall_mm: 20,
      humidity_avg: 55,
    });
    const flags = detectAnomalies(months);
    const lastFlags = flags[flags.length - 1];
    expect(lastFlags).toBeDefined();
    expect(lastFlags).toContain('temp_high');
  });

  it('when all values within 2σ, empty flags', () => {
    const months: MonthlyClimate[] = [];
    for (let y = 2015; y <= 2022; y++) {
      months.push({
        year: y,
        month: 6,
        temp_avg: 21 + (y % 2) * 0.1, // tiny variation
        temp_max: 25,
        temp_min: 17,
        rainfall_mm: 100,
        humidity_avg: 65,
      });
    }
    const flags = detectAnomalies(months);
    for (const f of flags) {
      expect(f).toEqual([]);
    }
  });
});

describe('cosineSimilarity', () => {
  it('identical vectors → 1.0', () => {
    const v = [0.2, 0.4, 0.6, 0.8];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it('orthogonal vectors → 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('zero-magnitude guard → 0', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it('length mismatch → 0', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe('findTopTwins', () => {
  it('top-5 in descending similarity order', () => {
    const base: number[] = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const candidates = [
      { zoneId: 'z1', vec: [0.99, 0.01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { zoneId: 'z2', vec: [0.95, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { zoneId: 'z3', vec: [0.9, 0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { zoneId: 'z4', vec: [0.85, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { zoneId: 'z5', vec: [0.8, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { zoneId: 'z6', vec: [0.7, 0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ];
    const twins = findTopTwins('src', base, candidates, 5, 0);
    expect(twins).toHaveLength(5);
    for (let i = 1; i < twins.length; i++) {
      const curr = twins[i];
      const prev = twins[i - 1];
      if (curr === undefined || prev === undefined) {
        throw new Error('undefined twin entry');
      }
      expect(curr.similarityPct).toBeLessThanOrEqual(prev.similarityPct);
    }
    expect(twins[0]?.twinZoneId).toBe('z1');
  });

  it('excludes self from candidates', () => {
    const base: number[] = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const candidates = [
      { zoneId: 'self', vec: base },
      { zoneId: 'other', vec: [0.9, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ];
    const twins = findTopTwins('self', base, candidates, 5, 0);
    expect(twins.every((t) => t.twinZoneId !== 'self')).toBe(true);
  });

  it('filters candidates below minCosine', () => {
    const base: number[] = [1, 0, 0];
    const candidates = [
      { zoneId: 'high', vec: [0.9, 0.1, 0] },
      { zoneId: 'low', vec: [0, 1, 0] }, // cosine 0 < 0.5
    ];
    const twins = findTopTwins('src', base, candidates, 5, 0.5);
    expect(twins.map((t) => t.twinZoneId)).toEqual(['high']);
  });

  it('similarity is percentage (0-100), not ratio', () => {
    const base: number[] = [1, 0];
    const candidates = [{ zoneId: 'identical', vec: [1, 0] }];
    const twins = findTopTwins('src', base, candidates, 5, 0);
    expect(twins[0]?.similarityPct).toBeCloseTo(100, 4);
  });
});

describe('computeSlope', () => {
  it('positive slope for ascending ys', () => {
    expect(computeSlope([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(2, 6);
  });

  it('zero slope for constant ys', () => {
    expect(computeSlope([1, 2, 3], [5, 5, 5])).toBe(0);
  });
});

describe('stddev and mean', () => {
  it('mean of empty → 0', () => {
    expect(mean([])).toBe(0);
  });

  it('stddev of single value → 0', () => {
    expect(stddev([42])).toBe(0);
  });

  it('stddev of known set', () => {
    // [1,2,3,4,5] mean=3, var=(4+1+0+1+4)/5=2, std=sqrt(2)
    expect(stddev([1, 2, 3, 4, 5])).toBeCloseTo(Math.sqrt(2), 6);
  });
});
