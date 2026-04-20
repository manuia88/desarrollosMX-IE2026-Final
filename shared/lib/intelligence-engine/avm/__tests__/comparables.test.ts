import { describe, expect, it } from 'vitest';
import { counterEstimateFromComparables, fetchComparables } from '../comparables';
import type { AvmComparable } from '../types';

const FIXTURE_COMPARABLES: readonly AvmComparable[] = [
  { id: 'f1', distance_m: 450, similarity_score: 0.92, price_m2: 62000 },
  { id: 'f2', distance_m: 800, similarity_score: 0.85, price_m2: 58000 },
  { id: 'f3', distance_m: 1200, similarity_score: 0.78, price_m2: 65000 },
  { id: 'f4', distance_m: 1800, similarity_score: 0.7, price_m2: 60000 },
  { id: 'f5', distance_m: 2400, similarity_score: 0.65, price_m2: 70000 },
];

describe('AVM comparables', () => {
  it('fetchComparables sin supabase devuelve fallback fixture', async () => {
    const result = await fetchComparables(
      null,
      { lat: 19.38, lng: -99.17, sup_m2: 120, tipo_propiedad: 'depto' },
      { fallbackFixture: FIXTURE_COMPARABLES },
    );
    expect(result).toHaveLength(5);
    expect(result[0]?.id).toBe('f1');
  });

  it('fetchComparables maxResults limita output', async () => {
    const result = await fetchComparables(
      null,
      { lat: 19.38, lng: -99.17, sup_m2: 120, tipo_propiedad: 'depto' },
      { fallbackFixture: FIXTURE_COMPARABLES, maxResults: 3 },
    );
    expect(result).toHaveLength(3);
  });

  it('counterEstimateFromComparables median × sup_m2', () => {
    const est = counterEstimateFromComparables(FIXTURE_COMPARABLES, 100);
    // median de [58000, 60000, 62000, 65000, 70000] = 62000 × 100 = 6.2M
    expect(est).toBe(6200000);
  });

  it('counterEstimateFromComparables < 3 devuelve null', () => {
    const est = counterEstimateFromComparables(FIXTURE_COMPARABLES.slice(0, 2), 100);
    expect(est).toBeNull();
  });

  it('counterEstimateFromComparables pares toma promedio 2 mediános', () => {
    const four: readonly AvmComparable[] = FIXTURE_COMPARABLES.slice(0, 4);
    const est = counterEstimateFromComparables(four, 100);
    // sorted [58000, 60000, 62000, 65000] → avg de 60000 y 62000 = 61000
    expect(est).toBe(6100000);
  });
});
