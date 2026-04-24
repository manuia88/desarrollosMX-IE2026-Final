import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFeatureVector,
  computeTopContributors,
  DEMOGRAPHIC_KEYS,
  DMX_INDEX_CODES,
  type FeatureCategory,
  type FeatureInputs,
  hashSeed,
  MACRO_KEYS,
  N_SCORE_CODES,
  normalizeMacroValue,
  normalizeVector,
  serializePgVector,
} from '../08_compute-colonia-dna.ts';

const VECTOR_DIM = 64;
const VALID_CATEGORIES: ReadonlySet<FeatureCategory> = new Set([
  'n_score',
  'dmx',
  'demographic',
  'macro',
  'h3',
  'padding',
]);

function emptyInputs(scopeId: string): FeatureInputs {
  return {
    nScores: {},
    dmxValues: {},
    demographics: {},
    macro: {},
    geo: { lat: null, lng: null, h3: null },
    scopeId,
  };
}

function fullInputs(scopeId: string): FeatureInputs {
  const nScores: Record<string, number> = {};
  for (const code of N_SCORE_CODES) nScores[code] = 72;
  const dmxValues: Record<string, number> = {};
  for (const code of DMX_INDEX_CODES) dmxValues[code] = 68;
  const demographics: Record<string, number> = {};
  for (const key of DEMOGRAPHIC_KEYS) demographics[key] = 0.6;
  const macro: Record<string, number> = {};
  for (const key of MACRO_KEYS) macro[key] = 0.4;
  return {
    nScores,
    dmxValues,
    demographics,
    macro,
    geo: { lat: 19.4326, lng: -99.1332, h3: '884a8e6aadfffff' },
    scopeId,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('buildFeatureVector', () => {
  it('returns exactly 64 floats', () => {
    const { raw, meta } = buildFeatureVector(emptyInputs('scope-a'));
    expect(raw).toHaveLength(VECTOR_DIM);
    expect(meta).toHaveLength(VECTOR_DIM);
    for (const v of raw) {
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('category counts sum to 64: 23 + 14 + 10 + 5 + 3 + 9', () => {
    const { meta } = buildFeatureVector(emptyInputs('scope-b'));
    const counts: Record<FeatureCategory, number> = {
      n_score: 0,
      dmx: 0,
      demographic: 0,
      macro: 0,
      h3: 0,
      padding: 0,
    };
    for (const m of meta) counts[m.category] += 1;
    expect(counts.n_score).toBe(23);
    expect(counts.dmx).toBe(14);
    expect(counts.demographic).toBe(10);
    expect(counts.macro).toBe(5);
    expect(counts.h3).toBe(3);
    expect(counts.padding).toBe(9);
    const total =
      counts.n_score + counts.dmx + counts.demographic + counts.macro + counts.h3 + counts.padding;
    expect(total).toBe(64);
  });

  it('deterministic: identical input → identical output', () => {
    const inA = fullInputs('scope-determ');
    const inB = fullInputs('scope-determ');
    const outA = buildFeatureVector(inA);
    const outB = buildFeatureVector(inB);
    expect(outA.raw).toEqual(outB.raw);
    expect(outA.meta).toEqual(outB.meta);
  });

  it('different scope_id → different vectors', () => {
    const outA = buildFeatureVector(emptyInputs('scope-one'));
    const outB = buildFeatureVector(emptyInputs('scope-two'));
    expect(outA.raw).not.toEqual(outB.raw);
  });

  it('default score=50 (missing) → normalized 0.5 in n_score dims', () => {
    const inputs = emptyInputs('scope-default');
    const { raw } = buildFeatureVector(inputs);
    // First 23 dims (n_score) should all be 0.5 since no nScores supplied.
    for (let i = 0; i < N_SCORE_CODES.length; i++) {
      expect(raw[i]).toBeCloseTo(0.5, 6);
    }
    // DMX dims (23..36) also default 0.5.
    for (let i = N_SCORE_CODES.length; i < N_SCORE_CODES.length + DMX_INDEX_CODES.length; i++) {
      expect(raw[i]).toBeCloseTo(0.5, 6);
    }
    // Macro dims (47..51) default 0.5 too.
    const macroStart = N_SCORE_CODES.length + DMX_INDEX_CODES.length + DEMOGRAPHIC_KEYS.length;
    for (let i = macroStart; i < macroStart + MACRO_KEYS.length; i++) {
      expect(raw[i]).toBeCloseTo(0.5, 6);
    }
    // Padding dims (55..63) are always 0.
    for (let i = 55; i < 64; i++) {
      expect(raw[i]).toBe(0);
    }
  });

  it('provides feature_sources coverage counts correctly', () => {
    const inputs = emptyInputs('scope-cov');
    inputs.nScores = { F01: 80, H05: 65, C01: 40 };
    inputs.dmxValues = { LIV: 88, DEV: 30 };
    const { sources } = buildFeatureVector(inputs);
    expect(sources.nScoresCoverage).toBe(3);
    expect(sources.dmxCoverage).toBe(2);
  });
});

describe('normalizeVector', () => {
  it('produces magnitude 1.0 ± 0.001 (sqrt sum squares)', () => {
    const raw = Array.from({ length: VECTOR_DIM }, (_, i) => (i + 1) / 100);
    const normalized = normalizeVector(raw);
    const mag = Math.sqrt(normalized.reduce((acc, v) => acc + v * v, 0));
    expect(mag).toBeGreaterThan(0.999);
    expect(mag).toBeLessThan(1.001);
  });

  it('preserves ratios between components', () => {
    const raw = [0.2, 0.4, 0.6, 0.8];
    const normalized = normalizeVector(raw);
    const [n0, n1, n2, n3] = normalized;
    if (n0 === undefined || n1 === undefined || n2 === undefined || n3 === undefined) {
      throw new Error('normalizeVector returned shorter array than input');
    }
    expect(n1 / n0).toBeCloseTo(2, 6);
    expect(n2 / n0).toBeCloseTo(3, 6);
    expect(n3 / n0).toBeCloseTo(4, 6);
  });

  it('all-zeros vector → returns zero vector (no divide-by-zero)', () => {
    const zeros = new Array<number>(VECTOR_DIM).fill(0);
    const normalized = normalizeVector(zeros);
    expect(normalized).toHaveLength(VECTOR_DIM);
    for (const v of normalized) {
      expect(v).toBe(0);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('computeTopContributors', () => {
  it('returns exactly 5 entries', () => {
    const { raw, meta } = buildFeatureVector(fullInputs('scope-topk'));
    const top = computeTopContributors(raw, meta, 5);
    expect(top).toHaveLength(5);
  });

  it('is sorted DESC by contribution magnitude', () => {
    const { raw, meta } = buildFeatureVector(fullInputs('scope-sort'));
    const top = computeTopContributors(raw, meta, 5);
    for (let i = 1; i < top.length; i++) {
      const curr = top[i];
      const prev = top[i - 1];
      if (curr === undefined || prev === undefined) {
        throw new Error('top contributors array shorter than expected');
      }
      expect(curr.contribution).toBeLessThanOrEqual(prev.contribution);
    }
  });

  it('each entry has { feature_name, contribution, category, dim_index }', () => {
    const { raw, meta } = buildFeatureVector(fullInputs('scope-shape'));
    const top = computeTopContributors(raw, meta, 5);
    for (const entry of top) {
      expect(entry).toHaveProperty('feature_name');
      expect(typeof entry.feature_name).toBe('string');
      expect(entry.feature_name.length).toBeGreaterThan(0);
      expect(entry).toHaveProperty('contribution');
      expect(typeof entry.contribution).toBe('number');
      expect(entry).toHaveProperty('category');
      expect(entry).toHaveProperty('dim_index');
      expect(typeof entry.dim_index).toBe('number');
      expect(entry.dim_index).toBeGreaterThanOrEqual(0);
      expect(entry.dim_index).toBeLessThan(VECTOR_DIM);
    }
  });

  it('categories are valid enum values', () => {
    const { raw, meta } = buildFeatureVector(fullInputs('scope-cat'));
    const top = computeTopContributors(raw, meta, 5);
    for (const entry of top) {
      expect(VALID_CATEGORIES.has(entry.category)).toBe(true);
    }
  });
});

describe('serializePgVector', () => {
  it('returns [...] format with 64 comma-separated numbers', () => {
    const v = Array.from({ length: VECTOR_DIM }, () => 0.5);
    const s = serializePgVector(v);
    expect(s.startsWith('[')).toBe(true);
    expect(s.endsWith(']')).toBe(true);
    const inner = s.slice(1, -1);
    const parts = inner.split(',');
    expect(parts).toHaveLength(VECTOR_DIM);
    for (const p of parts) {
      expect(Number.isFinite(Number.parseFloat(p))).toBe(true);
    }
  });

  it('roundtrips: parse produces original floats (tolerance 1e-6)', () => {
    const raw = Array.from({ length: VECTOR_DIM }, (_, i) => i / 100 + 0.0001);
    const s = serializePgVector(raw);
    const parsed = s
      .slice(1, -1)
      .split(',')
      .map((p) => Number.parseFloat(p));
    expect(parsed).toHaveLength(VECTOR_DIM);
    for (let i = 0; i < VECTOR_DIM; i++) {
      const p = parsed[i];
      const r = raw[i];
      if (p === undefined || r === undefined) {
        throw new Error(`missing value at index ${i}`);
      }
      expect(p).toBeCloseTo(r, 6);
    }
  });

  it('throws if vector length ≠ 64', () => {
    expect(() => serializePgVector([1, 2, 3])).toThrow();
  });
});

describe('hashSeed (deterministic)', () => {
  it('same input → same output', () => {
    expect(hashSeed('scope-x', 42)).toBe(hashSeed('scope-x', 42));
  });

  it('output in [0, 1)', () => {
    for (let i = 0; i < 20; i++) {
      const v = hashSeed(`scope-${i}`, i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('normalizeMacroValue', () => {
  it('inflation 4% → 0.2', () => {
    expect(normalizeMacroValue('inflation_yoy', 4)).toBeCloseTo(0.2, 6);
  });

  it('unknown metric → 0.5', () => {
    expect(normalizeMacroValue('unknown_metric', 123)).toBe(0.5);
  });

  it('NaN → 0.5', () => {
    expect(normalizeMacroValue('inflation_yoy', Number.NaN)).toBe(0.5);
  });

  it('clamps out-of-range values', () => {
    expect(normalizeMacroValue('inflation_yoy', 50)).toBe(1);
    expect(normalizeMacroValue('inflation_yoy', -10)).toBe(0);
  });
});
