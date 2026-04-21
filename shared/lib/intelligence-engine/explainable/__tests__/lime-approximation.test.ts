import { describe, expect, it } from 'vitest';
import {
  computeSensitivity,
  explainPrediction,
  type PredictFn,
} from '@/shared/lib/intelligence-engine/explainable/lime-approximation';

const linearPredict: PredictFn = (f) =>
  0.4 * (f.precio_m2 ?? 0) +
  0.3 * (f.walkability ?? 0) +
  0.2 * (f.zone_polanco ?? 0) +
  0.1 * (f.recamaras ?? 0);

describe('D19 explainPrediction (LIME approximation)', () => {
  it('retorna baseline + contributors + method tag', () => {
    const res = explainPrediction({
      features: [
        { name: 'precio_m2', value: 50 },
        { name: 'walkability', value: 70 },
        { name: 'zone_polanco', value: 80 },
        { name: 'recamaras', value: 2 },
      ],
      predictFn: linearPredict,
    });
    expect(res.method).toBe('lime_local_partial_dependence');
    expect(res.baseline_prediction).toBeCloseTo(0.4 * 50 + 0.3 * 70 + 0.2 * 80 + 0.1 * 2, 4);
    expect(res.top_contributors.length).toBeGreaterThan(0);
  });

  it('feature con mayor peso aparece primero en top_contributors', () => {
    const res = explainPrediction({
      features: [
        { name: 'precio_m2', value: 50 },
        { name: 'walkability', value: 70 },
        { name: 'zone_polanco', value: 80 },
        { name: 'recamaras', value: 2 },
      ],
      predictFn: linearPredict,
    });
    // precio_m2 peso 0.4, pero impact = 0.4 * 50 * 0.1 = 2.0
    // walkability peso 0.3, impact = 0.3 * 70 * 0.1 = 2.1
    // zone_polanco peso 0.2, impact = 0.2 * 80 * 0.1 = 1.6
    // → walkability aparece primero
    expect(res.top_contributors[0]?.feature).toBe('walkability');
  });

  it('direction positive cuando feature sube → score sube', () => {
    const res = explainPrediction({
      features: [{ name: 'x', value: 10 }],
      predictFn: (f) => (f.x ?? 0) * 2,
    });
    expect(res.top_contributors[0]?.direction).toBe('positive');
  });

  it('direction negative cuando feature sube → score baja', () => {
    const res = explainPrediction({
      features: [{ name: 'x', value: 10 }],
      predictFn: (f) => 100 - (f.x ?? 0),
    });
    expect(res.top_contributors[0]?.direction).toBe('negative');
  });

  it('relative_weight_pct suma ≤100 y es no-negativo', () => {
    const res = explainPrediction({
      features: [
        { name: 'a', value: 10 },
        { name: 'b', value: 20 },
        { name: 'c', value: 30 },
      ],
      predictFn: (f) => (f.a ?? 0) + (f.b ?? 0) + (f.c ?? 0),
    });
    const sum = res.top_contributors.reduce((s, c) => s + c.relative_weight_pct, 0);
    expect(sum).toBeGreaterThan(95);
    expect(sum).toBeLessThan(105);
    for (const c of res.top_contributors) {
      expect(c.relative_weight_pct).toBeGreaterThanOrEqual(0);
    }
  });

  it('top_n cap funciona', () => {
    const features = Array.from({ length: 10 }, (_, i) => ({
      name: `f${i}`,
      value: i + 1,
    }));
    const res = explainPrediction({
      features,
      predictFn: (f) => Object.values(f).reduce((s, v) => s + v, 0),
      top_n: 3,
    });
    expect(res.top_contributors).toHaveLength(3);
  });

  it('delta_pct custom modifica impact_pts proporcional', () => {
    const a = explainPrediction({
      features: [{ name: 'x', value: 100 }],
      predictFn: (f) => (f.x ?? 0) * 0.5,
      delta_pct: 0.1,
    });
    const b = explainPrediction({
      features: [{ name: 'x', value: 100 }],
      predictFn: (f) => (f.x ?? 0) * 0.5,
      delta_pct: 0.2,
    });
    expect(Math.abs(b.top_contributors[0]?.impact_pts ?? 0)).toBeGreaterThan(
      Math.abs(a.top_contributors[0]?.impact_pts ?? 0),
    );
  });
});

describe('D14 computeSensitivity', () => {
  it('retorna entries por dimension con impact_pct_per_10pct_change', () => {
    const res = explainPrediction({
      features: [
        { name: 'precio_m2', value: 50 },
        { name: 'walkability', value: 70 },
      ],
      predictFn: linearPredict,
    });
    const base = res.baseline_prediction;
    const sens = computeSensitivity(res, base);
    expect(sens.length).toBe(2);
    for (const s of sens) {
      expect(typeof s.impact_pct_per_10pct_change).toBe('number');
    }
  });

  it('baseScore 0 → todos impacts 0 (guard)', () => {
    const res = explainPrediction({
      features: [{ name: 'x', value: 10 }],
      predictFn: () => 0,
    });
    const sens = computeSensitivity(res, 0);
    expect(sens[0]?.impact_pct_per_10pct_change).toBe(0);
  });
});
