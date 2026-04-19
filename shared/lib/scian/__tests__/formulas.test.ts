import { describe, expect, it } from 'vitest';
import {
  computeZoneScianStats,
  gentrificationVelocity,
  ratioPremiumBasic,
  shannonDiversity,
} from '../formulas';

describe('ratioPremiumBasic', () => {
  it('zona premium: high>>basic → ratio > 1.5', () => {
    expect(ratioPremiumBasic({ high: 30, standard: 20, basic: 5 })).toBeCloseTo(5);
  });

  it('zona basic-only: high=0 → ratio = 0', () => {
    expect(ratioPremiumBasic({ high: 0, standard: 5, basic: 50 })).toBe(0);
  });

  it('smooth: basic=0 no provoca división por cero', () => {
    expect(ratioPremiumBasic({ high: 5, standard: 0, basic: 0 })).toBe(5);
  });
});

describe('shannonDiversity', () => {
  it('total = 0 → H = 0', () => {
    expect(shannonDiversity({})).toBe(0);
  });

  it('una sola categoría → H = 0 (monopolio)', () => {
    expect(shannonDiversity({ gastronomia: 100 })).toBe(0);
  });

  it('distribución uniforme entre 12 categorías → H ≈ ln(12)', () => {
    const counts = {
      gastronomia: 10,
      retail: 10,
      salud: 10,
      educacion: 10,
      servicios_profesionales: 10,
      cultura_entretenimiento: 10,
      financiero: 10,
      fitness_wellness: 10,
      servicios_publicos: 10,
      automotriz: 10,
      manufacturas: 10,
      logistica: 10,
    };
    expect(shannonDiversity(counts)).toBeCloseTo(Math.log(12), 5);
  });

  it('zona urbana real ~3 categorías dominantes → 0.8 < H < 1.2', () => {
    const counts = {
      gastronomia: 40,
      retail: 30,
      salud: 20,
      educacion: 10,
    };
    const h = shannonDiversity(counts);
    expect(h).toBeGreaterThan(0.8);
    expect(h).toBeLessThan(1.5);
  });
});

describe('gentrificationVelocity', () => {
  it('aumento +30% → velocity = 0.3', () => {
    expect(gentrificationVelocity(1.3, 1.0)).toBeCloseTo(0.3);
  });

  it('estable → velocity ≈ 0', () => {
    expect(gentrificationVelocity(1.0, 1.0)).toBe(0);
  });

  it('desinversión: ratio bajó → velocity negativo', () => {
    expect(gentrificationVelocity(0.5, 1.0)).toBeCloseTo(-0.5);
  });

  it('baseline muy bajo → null (evita división por casi-cero)', () => {
    expect(gentrificationVelocity(2.0, 0.01)).toBeNull();
  });

  it('baseline negativo o NaN → null', () => {
    expect(gentrificationVelocity(2.0, Number.NaN)).toBeNull();
  });
});

describe('computeZoneScianStats', () => {
  it('combina counts + computa todas las fórmulas', () => {
    const stats = computeZoneScianStats({
      tier_counts: { high: 20, standard: 30, basic: 10 },
      macro_counts: {
        gastronomia: 25,
        retail: 20,
        salud: 10,
        servicios_profesionales: 5,
      },
      ratio_pb_twelve_months_ago: 1.0,
    });

    expect(stats.total_businesses).toBe(60);
    expect(stats.ratio_pb).toBeCloseTo(20 / 11);
    expect(stats.shannon).toBeGreaterThan(0);
    expect(stats.gentrification_velocity).not.toBeNull();
    expect(stats.macro_counts.gastronomia).toBe(25);
  });

  it('sin baseline 12m → gentrification_velocity = null', () => {
    const stats = computeZoneScianStats({
      tier_counts: { high: 1, standard: 1, basic: 1 },
      macro_counts: { retail: 3 },
    });
    expect(stats.gentrification_velocity).toBeNull();
  });
});
