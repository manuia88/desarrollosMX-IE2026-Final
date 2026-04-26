import { describe, expect, it } from 'vitest';
import { runACM } from '../acm-engine';
import { ACM_WEIGHTS, type AcmInput } from '../types';

function baseInput(over: Partial<AcmInput> = {}): AcmInput {
  return {
    precioSolicitado: 5_000_000,
    precioMedianaZona: 5_000_000,
    zoneId: '11111111-1111-4111-8111-111111111111',
    zonePulseScore: 1,
    amenidadesPropiedad: ['gym', 'pool'],
    amenidadesMedianaZona: ['gym', 'pool'],
    areaM2: 100,
    areaMedianaZona: 100,
    discZonaScore: 1,
    discProfile: 'D',
    tipoOperacion: 'venta',
    ...over,
  };
}

const FIXED_NOW = '2026-04-26T00:00:00.000Z';

describe('runACM weights', () => {
  it('weights sum to 1.0', () => {
    const sum = Object.values(ACM_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe('runACM score boundaries', () => {
  it('returns score near 100 for perfect input', () => {
    const result = runACM(baseInput(), { now: FIXED_NOW });
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.breakdown.priceFit).toBe(1);
    expect(result.breakdown.amenities).toBe(1);
    expect(result.breakdown.sizeFit).toBe(1);
  });

  it('penalizes underprice (precio << mediana)', () => {
    const result = runACM(
      baseInput({ precioSolicitado: 2_500_000, precioMedianaZona: 5_000_000 }),
      { now: FIXED_NOW },
    );
    expect(result.breakdown.priceFit).toBeLessThan(0.6);
    expect(result.rationale.some((r) => r.includes('priceUnder') || r.includes('priceOver'))).toBe(
      true,
    );
  });

  it('penalizes overprice (precio >> mediana)', () => {
    const result = runACM(
      baseInput({ precioSolicitado: 9_000_000, precioMedianaZona: 5_000_000 }),
      { now: FIXED_NOW },
    );
    expect(result.breakdown.priceFit).toBeLessThan(0.5);
    expect(result.rationale).toContain('rationale.priceOver');
  });
});

describe('runACM zone fallback', () => {
  it('falls back to 0.5 when zoneId null', () => {
    const result = runACM(baseInput({ zoneId: null }), { now: FIXED_NOW });
    expect(result.breakdown.zoneScore).toBe(0.5);
    expect(result.hasFallbackZoneScore).toBe(true);
    expect(result.rationale).toContain('rationale.zoneWeak');
  });

  it('falls back to 0.5 when zonePulseScore undefined', () => {
    const result = runACM(
      baseInput({ zoneId: '22222222-2222-4222-8222-222222222222', zonePulseScore: undefined }),
      { now: FIXED_NOW },
    );
    expect(result.breakdown.zoneScore).toBe(0.5);
    expect(result.hasFallbackZoneScore).toBe(true);
  });
});

describe('runACM amenities', () => {
  it('returns low score when amenities scarce', () => {
    const result = runACM(
      baseInput({
        amenidadesPropiedad: [],
        amenidadesMedianaZona: ['gym', 'pool', 'sauna', 'rooftop'],
      }),
      { now: FIXED_NOW },
    );
    expect(result.breakdown.amenities).toBe(0);
    expect(result.rationale).toContain('rationale.amenitiesScarce');
  });
});

describe('runACM disc neutral', () => {
  it('uses neutral 0.5 when no disc data', () => {
    const result = runACM(baseInput({ discZonaScore: undefined, discProfile: undefined }), {
      now: FIXED_NOW,
    });
    expect(result.breakdown.discZone).toBe(0.5);
    expect(result.rationale).toContain('rationale.discNeutral');
  });
});

describe('runACM determinism', () => {
  it('produces identical output for identical input', () => {
    const input = baseInput({ precioSolicitado: 4_500_000 });
    const a = runACM(input, { now: FIXED_NOW });
    const b = runACM(input, { now: FIXED_NOW });
    expect(a).toEqual(b);
    expect(a.inputsHash).toBe(b.inputsHash);
  });

  it('inputsHash is stable across amenities ordering', () => {
    const a = runACM(baseInput({ amenidadesPropiedad: ['gym', 'pool'] }), { now: FIXED_NOW });
    const b = runACM(baseInput({ amenidadesPropiedad: ['pool', 'gym'] }), { now: FIXED_NOW });
    expect(a.inputsHash).toBe(b.inputsHash);
  });
});
