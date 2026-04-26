import { describe, expect, it } from 'vitest';
import {
  type BusquedaCriteria,
  computeMatch,
  MATCHER_WEIGHTS,
  type MatcherInput,
  runMatcher,
  type UnidadCandidate,
} from '../matcher-engine';

const baseCriteria: BusquedaCriteria = {
  operacion: 'venta',
  zone_ids: [],
  ciudades: [],
  currency: 'MXN',
  amenities: [],
};

function candidate(overrides: Partial<UnidadCandidate> = {}): UnidadCandidate {
  return {
    unidadId: overrides.unidadId ?? 'u1',
    proyectoId: overrides.proyectoId ?? 'p1',
    proyectoZoneId: overrides.proyectoZoneId ?? null,
    proyectoAmenities: overrides.proyectoAmenities ?? [],
    proyectoCiudad: overrides.proyectoCiudad ?? null,
    unidadRecamaras: overrides.unidadRecamaras ?? null,
    unidadPriceMxn: overrides.unidadPriceMxn ?? null,
  };
}

function input(over: Partial<MatcherInput> = {}): MatcherInput {
  return {
    criteria: over.criteria ?? baseCriteria,
    candidates: over.candidates ?? [],
    zoneScores: over.zoneScores ?? new Map(),
    discProfile: over.discProfile,
    familySize: over.familySize,
  };
}

describe('matcher-engine weights', () => {
  it('weights sum to 1', () => {
    const sum = Object.values(MATCHER_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe('matcher-engine computeMatch', () => {
  it('returns max score (100) when every dimension is perfect', () => {
    const c = candidate({
      proyectoZoneId: 'z1',
      proyectoAmenities: ['gym', 'pool'],
      proyectoCiudad: 'CDMX',
      unidadRecamaras: 2,
      unidadPriceMxn: 4_000_000,
    });
    const criteria: BusquedaCriteria = {
      ...baseCriteria,
      tipo: 'departamento',
      price_min: 3_000_000,
      price_max: 5_000_000,
      recamaras_min: 2,
      recamaras_max: 3,
      ciudades: ['CDMX'],
      amenities: ['gym', 'pool'],
    };
    const score = computeMatch(
      input({
        criteria,
        candidates: [c],
        zoneScores: new Map([['z1', 95]]),
        discProfile: 'D',
      }),
      c,
    );
    expect(score.total).toBeGreaterThanOrEqual(95);
    expect(score.breakdown.priceFit).toBe(1);
    expect(score.breakdown.amenitiesMatch).toBe(1);
    expect(score.rationale).toContain('rationale.cityPreferred');
  });

  it('penalizes price overage above 50%', () => {
    const c = candidate({ unidadPriceMxn: 10_000_000 });
    const criteria: BusquedaCriteria = {
      ...baseCriteria,
      price_min: 1_000_000,
      price_max: 2_000_000,
    };
    const score = computeMatch(input({ criteria, candidates: [c] }), c);
    expect(score.breakdown.priceFit).toBe(0);
    expect(score.rationale).toContain('rationale.priceFar');
  });

  it('returns price 1.0 inside range', () => {
    const c = candidate({ unidadPriceMxn: 1_500_000 });
    const criteria: BusquedaCriteria = {
      ...baseCriteria,
      price_min: 1_000_000,
      price_max: 2_000_000,
    };
    const score = computeMatch(input({ criteria, candidates: [c] }), c);
    expect(score.breakdown.priceFit).toBe(1);
    expect(score.rationale).toContain('rationale.priceInRange');
  });

  it('falls back to 0.5 when zoneScore missing', () => {
    const c = candidate({ proyectoZoneId: 'unknown' });
    const score = computeMatch(input({ candidates: [c] }), c);
    expect(score.breakdown.zoneIE).toBe(0.5);
  });

  it('amenities jaccard partial match', () => {
    const c = candidate({ proyectoAmenities: ['gym', 'pool'] });
    const criteria: BusquedaCriteria = {
      ...baseCriteria,
      amenities: ['gym', 'pool', 'sauna', 'rooftop'],
    };
    const score = computeMatch(input({ criteria, candidates: [c] }), c);
    expect(score.breakdown.amenitiesMatch).toBeCloseTo(0.5, 5);
  });

  it('family fit penalizes too few rooms', () => {
    const c = candidate({ unidadRecamaras: 1 });
    const criteria: BusquedaCriteria = {
      ...baseCriteria,
      recamaras_min: 3,
    };
    const score = computeMatch(input({ criteria, candidates: [c] }), c);
    expect(score.breakdown.familyFit).toBeLessThan(0.6);
  });

  it('disc profile D rewards top zone scores', () => {
    const c = candidate({ proyectoZoneId: 'z1' });
    const top = computeMatch(
      input({ candidates: [c], zoneScores: new Map([['z1', 90]]), discProfile: 'D' }),
      c,
    );
    const bottom = computeMatch(
      input({ candidates: [c], zoneScores: new Map([['z1', 30]]), discProfile: 'D' }),
      c,
    );
    expect(top.breakdown.discZone).toBeGreaterThan(bottom.breakdown.discZone);
  });

  it('disc profile undefined returns neutral 0.5', () => {
    const c = candidate({ proyectoZoneId: 'z1' });
    const s = computeMatch(input({ candidates: [c], zoneScores: new Map([['z1', 80]]) }), c);
    expect(s.breakdown.discZone).toBe(0.5);
  });

  it('produces stable rationale chips for matched amenities', () => {
    const c = candidate({ proyectoAmenities: ['gym', 'pool'] });
    const criteria: BusquedaCriteria = { ...baseCriteria, amenities: ['gym', 'pool'] };
    const s = computeMatch(input({ criteria, candidates: [c] }), c);
    expect(s.rationale).toContain('rationale.amenitiesMatch');
  });
});

describe('matcher-engine runMatcher', () => {
  it('sorts results by total descending', () => {
    const candidates: UnidadCandidate[] = [
      candidate({ unidadId: 'low', unidadPriceMxn: 100_000 }),
      candidate({ unidadId: 'mid', unidadPriceMxn: 1_500_000 }),
      candidate({ unidadId: 'high', unidadPriceMxn: 1_400_000 }),
    ];
    const criteria: BusquedaCriteria = {
      ...baseCriteria,
      price_min: 1_000_000,
      price_max: 2_000_000,
    };
    const out = runMatcher({
      criteria,
      candidates,
      zoneScores: new Map(),
    });
    expect(out[0]?.total).toBeGreaterThanOrEqual(out[1]?.total ?? 0);
    expect(out[1]?.total).toBeGreaterThanOrEqual(out[2]?.total ?? 0);
  });

  it('returns empty array when candidates empty', () => {
    const out = runMatcher({
      criteria: baseCriteria,
      candidates: [],
      zoneScores: new Map(),
    });
    expect(out).toEqual([]);
  });

  it('determinism: same input produces same output', () => {
    const c = candidate({
      proyectoZoneId: 'z1',
      unidadPriceMxn: 1_500_000,
      unidadRecamaras: 2,
    });
    const i = input({
      criteria: { ...baseCriteria, price_min: 1_000_000, price_max: 2_000_000 },
      candidates: [c],
      zoneScores: new Map([['z1', 70]]),
      discProfile: 'C',
    });
    const a = runMatcher(i);
    const b = runMatcher(i);
    expect(a).toEqual(b);
  });
});
