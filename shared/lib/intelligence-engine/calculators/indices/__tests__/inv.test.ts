import { describe, expect, it } from 'vitest';
import {
  computeDmxInv,
  DEFAULT_INV_WEIGHTS,
  getLabelKey,
  methodology,
  reasoning_template,
  scoreBandFor,
  version,
} from '../inv';

describe('DMX-INV Proyecto Inversión Institucional', () => {
  it('declara version, methodology ICO+MOM critical + score_bands + reasoning', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toContain('ICO');
    const critical = methodology.dependencies.filter((d) => d.critical).map((d) => d.score_id);
    expect(critical).toContain('ICO');
    expect(critical).toContain('MOM');
    const sumW = Object.values(DEFAULT_INV_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 3);
    expect(methodology.score_bands.excelente_min).toBe(80);
    expect(methodology.score_bands.bueno_min).toBe(65);
    expect(methodology.score_bands.regular_min).toBe(45);
    expect(reasoning_template).toContain('{score_band}');
  });

  it('getLabelKey + scoreBandFor — 4 bandas + insufficient', () => {
    expect(scoreBandFor(85)).toBe('Excelente');
    expect(scoreBandFor(70)).toBe('Bueno');
    expect(scoreBandFor(50)).toBe('Regular');
    expect(scoreBandFor(30)).toBe('Bajo');
    expect(getLabelKey(85, 'high')).toBe('ie.index.inv.excelente');
    expect(getLabelKey(70, 'medium')).toBe('ie.index.inv.bueno');
    expect(getLabelKey(50, 'medium')).toBe('ie.index.inv.regular');
    expect(getLabelKey(30, 'low')).toBe('ie.index.inv.bajo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.inv.insufficient');
  });

  it('happy path — todos componentes altos → Excelente band', () => {
    const result = computeDmxInv({
      ICO_value: 85,
      MOM_value: 80,
      F09_value: 82,
      A12_value: 78,
      H05_value: 85,
      B08_value: 15, // 85 invertido = absorción rápida
      universe_period: '2026-04-01',
    });
    expect(result.value).toBeGreaterThanOrEqual(70);
    expect(['Bueno', 'Excelente']).toContain(result.components.score_band);
    expect(result.confidence).not.toBe('insufficient_data');
    expect(result.components.coverage_pct).toBe(100);
  });

  it('nested lookup funcionando — ICO + MOM presentes + supporting → no insufficient', () => {
    const result = computeDmxInv({
      ICO_value: 70,
      MOM_value: 65,
      F09_value: 60,
      A12_value: 55,
      H05_value: 62,
      B08_value: 25,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).not.toBe('insufficient_data');
    expect(result.components.ICO).not.toBeNull();
    expect(result.components.MOM).not.toBeNull();
  });

  it('nested lookup falla — ICO null → confidence insufficient_data', () => {
    const result = computeDmxInv({
      ICO_value: null,
      MOM_value: 70,
      F09_value: 65,
      A12_value: 60,
      H05_value: 60,
      B08_value: 30,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.value).toBe(0);
    expect(result.components._meta.fallback_reason).toBe('nested_critical_missing');
    expect(result.components._meta.missing_components).toContain('ICO');
  });

  it('nested lookup falla — MOM null también insufficient', () => {
    const result = computeDmxInv({
      ICO_value: 70,
      MOM_value: null,
      F09_value: 65,
      A12_value: 60,
      H05_value: 60,
      B08_value: 30,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).toBe('insufficient_data');
  });

  it('missing supporting (A12/H05/B08) → weights renormalize + confidence degrade', () => {
    const result = computeDmxInv({
      ICO_value: 70,
      MOM_value: 65,
      F09_value: 60,
      A12_value: null,
      H05_value: null,
      B08_value: null,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).not.toBe('insufficient_data');
    expect(result.components._meta.missing_components).toContain('A12');
    expect(result.components._meta.missing_components).toContain('H05');
    expect(result.components._meta.missing_components).toContain('B08_inv');
    expect(result.components._meta.redistributed_weights).toBe(true);
  });

  it('edge 0 — todos 0 o inversas desfavorables → Bajo band', () => {
    const result = computeDmxInv({
      ICO_value: 0,
      MOM_value: 0,
      F09_value: 0,
      A12_value: 0,
      H05_value: 0,
      B08_value: 100, // B08_inv = 0
      universe_period: '2026-04-01',
    });
    expect(result.value).toBe(0);
    expect(result.components.score_band).toBe('Bajo');
  });

  it('edge 100 — todos máximos → Excelente band', () => {
    const result = computeDmxInv({
      ICO_value: 100,
      MOM_value: 100,
      F09_value: 100,
      A12_value: 100,
      H05_value: 100,
      B08_value: 0, // inv = 100
      universe_period: '2026-04-01',
    });
    expect(result.value).toBe(100);
    expect(result.components.score_band).toBe('Excelente');
  });

  it('circuit breaker — Δ>20% triggers flag', () => {
    const result = computeDmxInv({
      ICO_value: 85,
      MOM_value: 80,
      F09_value: 75,
      A12_value: 70,
      H05_value: 75,
      B08_value: 20,
      universe_period: '2026-04-01',
      previous_value: 30,
    });
    expect(result.components._meta.circuit_breaker_triggered).toBe(true);
  });

  it('nested_lookup_fallback flag → confidence capped below high', () => {
    const result = computeDmxInv({
      ICO_value: 80,
      MOM_value: 75,
      F09_value: 70,
      A12_value: 72,
      H05_value: 70,
      B08_value: 25,
      universe_period: '2026-04-01',
      nested_lookup_fallback: true,
    });
    expect(result.confidence).not.toBe('high');
  });

  it('shadow_mode propaga a _meta', () => {
    const result = computeDmxInv({
      ICO_value: 70,
      MOM_value: 65,
      F09_value: 60,
      A12_value: 62,
      H05_value: 65,
      B08_value: 30,
      universe_period: '2026-04-01',
      shadow_mode: true,
    });
    expect(result.components._meta.shadow).toBe(true);
  });
});
