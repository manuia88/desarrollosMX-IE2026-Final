import { describe, expect, it } from 'vitest';
import {
  forwardPointDate,
  linearRegression,
  projectForwardCurve,
  projectPulseForecast30d,
} from '../curve-calculator';

describe('linearRegression', () => {
  it('recupera coeficientes exactos para una recta pura', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [10, 20, 30, 40, 50]; // y = 10 + 10*x
    const { a, b, residualStd } = linearRegression(xs, ys);
    expect(a).toBeCloseTo(10, 5);
    expect(b).toBeCloseTo(10, 5);
    expect(residualStd).toBeCloseTo(0, 5);
  });

  it('calcula residualStd > 0 para data ruidosa', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [10, 22, 28, 41, 53];
    const { residualStd } = linearRegression(xs, ys);
    expect(residualStd).toBeGreaterThan(0);
  });
});

describe('projectForwardCurve', () => {
  const makeHistory = (values: number[]) =>
    values.map((v, i) => ({
      period_date: `2025-${String(i + 1).padStart(2, '0')}-01`,
      value: v,
    }));

  it('devuelve 4 puntos (3, 6, 12, 24m)', () => {
    const res = projectForwardCurve(makeHistory([50, 55, 60, 65, 70, 75]));
    expect(res.points).toHaveLength(4);
    expect(res.points.map((p) => p.horizon_m)).toEqual([3, 6, 12, 24]);
  });

  it('sin historia suficiente → values null', () => {
    const res = projectForwardCurve(makeHistory([50]));
    for (const p of res.points) {
      expect(p.value).toBeNull();
      expect(p.lower).toBeNull();
      expect(p.upper).toBeNull();
    }
  });

  it('banda coherente: lower <= value <= upper por punto', () => {
    const res = projectForwardCurve(makeHistory([50, 55, 60, 65, 70, 75]));
    for (const p of res.points) {
      if (p.value !== null && p.lower !== null && p.upper !== null) {
        expect(p.lower).toBeLessThanOrEqual(p.value);
        expect(p.value).toBeLessThanOrEqual(p.upper);
      }
    }
  });

  it('values clampeados en [0, 100]', () => {
    const res = projectForwardCurve(makeHistory([95, 96, 97, 98, 99, 100]));
    for (const p of res.points) {
      if (p.value !== null) {
        expect(p.value).toBeGreaterThanOrEqual(0);
        expect(p.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it('confidence aumenta con más history points', () => {
    const resLow = projectForwardCurve(makeHistory([50, 55, 60, 65]));
    const resHigh = projectForwardCurve(makeHistory([50, 55, 60, 65, 70, 75, 80, 85, 90, 95]));
    expect(resHigh.confidence).toBeGreaterThan(resLow.confidence);
  });
});

describe('projectPulseForecast30d', () => {
  const makeDaily = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      value: 50 + i * 0.5,
    }));

  it('devuelve 30 puntos por default', () => {
    const res = projectPulseForecast30d(makeDaily(40), 30, '2025-02-09');
    expect(res.points).toHaveLength(30);
  });

  it('honra el parámetro days', () => {
    const res = projectPulseForecast30d(makeDaily(40), 15);
    expect(res.points).toHaveLength(15);
  });

  it('forecast_date continuo y creciente', () => {
    const res = projectPulseForecast30d(makeDaily(40), 30, '2025-02-09');
    for (let i = 1; i < res.points.length; i++) {
      const prev = res.points[i - 1];
      const curr = res.points[i];
      if (!prev || !curr) continue;
      expect(curr.forecast_date > prev.forecast_date).toBe(true);
    }
  });

  it('banda coherente: value_lower <= value <= value_upper', () => {
    const res = projectPulseForecast30d(makeDaily(40), 30);
    for (const p of res.points) {
      if (p.value_lower !== null && p.value_upper !== null) {
        expect(p.value_lower).toBeLessThanOrEqual(p.value);
        expect(p.value).toBeLessThanOrEqual(p.value_upper);
      }
    }
  });

  it('history vacío → 30 puntos con value=50 neutro + bandas null', () => {
    const res = projectPulseForecast30d([], 30);
    expect(res.points).toHaveLength(30);
    for (const p of res.points) {
      expect(p.value).toBe(50);
      expect(p.value_lower).toBeNull();
      expect(p.value_upper).toBeNull();
    }
  });

  it('es determinístico: mismo input → mismo output', () => {
    const input = makeDaily(40);
    const r1 = projectPulseForecast30d(input, 30, '2025-02-09');
    const r2 = projectPulseForecast30d(input, 30, '2025-02-09');
    expect(r1.points).toEqual(r2.points);
  });
});

describe('forwardPointDate', () => {
  it('suma meses correctos', () => {
    expect(forwardPointDate('2025-01-15', 3)).toBe('2025-04-15');
    expect(forwardPointDate('2025-11-10', 6)).toBe('2026-05-10');
    expect(forwardPointDate('2025-03-05', 12)).toBe('2026-03-05');
    expect(forwardPointDate('2025-06-01', 24)).toBe('2027-06-01');
  });
});
