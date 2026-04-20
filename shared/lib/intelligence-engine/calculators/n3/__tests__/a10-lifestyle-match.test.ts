import { describe, expect, it } from 'vitest';
import {
  computeA10LifestyleMatch,
  DEFAULT_PROFILE_WEIGHTS,
  getLabelKey,
  methodology,
  PPD_SIGNALS_THRESHOLD,
  version,
} from '../a10-lifestyle-match';

describe('A10 Lifestyle Match', () => {
  it('declara methodology + 6 profiles + ppd threshold', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.profiles).toHaveLength(6);
    expect(methodology.ppd_signals_threshold).toBe(PPD_SIGNALS_THRESHOLD);
  });

  it('suma pesos per perfil = 1', () => {
    for (const [profile, weights] of Object.entries(DEFAULT_PROFILE_WEIGHTS)) {
      const sum = Object.values(weights).reduce((s, v) => s + v, 0);
      expect(sum, `profile ${profile}`).toBeCloseTo(1, 5);
    }
  });

  it('family profile + zone con H01=90 + F01=85 + parques=80 → match alto', () => {
    const res = computeA10LifestyleMatch({
      profile: 'family',
      zone_dimensions: { H01: 90, F01: 85, parques: 80, H02: 75, F02: 70, N04: 60 },
    });
    expect(res.value).toBeGreaterThanOrEqual(75);
    expect(res.components.ppd_calibrated).toBe(false);
  });

  it('nightlife profile + zone con N09=95 + N08=85 → top match', () => {
    const res = computeA10LifestyleMatch({
      profile: 'nightlife',
      zone_dimensions: { N09: 95, N08: 85, F02: 80, F03: 70, gastronomico: 90 },
    });
    expect(res.components.profile).toBe('nightlife');
    expect(res.value).toBeGreaterThanOrEqual(80);
  });

  it('D30: PPD signals >= 10 → ppd_calibrated true + personalized_weights populated', () => {
    const res = computeA10LifestyleMatch({
      profile: 'family',
      zone_dimensions: { H01: 90, F01: 85, parques: 80, H02: 75, F02: 70, N04: 60 },
      behavioral_preferences: {
        emotional: { value: 0.7, confidence: 0.8 },
        tecnico: { value: 0.4, confidence: 0.6 },
        urbano: { value: 0.5, confidence: 0.7 },
        financiero: { value: 0.3, confidence: 0.5 },
        espacial: { value: 0.8, confidence: 0.85 }, // alto → refuerza H01 schools
        inversion: { value: 0.2, confidence: 0.4 },
        total_signals: 25,
      },
    });
    expect(res.components.ppd_calibrated).toBe(true);
    expect(res.components.personalized_weights).not.toBeNull();
    expect(res.components.ppd_signals_used).toBe(25);
    const ppd = res.components.personalized_weights;
    if (ppd) {
      const sum = Object.values(ppd).reduce((s: number, v) => s + (v as number), 0);
      expect(sum).toBeCloseTo(1, 3);
    }
  });

  it('D30: PPD signals < 10 → fallback a defaults, ppd_calibrated false', () => {
    const res = computeA10LifestyleMatch({
      profile: 'family',
      zone_dimensions: { H01: 90, F01: 85, parques: 80, H02: 75, F02: 70, N04: 60 },
      behavioral_preferences: {
        emotional: { value: 0.7, confidence: 0.8 },
        tecnico: { value: 0.4, confidence: 0.6 },
        urbano: { value: 0.5, confidence: 0.7 },
        financiero: { value: 0.3, confidence: 0.5 },
        espacial: { value: 0.8, confidence: 0.85 },
        inversion: { value: 0.2, confidence: 0.4 },
        total_signals: 5, // bajo threshold
      },
    });
    expect(res.components.ppd_calibrated).toBe(false);
    expect(res.components.personalized_weights).toBeNull();
  });

  it('coverage <50% → insufficient_data', () => {
    const res = computeA10LifestyleMatch({
      profile: 'quiet',
      zone_dimensions: { N04: 80 }, // 1 de 6 dims
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('top_dimensions identifica las 3 con mayor contribución', () => {
    const res = computeA10LifestyleMatch({
      profile: 'investor',
      zone_dimensions: { N11: 90, F09: 85, A04: 80, A12: 60, B08: 40 },
    });
    expect(res.components.top_dimensions).toHaveLength(3);
    expect(res.components.top_dimensions[0]).toBe('N11');
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.a10.match_excelente');
    expect(getLabelKey(65, 'medium')).toBe('ie.score.a10.match_bueno');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.a10.match_regular');
    expect(getLabelKey(20, 'low')).toBe('ie.score.a10.match_pobre');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.a10.insufficient');
  });
});
