import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AGE_BUCKETS,
  assignClusters,
  compositeEdgeWeight,
  computeApproximatePageRank,
  computeClosenessCentrality,
  computeDegreeCentrality,
  cosineSimilarity,
  culturalAffinity,
  demographicFlow,
  type EdgeTypes,
  economicComplement,
  extractAgeDistribution,
  haversineKm,
  parsePgVector,
  spatialAdjacency,
} from '../11_compute-constellations-edges.ts';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('cosineSimilarity', () => {
  it('identity vector → 1 for non-zero', () => {
    const v = [0.1, 0.2, 0.3, 0.4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it('zero-vector safe: returns 0 (no divide-by-zero)', () => {
    const a = [0, 0, 0, 0];
    const b = [0.1, 0.2, 0.3, 0.4];
    expect(cosineSimilarity(a, b)).toBe(0);
    expect(cosineSimilarity(b, a)).toBe(0);
    expect(cosineSimilarity(a, a)).toBe(0);
  });

  it('orthogonal vectors → 0', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 6);
    expect(cosineSimilarity([1, 0, 0, 0], [0, 0, 1, 0])).toBeCloseTo(0, 6);
  });

  it('different-length vectors → 0', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });
});

describe('haversineKm', () => {
  it('symmetric: A→B == B→A', () => {
    const d1 = haversineKm(19.4326, -99.1332, 20.6597, -103.3496);
    const d2 = haversineKm(20.6597, -103.3496, 19.4326, -99.1332);
    expect(d1).toBeCloseTo(d2, 6);
  });

  it('same point = 0', () => {
    expect(haversineKm(19.4326, -99.1332, 19.4326, -99.1332)).toBeCloseTo(0, 6);
  });

  it('CDMX → Guadalajara ≈ 461-540 km (canonical ≈ 460-480 km great-circle)', () => {
    // CDMX 19.4326,-99.1332 → GDL 20.6597,-103.3496 → great-circle ~460 km
    const d = haversineKm(19.4326, -99.1332, 20.6597, -103.3496);
    expect(d).toBeGreaterThan(400);
    expect(d).toBeLessThan(600);
  });
});

describe('spatialAdjacency', () => {
  it('<1 km distance → adjacency ≥ 0.9', () => {
    // Two points ~0.5 km apart (lat diff ≈ 0.0045 deg ≈ 500 m)
    const adj = spatialAdjacency(19.4326, -99.1332, 19.437, -99.1332);
    expect(adj).toBeGreaterThanOrEqual(0.9);
  });

  it('same point → adjacency = 1', () => {
    const adj = spatialAdjacency(19.4326, -99.1332, 19.4326, -99.1332);
    expect(adj).toBeCloseTo(1, 6);
  });

  it('>= 10 km distance → adjacency = 0 (clamped)', () => {
    // CDMX → ~1deg south ≈ 111 km
    const adj = spatialAdjacency(19.4326, -99.1332, 20.4326, -99.1332);
    expect(adj).toBe(0);
  });

  it('missing coords → 0', () => {
    expect(spatialAdjacency(null, -99.1332, 19.4326, -99.1332)).toBe(0);
    expect(spatialAdjacency(19.4326, null, 19.4326, -99.1332)).toBe(0);
    expect(spatialAdjacency(19.4326, -99.1332, null, -99.1332)).toBe(0);
    expect(spatialAdjacency(19.4326, -99.1332, 19.4326, null)).toBe(0);
  });
});

describe('demographicFlow', () => {
  it('identical age distributions → 1 (cosine)', () => {
    const dist = [10, 25, 30, 20, 10, 5];
    expect(demographicFlow(dist, dist)).toBeCloseTo(1, 6);
  });

  it('known fixture: partially similar distributions → 0 < sim < 1', () => {
    const a = [10, 25, 30, 20, 10, 5];
    const b = [5, 15, 30, 25, 15, 10];
    const sim = demographicFlow(a, b);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it('missing one record → 0', () => {
    expect(demographicFlow(null, [10, 25, 30, 20, 10, 5])).toBe(0);
    expect(demographicFlow([10, 25, 30, 20, 10, 5], null)).toBe(0);
    expect(demographicFlow(null, null)).toBe(0);
  });

  it('wrong bucket count → 0', () => {
    expect(demographicFlow([10, 20, 30], [10, 20, 30, 40, 50, 60])).toBe(0);
    expect(demographicFlow([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBe(0);
  });
});

describe('economicComplement', () => {
  it('inverse of similarity: identical profiles → 0 (no complementarity)', () => {
    const profile = [60, 55, 45, 70];
    expect(economicComplement(profile, profile)).toBeCloseTo(0, 6);
  });

  it('missing profile → 0.5 neutral', () => {
    expect(economicComplement(null, [60, 55, 45, 70])).toBe(0.5);
    expect(economicComplement([60, 55, 45, 70], null)).toBe(0.5);
    expect(economicComplement(null, null)).toBe(0.5);
  });

  it('different profiles → complementarity > 0', () => {
    const a = [80, 70, 20, 30];
    const b = [20, 30, 80, 70];
    const comp = economicComplement(a, b);
    expect(comp).toBeGreaterThan(0);
    expect(comp).toBeLessThanOrEqual(1);
  });

  it('wrong-length profile → 0.5 neutral', () => {
    expect(economicComplement([1, 2], [3, 4, 5, 6])).toBe(0.5);
  });
});

describe('culturalAffinity', () => {
  it('pgvector parser + cosine: identical 64-dim L2-normalized → 1', () => {
    const v = new Array<number>(64).fill(0).map((_, i) => (i + 1) / 100);
    const magnitude = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
    const normalized = v.map((x) => x / magnitude);
    expect(culturalAffinity(normalized, normalized)).toBeCloseTo(1, 5);
  });

  it('missing vector → 0', () => {
    const v = new Array<number>(64).fill(0.1);
    expect(culturalAffinity(null, v)).toBe(0);
    expect(culturalAffinity(v, null)).toBe(0);
    expect(culturalAffinity(null, null)).toBe(0);
  });

  it('different-length vectors → 0', () => {
    expect(culturalAffinity([0.1, 0.2], [0.1, 0.2, 0.3])).toBe(0);
  });
});

describe('parsePgVector', () => {
  it('well-formed "[v0,v1,...,v63]" → number[] of length 64', () => {
    const src = `[${new Array<number>(64)
      .fill(0)
      .map((_, i) => ((i + 1) / 100).toFixed(8))
      .join(',')}]`;
    const parsed = parsePgVector(src, 64);
    expect(parsed).not.toBeNull();
    if (parsed == null) return;
    expect(parsed).toHaveLength(64);
    expect(parsed[0]).toBeCloseTo(0.01, 6);
    expect(parsed[63]).toBeCloseTo(0.64, 6);
  });

  it('rejects malformed: no brackets', () => {
    expect(parsePgVector('0.1,0.2,0.3')).toBeNull();
  });

  it('rejects malformed: empty string', () => {
    expect(parsePgVector('')).toBeNull();
  });

  it('rejects malformed: wrong length', () => {
    expect(parsePgVector('[0.1,0.2,0.3]', 64)).toBeNull();
  });

  it('rejects malformed: NaN element', () => {
    const parts = new Array<string>(64).fill('0.1');
    parts[5] = 'notanumber';
    expect(parsePgVector(`[${parts.join(',')}]`, 64)).toBeNull();
  });

  it('rejects null/undefined input', () => {
    expect(parsePgVector(null)).toBeNull();
    expect(parsePgVector(undefined)).toBeNull();
  });
});

describe('compositeEdgeWeight', () => {
  it('equals mean of 4 weights', () => {
    const et: EdgeTypes = {
      demographic_flow: 0.8,
      economic_complement: 0.4,
      cultural_affinity: 0.6,
      spatial_adjacency: 0.2,
    };
    expect(compositeEdgeWeight(et)).toBeCloseTo(0.5, 6);
  });

  it('all-zero → 0', () => {
    const et: EdgeTypes = {
      demographic_flow: 0,
      economic_complement: 0,
      cultural_affinity: 0,
      spatial_adjacency: 0,
    };
    expect(compositeEdgeWeight(et)).toBe(0);
  });

  it('all-one → 1', () => {
    const et: EdgeTypes = {
      demographic_flow: 1,
      economic_complement: 1,
      cultural_affinity: 1,
      spatial_adjacency: 1,
    };
    expect(compositeEdgeWeight(et)).toBeCloseTo(1, 6);
  });

  it('edge filtering: below threshold → NOT emitted (caller filters on composite)', () => {
    const et: EdgeTypes = {
      demographic_flow: 0.1,
      economic_complement: 0.1,
      cultural_affinity: 0.1,
      spatial_adjacency: 0.1,
    };
    const w = compositeEdgeWeight(et);
    expect(w).toBeLessThan(0.3);
    // Caller filters: w < threshold → drop.
    const emit = w >= 0.3;
    expect(emit).toBe(false);
  });
});

describe('assignClusters', () => {
  it('isolated node (no edges) → own cluster_id', () => {
    const zones = ['z1', 'z2', 'z3'];
    const clusters = assignClusters(zones, []);
    expect(clusters.size).toBe(3);
    const c1 = clusters.get('z1');
    const c2 = clusters.get('z2');
    const c3 = clusters.get('z3');
    expect(c1).not.toBe(c2);
    expect(c2).not.toBe(c3);
    expect(c1).not.toBe(c3);
  });

  it('strongly connected pair → same cluster_id', () => {
    const zones = ['z1', 'z2'];
    const edges = [{ sourceZoneId: 'z1', targetZoneId: 'z2', edgeWeight: 0.9 }];
    const clusters = assignClusters(zones, edges);
    expect(clusters.get('z1')).toBe(clusters.get('z2'));
  });

  it('cluster_ids are renumbered contiguously 0..K-1', () => {
    const zones = ['z1', 'z2', 'z3', 'z4'];
    const clusters = assignClusters(zones, []);
    const values = [...clusters.values()].sort((a, b) => a - b);
    expect(values).toEqual([0, 1, 2, 3]);
  });
});

describe('computeDegreeCentrality', () => {
  it('counts both source and target occurrences', () => {
    const zones = ['z1', 'z2', 'z3'];
    const edges = [
      { sourceZoneId: 'z1', targetZoneId: 'z2' },
      { sourceZoneId: 'z1', targetZoneId: 'z3' },
      { sourceZoneId: 'z2', targetZoneId: 'z3' },
    ];
    const degree = computeDegreeCentrality(zones, edges);
    expect(degree.get('z1')).toBe(2);
    expect(degree.get('z2')).toBe(2);
    expect(degree.get('z3')).toBe(2);
  });

  it('isolated zone → degree = 0', () => {
    const degree = computeDegreeCentrality(['z1', 'z2'], []);
    expect(degree.get('z1')).toBe(0);
    expect(degree.get('z2')).toBe(0);
  });
});

describe('computeClosenessCentrality', () => {
  it('isolated node → 0', () => {
    const closeness = computeClosenessCentrality(['z1', 'z2', 'z3'], []);
    expect(closeness.get('z1')).toBe(0);
    expect(closeness.get('z2')).toBe(0);
    expect(closeness.get('z3')).toBe(0);
  });

  it('connected triangle → each node has closeness > 0', () => {
    const zones = ['z1', 'z2', 'z3'];
    const edges = [
      { sourceZoneId: 'z1', targetZoneId: 'z2' },
      { sourceZoneId: 'z2', targetZoneId: 'z3' },
      { sourceZoneId: 'z1', targetZoneId: 'z3' },
    ];
    const closeness = computeClosenessCentrality(zones, edges);
    // All at distance 1 from each other: 1/1 + 1/1 = 2.
    expect(closeness.get('z1')).toBeCloseTo(2, 6);
    expect(closeness.get('z2')).toBeCloseTo(2, 6);
    expect(closeness.get('z3')).toBeCloseTo(2, 6);
  });
});

describe('computeApproximatePageRank', () => {
  it('sums ≈ 1 over N nodes', () => {
    const zones = ['z1', 'z2', 'z3', 'z4'];
    const edges = [
      { sourceZoneId: 'z1', targetZoneId: 'z2' },
      { sourceZoneId: 'z2', targetZoneId: 'z3' },
      { sourceZoneId: 'z3', targetZoneId: 'z4' },
    ];
    const pr = computeApproximatePageRank(zones, edges);
    let total = 0;
    for (const v of pr.values()) total += v;
    expect(total).toBeCloseTo(1, 6);
  });

  it('all-isolated → each ≈ 1/N (stable)', () => {
    const zones = ['z1', 'z2', 'z3', 'z4'];
    const pr = computeApproximatePageRank(zones, []);
    const expected = 1 / 4;
    for (const v of pr.values()) {
      expect(v).toBeCloseTo(expected, 5);
    }
  });

  it('empty zones → empty map', () => {
    const pr = computeApproximatePageRank([], []);
    expect(pr.size).toBe(0);
  });
});

describe('extractAgeDistribution', () => {
  it('parses 6 buckets from well-formed array', () => {
    const raw = [
      { age_group: '0-14', percentage: 20 },
      { age_group: '15-29', percentage: 25 },
      { age_group: '30-44', percentage: 22 },
      { age_group: '45-59', percentage: 15 },
      { age_group: '60-74', percentage: 12 },
      { age_group: '75+', percentage: 6 },
    ];
    const out = extractAgeDistribution(raw);
    expect(out).not.toBeNull();
    if (out == null) return;
    expect(out).toHaveLength(AGE_BUCKETS.length);
    expect(out[0]).toBe(20);
    expect(out[5]).toBe(6);
  });

  it('returns null for malformed input (not array)', () => {
    expect(extractAgeDistribution(null)).toBeNull();
    expect(extractAgeDistribution('string')).toBeNull();
    expect(extractAgeDistribution({ foo: 'bar' })).toBeNull();
  });

  it('returns null for empty array (no buckets found)', () => {
    expect(extractAgeDistribution([])).toBeNull();
  });
});
