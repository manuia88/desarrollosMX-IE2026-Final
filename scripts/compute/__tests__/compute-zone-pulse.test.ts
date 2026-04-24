import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computePulseForZoneDay, computePulseSeries, hashSeed } from '../07_compute-zone-pulse.ts';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('hashSeed', () => {
  it('es determinista: mismo input → mismo output', () => {
    const a = hashSeed('roma-norte', 42);
    const b = hashSeed('roma-norte', 42);
    expect(a).toBe(b);
  });

  it('output siempre en [0, 1)', () => {
    const samples: number[] = [];
    for (let d = 0; d < 200; d++) {
      samples.push(hashSeed('condesa', d));
      samples.push(hashSeed(`zone-${d}`, d));
    }
    for (const v of samples) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('inputs distintos producen outputs distintos (3 pares)', () => {
    expect(hashSeed('a', 0)).not.toBe(hashSeed('b', 0));
    expect(hashSeed('roma-norte', 10)).not.toBe(hashSeed('roma-norte', 11));
    expect(hashSeed('polanco', 5)).not.toBe(hashSeed('coyoacan', 5));
  });
});

describe('computePulseForZoneDay', () => {
  it('retorna pulse_score en [0, 100]', () => {
    for (let d = 0; d < 365; d++) {
      const r = computePulseForZoneDay('roma-norte', d);
      expect(r.pulseScore).toBeGreaterThanOrEqual(0);
      expect(r.pulseScore).toBeLessThanOrEqual(100);
    }
  });

  it('es determinista: misma zone+día dos veces → mismo output', () => {
    const a = computePulseForZoneDay('polanco', 123);
    const b = computePulseForZoneDay('polanco', 123);
    expect(a.pulseScore).toBe(b.pulseScore);
    expect(a.baseline).toBe(b.baseline);
    expect(a.jitter).toBe(b.jitter);
    expect(a.activityIndex).toBe(b.activityIndex);
  });

  it('zones distintas mismo día → pulse_scores distintos (3 zones)', () => {
    const a = computePulseForZoneDay('roma-norte', 50);
    const b = computePulseForZoneDay('condesa', 50);
    const c = computePulseForZoneDay('polanco', 50);
    expect(a.pulseScore).not.toBe(b.pulseScore);
    expect(b.pulseScore).not.toBe(c.pulseScore);
    expect(a.pulseScore).not.toBe(c.pulseScore);
  });

  it('misma zone días consecutivos → scores bounded aunque puedan diferir', () => {
    const today = computePulseForZoneDay('coyoacan', 100);
    const tomorrow = computePulseForZoneDay('coyoacan', 101);
    expect(today.pulseScore).toBeGreaterThanOrEqual(0);
    expect(today.pulseScore).toBeLessThanOrEqual(100);
    expect(tomorrow.pulseScore).toBeGreaterThanOrEqual(0);
    expect(tomorrow.pulseScore).toBeLessThanOrEqual(100);
  });

  it('activityIndex en [0, 1]', () => {
    for (let d = 0; d < 50; d++) {
      const r = computePulseForZoneDay('narvarte', d);
      expect(r.activityIndex).toBeGreaterThanOrEqual(0);
      expect(r.activityIndex).toBeLessThanOrEqual(1);
    }
  });
});

describe('computePulseSeries', () => {
  const REF = new Date(Date.UTC(2026, 3, 24));

  it('entries.length === lookbackDays (30 → 30)', () => {
    const series = computePulseSeries('roma-norte', 30, REF);
    expect(series).toHaveLength(30);
  });

  it('components.data_source === "synthetic-derived-v1"', () => {
    const series = computePulseSeries('roma-norte', 5, REF);
    for (const e of series) {
      expect(e.components.data_source).toBe('synthetic-derived-v1');
    }
  });

  it('momentum del primer día (más antiguo) es 0', () => {
    const series = computePulseSeries('polanco', 10, REF);
    expect(series[0]?.components.momentum).toBe(0);
  });

  it('volatility es 0 para días i < 6 (window 7d no completo)', () => {
    const series = computePulseSeries('polanco', 15, REF);
    for (let i = 0; i < 6; i++) {
      expect(series[i]?.components.volatility).toBe(0);
    }
    // Desde i=6 en adelante puede (no obligado) ser > 0.
  });

  it('period_date monotónico ascendente', () => {
    const series = computePulseSeries('condesa', 20, REF);
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1]?.period_date ?? '';
      const cur = series[i]?.period_date ?? '';
      expect(cur > prev).toBe(true);
    }
  });

  it('todos los pulse_scores clamped a [0, 100]', () => {
    const series = computePulseSeries('narvarte', 365, REF);
    for (const e of series) {
      expect(e.pulse_score).toBeGreaterThanOrEqual(0);
      expect(e.pulse_score).toBeLessThanOrEqual(100);
    }
  });

  it('confidence="medium" para últimos 30 días, "low" para resto', () => {
    const lookback = 60;
    const series = computePulseSeries('roma-norte', lookback, REF);
    // Últimos 30 (índices [30, 59]) → medium
    for (let i = lookback - 30; i < lookback; i++) {
      expect(series[i]?.confidence).toBe('medium');
    }
    // Antes de últimos 30 (índices [0, 29]) → low
    for (let i = 0; i < lookback - 30; i++) {
      expect(series[i]?.confidence).toBe('low');
    }
  });

  it('último period_date === referenceDate formateado', () => {
    const series = computePulseSeries('coyoacan', 5, REF);
    expect(series[series.length - 1]?.period_date).toBe('2026-04-24');
  });

  it('lookbackDays=0 retorna []', () => {
    const series = computePulseSeries('roma-norte', 0, REF);
    expect(series).toEqual([]);
  });

  it('momentum en día >0 es diferencia de pulse_scores', () => {
    const series = computePulseSeries('polanco', 5, REF);
    for (let i = 1; i < series.length; i++) {
      const diff = (series[i]?.pulse_score ?? 0) - (series[i - 1]?.pulse_score ?? 0);
      // Round to 2 decimals for comparison
      const rounded = Math.round(diff * 100) / 100;
      expect(series[i]?.components.momentum).toBeCloseTo(rounded, 2);
    }
  });

  it('determinismo de serie: llamadas idénticas → entries idénticos', () => {
    const a = computePulseSeries('roma-norte', 30, REF);
    const b = computePulseSeries('roma-norte', 30, REF);
    expect(a).toEqual(b);
  });
});
