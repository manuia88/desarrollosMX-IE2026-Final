import { describe, expect, it } from 'vitest';
import {
  EDGE_TYPE_DEFAULT_WEIGHTS,
  EDGE_TYPES,
  EDGE_WEIGHT_MIN_PERSIST,
} from '@/features/constellations/types';
import {
  computeEdgeWeight,
  computeEdgeWeightCustom,
  cosineSimilarity,
  isEdgeTypeBreakdown,
} from '../constellation-engine';
import { runLouvain } from '../louvain';

describe('EDGE_TYPE_DEFAULT_WEIGHTS', () => {
  it('los 4 tipos suman a 1.0', () => {
    const sum = EDGE_TYPES.reduce((acc, t) => acc + EDGE_TYPE_DEFAULT_WEIGHTS[t], 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
  });
});

describe('computeEdgeWeight', () => {
  it('con los 4 tipos presentes, weight = weighted avg default', () => {
    const types = {
      migration: 80,
      climate_twin: 60,
      genoma_similarity: 70,
      pulse_correlation: 50,
    };
    const w = computeEdgeWeight(types);
    const expected = 80 * 0.3 + 60 * 0.15 + 70 * 0.3 + 50 * 0.25;
    expect(Math.abs(w - expected)).toBeLessThan(0.01);
  });

  it('con tipos faltantes (0), re-balancea pesos', () => {
    const onlyMigration = {
      migration: 100,
      climate_twin: 0,
      genoma_similarity: 0,
      pulse_correlation: 0,
    };
    const w = computeEdgeWeight(onlyMigration);
    expect(w).toBe(100);
  });

  it('todos en 0 → weight 0', () => {
    expect(
      computeEdgeWeight({
        migration: 0,
        climate_twin: 0,
        genoma_similarity: 0,
        pulse_correlation: 0,
      }),
    ).toBe(0);
  });

  it('weight ≥ EDGE_WEIGHT_MIN_PERSIST cuando los componentes son medios', () => {
    const mid = {
      migration: 40,
      climate_twin: 40,
      genoma_similarity: 40,
      pulse_correlation: 40,
    };
    expect(computeEdgeWeight(mid)).toBeGreaterThanOrEqual(EDGE_WEIGHT_MIN_PERSIST);
  });
});

describe('computeEdgeWeightCustom', () => {
  it('custom weights sobreescriben defaults', () => {
    const types = {
      migration: 100,
      climate_twin: 0,
      genoma_similarity: 0,
      pulse_correlation: 100,
    };
    const w = computeEdgeWeightCustom(types, { migration: 1, pulse_correlation: 0.1 });
    // migration weight 1 domina → w ~ 100*1 + 100*0.1 / 1.1 = 110/1.1 ~ 100
    expect(w).toBeGreaterThan(90);
  });

  it('misma custom que default → mismo resultado', () => {
    const types = {
      migration: 50,
      climate_twin: 50,
      genoma_similarity: 50,
      pulse_correlation: 50,
    };
    const wDefault = computeEdgeWeight(types);
    const wCustom = computeEdgeWeightCustom(types, EDGE_TYPE_DEFAULT_WEIGHTS);
    expect(Math.abs(wDefault - wCustom)).toBeLessThan(0.01);
  });
});

describe('cosineSimilarity', () => {
  it('vectores idénticos → 1', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it('vectores ortogonales → 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('vectores opuestos → -1', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('longitudes distintas → 0', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('vectores vacíos → 0', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe('isEdgeTypeBreakdown', () => {
  it('acepta objeto válido con los 4 tipos', () => {
    expect(
      isEdgeTypeBreakdown({
        migration: 50,
        climate_twin: 60,
        genoma_similarity: 70,
        pulse_correlation: 40,
      }),
    ).toBe(true);
  });

  it('rechaza null', () => {
    expect(isEdgeTypeBreakdown(null)).toBe(false);
  });

  it('rechaza array', () => {
    expect(isEdgeTypeBreakdown([50, 60, 70, 40])).toBe(false);
  });

  it('rechaza objeto con tipos faltantes', () => {
    expect(isEdgeTypeBreakdown({ migration: 50 })).toBe(false);
  });
});

describe('runLouvain', () => {
  it('grafo vacío → 0 comunidades', () => {
    const r = runLouvain([]);
    expect(r.num_communities).toBe(0);
    expect(r.communities.size).toBe(0);
  });

  it('dos clusters claramente separados', () => {
    // 2 triángulos conectados débilmente.
    const edges = [
      { source: 'a', target: 'b', weight: 100 },
      { source: 'b', target: 'c', weight: 100 },
      { source: 'a', target: 'c', weight: 100 },
      { source: 'd', target: 'e', weight: 100 },
      { source: 'e', target: 'f', weight: 100 },
      { source: 'd', target: 'f', weight: 100 },
      { source: 'c', target: 'd', weight: 5 }, // weak bridge
    ];
    const r = runLouvain(edges);
    expect(r.num_communities).toBeGreaterThanOrEqual(2);
    // Louvain puede no converger perfectamente en grafos tiny — aceptamos
    // que al menos los triángulos no acaben todos en el mismo cluster.
    const aCl = r.communities.get('a');
    const fCl = r.communities.get('f');
    expect(aCl).not.toBe(fCl);
  });

  it('determinismo (misma entrada → mismo output)', () => {
    const edges = [
      { source: 'a', target: 'b', weight: 50 },
      { source: 'b', target: 'c', weight: 50 },
    ];
    const r1 = runLouvain(edges);
    const r2 = runLouvain(edges);
    expect(r1.num_communities).toBe(r2.num_communities);
    expect(r1.modularity).toBe(r2.modularity);
  });
});
