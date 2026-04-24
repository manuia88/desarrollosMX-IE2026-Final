import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AgeBucket,
  computeDnaSimilarityToSeeds,
  computeGhostScore,
  computeLinearSlope,
  computeNegativeMomentum,
  computeTransitionProbability,
  cosineSimilarity64,
  FACTOR_WEIGHTS,
  factorDemographicsAging,
  factorOccupancyLow,
  factorPriceStagnant,
  factorPulseTrendDown,
  type PulsePoint,
  parsePgVector64,
  sigmoid,
} from '../12_compute-ghost-zones.ts';

const VECTOR_DIM = 64;

function makePulseSeries(slope: number, intercept = 50, days = 30): PulsePoint[] {
  const out: PulsePoint[] = [];
  for (let d = 0; d < days; d++) {
    out.push({ dayIndex: d, pulseScore: intercept + slope * d });
  }
  return out;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('computeLinearSlope', () => {
  it('returns positive slope on increasing series', () => {
    const pts: PulsePoint[] = [
      { dayIndex: 0, pulseScore: 10 },
      { dayIndex: 1, pulseScore: 20 },
      { dayIndex: 2, pulseScore: 30 },
      { dayIndex: 3, pulseScore: 40 },
    ];
    const slope = computeLinearSlope(pts);
    expect(slope).toBeCloseTo(10, 6);
  });

  it('returns negative slope on decreasing series', () => {
    const pts: PulsePoint[] = [
      { dayIndex: 0, pulseScore: 80 },
      { dayIndex: 1, pulseScore: 70 },
      { dayIndex: 2, pulseScore: 60 },
      { dayIndex: 3, pulseScore: 50 },
    ];
    const slope = computeLinearSlope(pts);
    expect(slope).toBeCloseTo(-10, 6);
  });

  it('returns zero slope on flat series', () => {
    const pts: PulsePoint[] = [
      { dayIndex: 0, pulseScore: 50 },
      { dayIndex: 1, pulseScore: 50 },
      { dayIndex: 2, pulseScore: 50 },
    ];
    expect(computeLinearSlope(pts)).toBe(0);
  });

  it('returns 0 for empty or single-point inputs (safe)', () => {
    expect(computeLinearSlope([])).toBe(0);
    expect(computeLinearSlope([{ dayIndex: 0, pulseScore: 50 }])).toBe(0);
  });

  it('returns 0 when all x values are identical (avoids /0)', () => {
    const pts: PulsePoint[] = [
      { dayIndex: 5, pulseScore: 10 },
      { dayIndex: 5, pulseScore: 20 },
      { dayIndex: 5, pulseScore: 30 },
    ];
    expect(computeLinearSlope(pts)).toBe(0);
  });
});

describe('factorPulseTrendDown', () => {
  it('strong downward (slope=-0.2) → ~100', () => {
    const pts = makePulseSeries(-0.2);
    const v = factorPulseTrendDown(pts);
    expect(v).toBeGreaterThanOrEqual(99);
    expect(v).toBeLessThanOrEqual(100);
  });

  it('strong upward (slope=+0.2) → ~0', () => {
    const pts = makePulseSeries(0.2);
    const v = factorPulseTrendDown(pts);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('flat slope (0) → ~50', () => {
    const pts = makePulseSeries(0);
    expect(factorPulseTrendDown(pts)).toBeCloseTo(50, 1);
  });

  it('no data → 50 neutral', () => {
    expect(factorPulseTrendDown([])).toBe(50);
    expect(factorPulseTrendDown([{ dayIndex: 0, pulseScore: 50 }])).toBe(50);
  });
});

describe('factorPriceStagnant', () => {
  it('|delta| < 2% → ~100', () => {
    expect(factorPriceStagnant(101, 100)).toBe(100);
    expect(factorPriceStagnant(100, 100)).toBe(100);
    expect(factorPriceStagnant(98.5, 100)).toBe(100);
  });

  it('|delta| > 20% → ~0', () => {
    expect(factorPriceStagnant(130, 100)).toBe(0);
    expect(factorPriceStagnant(70, 100)).toBe(0);
  });

  it('|delta| = 11% → ~50 (midpoint)', () => {
    const v = factorPriceStagnant(111, 100);
    expect(v).toBeCloseTo(50, 0);
  });

  it('missing inputs → 50 neutral', () => {
    expect(factorPriceStagnant(null, 100)).toBe(50);
    expect(factorPriceStagnant(100, null)).toBe(50);
    expect(factorPriceStagnant(null, null)).toBe(50);
  });

  it('twelveMonthsAgo=0 → 50 neutral (avoid /0)', () => {
    expect(factorPriceStagnant(10, 0)).toBe(50);
  });
});

describe('factorDemographicsAging', () => {
  it('aging_share 50% → ~100', () => {
    const buckets: AgeBucket[] = [
      { age_group: '0-14', percentage: 20 },
      { age_group: '15-29', percentage: 15 },
      { age_group: '30-44', percentage: 15 },
      { age_group: '45-59', percentage: 20 },
      { age_group: '60-74', percentage: 20 },
      { age_group: '75+', percentage: 10 },
    ];
    expect(factorDemographicsAging(buckets)).toBe(100);
  });

  it('aging_share 25% → ~0', () => {
    const buckets: AgeBucket[] = [
      { age_group: '0-14', percentage: 35 },
      { age_group: '15-29', percentage: 20 },
      { age_group: '30-44', percentage: 20 },
      { age_group: '45-59', percentage: 15 },
      { age_group: '60-74', percentage: 8 },
      { age_group: '75+', percentage: 2 },
    ];
    expect(factorDemographicsAging(buckets)).toBe(0);
  });

  it('aging_share ~37.5% → ~50 (midpoint)', () => {
    const buckets: AgeBucket[] = [
      { age_group: '0-14', percentage: 30 },
      { age_group: '15-29', percentage: 20 },
      { age_group: '30-44', percentage: 12.5 },
      { age_group: '45-59', percentage: 20 },
      { age_group: '60-74', percentage: 15 },
      { age_group: '75+', percentage: 2.5 },
    ];
    const v = factorDemographicsAging(buckets);
    expect(v).toBeCloseTo(50, 0);
  });

  it('missing / empty → 50 neutral', () => {
    expect(factorDemographicsAging(null)).toBe(50);
    expect(factorDemographicsAging(undefined)).toBe(50);
    expect(factorDemographicsAging([])).toBe(50);
  });
});

describe('factorOccupancyLow', () => {
  it('STA value 10 → 100 (high ghost contribution)', () => {
    expect(factorOccupancyLow(10)).toBe(100);
    expect(factorOccupancyLow(30)).toBe(100);
  });

  it('STA value 90 → 0 (low ghost contribution)', () => {
    expect(factorOccupancyLow(90)).toBe(0);
    expect(factorOccupancyLow(80)).toBe(0);
  });

  it('STA value 55 → 50 (midpoint)', () => {
    expect(factorOccupancyLow(55)).toBe(50);
  });

  it('missing → 50 neutral', () => {
    expect(factorOccupancyLow(null)).toBe(50);
    expect(factorOccupancyLow(undefined)).toBe(50);
    expect(factorOccupancyLow(Number.NaN)).toBe(50);
  });
});

describe('computeGhostScore', () => {
  it('weighted composite with known inputs → expected', () => {
    // F1=80, F2=60, F3=40, F4=20 → 0.30*80 + 0.25*60 + 0.20*40 + 0.25*20 = 24 + 15 + 8 + 5 = 52
    const v = computeGhostScore({
      f1_pulse_trend_down: 80,
      f2_price_stagnant: 60,
      f3_demographics_aging: 40,
      f4_occupancy_low: 20,
    });
    expect(v).toBeCloseTo(52, 6);
  });

  it('all inputs 0 → 0; all 100 → 100', () => {
    expect(
      computeGhostScore({
        f1_pulse_trend_down: 0,
        f2_price_stagnant: 0,
        f3_demographics_aging: 0,
        f4_occupancy_low: 0,
      }),
    ).toBe(0);
    expect(
      computeGhostScore({
        f1_pulse_trend_down: 100,
        f2_price_stagnant: 100,
        f3_demographics_aging: 100,
        f4_occupancy_low: 100,
      }),
    ).toBe(100);
  });

  it('clamps within [0, 100]', () => {
    const high = computeGhostScore({
      f1_pulse_trend_down: 200,
      f2_price_stagnant: 200,
      f3_demographics_aging: 200,
      f4_occupancy_low: 200,
    });
    expect(high).toBe(100);
  });
});

describe('FACTOR_WEIGHTS', () => {
  it('weights sum to 1.00', () => {
    const sum = FACTOR_WEIGHTS.f1 + FACTOR_WEIGHTS.f2 + FACTOR_WEIGHTS.f3 + FACTOR_WEIGHTS.f4;
    expect(sum).toBeCloseTo(1.0, 9);
  });
});

describe('sigmoid', () => {
  it('sigmoid(0) = 0.5', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 9);
  });

  it('large positive → near 1', () => {
    expect(sigmoid(20)).toBeGreaterThan(0.999);
    expect(sigmoid(1000)).toBe(1);
  });

  it('large negative → near 0', () => {
    expect(sigmoid(-20)).toBeLessThan(0.001);
    expect(sigmoid(-1000)).toBe(0);
  });

  it('NaN → 0.5 fallback', () => {
    expect(sigmoid(Number.NaN)).toBe(0.5);
  });
});

describe('computeNegativeMomentum', () => {
  it('slope -0.1 → 10', () => {
    expect(computeNegativeMomentum(-0.1)).toBeCloseTo(10, 6);
  });

  it('slope 0 or positive → 0', () => {
    expect(computeNegativeMomentum(0)).toBe(0);
    expect(computeNegativeMomentum(0.2)).toBe(0);
  });

  it('NaN → 0', () => {
    expect(computeNegativeMomentum(Number.NaN)).toBe(0);
  });
});

describe('computeTransitionProbability', () => {
  it('bounded [0, 1] for edge inputs', () => {
    expect(computeTransitionProbability(0, 0, 0)).toBeGreaterThanOrEqual(0);
    expect(computeTransitionProbability(0, 0, 0)).toBeLessThanOrEqual(1);
    expect(computeTransitionProbability(100, 100, 1)).toBeGreaterThanOrEqual(0);
    expect(computeTransitionProbability(100, 100, 1)).toBeLessThanOrEqual(1);
    expect(computeTransitionProbability(-999, -999, -999)).toBeGreaterThanOrEqual(0);
    expect(computeTransitionProbability(999, 999, 999)).toBeLessThanOrEqual(1);
  });

  it('average colonia (ghost=50, momentum=0, sim=0.5) ≈ 0.32', () => {
    const v = computeTransitionProbability(50, 0, 0.5);
    expect(v).toBeGreaterThan(0.3);
    expect(v).toBeLessThan(0.35);
  });

  it('transitioning colonia (ghost=70, momentum=5, sim=0.7) > average', () => {
    const avg = computeTransitionProbability(50, 0, 0.5);
    const transitioning = computeTransitionProbability(70, 5, 0.7);
    expect(transitioning).toBeGreaterThan(avg);
  });
});

describe('cosineSimilarity64', () => {
  it('identical vectors → similarity 1', () => {
    const v = Array.from({ length: VECTOR_DIM }, (_, i) => (i + 1) / 100);
    expect(cosineSimilarity64(v, v)).toBeCloseTo(1, 6);
  });

  it('opposite vectors → similarity -1', () => {
    const a = Array.from({ length: VECTOR_DIM }, (_, i) => (i + 1) / 100);
    const b = a.map((x) => -x);
    expect(cosineSimilarity64(a, b)).toBeCloseTo(-1, 6);
  });

  it('orthogonal vectors → similarity 0', () => {
    const a = new Array<number>(VECTOR_DIM).fill(0);
    const b = new Array<number>(VECTOR_DIM).fill(0);
    a[0] = 1;
    b[1] = 1;
    expect(cosineSimilarity64(a, b)).toBeCloseTo(0, 9);
  });

  it('length mismatch → 0', () => {
    expect(cosineSimilarity64([1, 2, 3], [1, 2])).toBe(0);
  });

  it('zero-magnitude vector → 0 (no divide-by-zero)', () => {
    const zero = new Array<number>(VECTOR_DIM).fill(0);
    const v = Array.from({ length: VECTOR_DIM }, (_, i) => i / 100);
    expect(cosineSimilarity64(zero, v)).toBe(0);
    expect(cosineSimilarity64(v, zero)).toBe(0);
  });
});

describe('parsePgVector64', () => {
  it('handles valid pgvector text format', () => {
    const raw = `[${Array.from({ length: VECTOR_DIM }, () => '0.5').join(',')}]`;
    const parsed = parsePgVector64(raw);
    expect(parsed).not.toBeNull();
    expect(parsed).toHaveLength(VECTOR_DIM);
    if (parsed != null) {
      for (const v of parsed) expect(v).toBeCloseTo(0.5, 6);
    }
  });

  it('rejects wrong length', () => {
    expect(parsePgVector64('[1,2,3]')).toBeNull();
  });

  it('rejects null/empty/malformed input', () => {
    expect(parsePgVector64(null)).toBeNull();
    expect(parsePgVector64(undefined)).toBeNull();
    expect(parsePgVector64('')).toBeNull();
    expect(parsePgVector64('not-a-vector')).toBeNull();
    expect(parsePgVector64('[]')).toBeNull();
  });

  it('rejects non-numeric values', () => {
    const raw = `[${Array.from({ length: VECTOR_DIM }, (_, i) => (i === 0 ? 'abc' : '0.5')).join(',')}]`;
    expect(parsePgVector64(raw)).toBeNull();
  });
});

describe('computeDnaSimilarityToSeeds', () => {
  it('null self vector → 0.5 neutral', () => {
    const seedVec = Array.from({ length: VECTOR_DIM }, () => 0.5);
    const seed = {
      zoneId: 'seed-1',
      scopeId: 'scope-1',
      factors: {
        f1_pulse_trend_down: 0,
        f2_price_stagnant: 0,
        f3_demographics_aging: 0,
        f4_occupancy_low: 0,
        slope_per_day: 0,
      },
      ghostScore: 80,
      negativeMomentum: 0,
      dnaVector: seedVec,
      transitionProbability: null,
      rank: 1,
    };
    expect(computeDnaSimilarityToSeeds(null, 'other', [seed])).toBe(0.5);
  });

  it('excludes self from similarity computation', () => {
    const selfVec = Array.from({ length: VECTOR_DIM }, (_, i) => i / VECTOR_DIM);
    const seedSelf = {
      zoneId: 'self-id',
      scopeId: 'self-scope',
      factors: {
        f1_pulse_trend_down: 0,
        f2_price_stagnant: 0,
        f3_demographics_aging: 0,
        f4_occupancy_low: 0,
        slope_per_day: 0,
      },
      ghostScore: 90,
      negativeMomentum: 0,
      dnaVector: selfVec,
      transitionProbability: null,
      rank: 1,
    };
    // Only seed is self → no valid seeds → neutral 0.5.
    expect(computeDnaSimilarityToSeeds(selfVec, 'self-id', [seedSelf])).toBe(0.5);
  });

  it('identical seed vector → rescaled similarity ~1', () => {
    const vec = Array.from({ length: VECTOR_DIM }, (_, i) => (i + 1) / 100);
    const seed = {
      zoneId: 'seed-a',
      scopeId: 'scope-a',
      factors: {
        f1_pulse_trend_down: 0,
        f2_price_stagnant: 0,
        f3_demographics_aging: 0,
        f4_occupancy_low: 0,
        slope_per_day: 0,
      },
      ghostScore: 80,
      negativeMomentum: 0,
      dnaVector: vec,
      transitionProbability: null,
      rank: 1,
    };
    const sim = computeDnaSimilarityToSeeds(vec, 'other-id', [seed]);
    // cosine 1 → (1+1)/2 = 1.
    expect(sim).toBeCloseTo(1, 6);
  });
});
