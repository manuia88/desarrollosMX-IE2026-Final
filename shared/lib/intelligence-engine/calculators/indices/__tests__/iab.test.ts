import { describe, expect, it } from 'vitest';
import { computeIab, getLabelKey, methodology, version } from '../iab';

const PERIOD = '2026-04-01';

describe('DMX-IAB — Índice Absorción Benchmark', () => {
  it('version + methodology con cdmx thresholds', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.confidence_thresholds.min_cdmx_projects).toBe(50);
    expect(methodology.confidence_thresholds.high_cdmx_projects).toBe(200);
  });

  it('insufficient_data: <50 proyectos CDMX', () => {
    const res = computeIab({
      zone_avg: 65,
      cdmx_avg: 50,
      n_projects_zone: 10,
      n_projects_cdmx: 30, // <50
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.dmx_iab.insufficient');
  });

  it('happy path: zona con absorción = CDMX → IAB = 50 paridad', () => {
    const res = computeIab({
      zone_avg: 60,
      cdmx_avg: 60,
      n_projects_zone: 15,
      n_projects_cdmx: 100,
      period_date: PERIOD,
    });
    expect(res.value).toBe(50);
    expect(res.components.ratio).toBeCloseTo(1, 3);
    expect(res.confidence === 'medium' || res.confidence === 'high').toBe(true);
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.index.dmx_iab.paridad');
  });

  it('muy alta: zona absorbe 2x CDMX → IAB = 100 (clamped)', () => {
    const res = computeIab({
      zone_avg: 80,
      cdmx_avg: 40,
      n_projects_zone: 20,
      n_projects_cdmx: 250,
      period_date: PERIOD,
    });
    expect(res.value).toBe(100);
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.index.dmx_iab.muy_alta');
  });

  it('baja: zona absorbe 0.3x CDMX → IAB ~15', () => {
    const res = computeIab({
      zone_avg: 15,
      cdmx_avg: 50,
      n_projects_zone: 10,
      n_projects_cdmx: 100,
      period_date: PERIOD,
    });
    expect(res.value).toBeLessThan(40);
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.index.dmx_iab.baja');
  });

  it('zona vacía (zone_avg null) → fallback paridad con confidence low', () => {
    const res = computeIab({
      zone_avg: null,
      cdmx_avg: 55,
      n_projects_zone: 0,
      n_projects_cdmx: 150,
      period_date: PERIOD,
    });
    expect(res.value).toBe(50);
    expect(res.confidence).toBe('low');
    expect(res.components.B08_zona_avg).toBeNull();
    expect(res.components.B08_cdmx_avg).not.toBeNull();
  });

  it('edge: cdmx_avg=0 → insufficient (evita div por 0)', () => {
    const res = computeIab({
      zone_avg: 40,
      cdmx_avg: 0,
      n_projects_zone: 10,
      n_projects_cdmx: 100,
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('circuit breaker: cambio > 20% vs previous → flag', () => {
    const res = computeIab({
      zone_avg: 100,
      cdmx_avg: 50,
      n_projects_zone: 20,
      n_projects_cdmx: 200,
      period_date: PERIOD,
      previous_value: 30,
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(true);
  });

  it('explainability: B08_cdmx_avg incluye sample_count + citation', () => {
    const res = computeIab({
      zone_avg: 60,
      cdmx_avg: 55,
      n_projects_zone: 12,
      n_projects_cdmx: 120,
      period_date: PERIOD,
    });
    expect(res.components.B08_cdmx_avg?.sample_count).toBe(120);
    expect(res.components.B08_cdmx_avg?.citation_source).toBe('project_scores:B08:cdmx');
    expect(res.components.B08_cdmx_avg?.citation_period).toBe(PERIOD);
  });

  it('confidence_breakdown escala sample_size con n_projects_cdmx', () => {
    const lowN = computeIab({
      zone_avg: 50,
      cdmx_avg: 50,
      n_projects_zone: 10,
      n_projects_cdmx: 60,
      period_date: PERIOD,
    });
    const highN = computeIab({
      zone_avg: 50,
      cdmx_avg: 50,
      n_projects_zone: 10,
      n_projects_cdmx: 250,
      period_date: PERIOD,
    });
    expect(highN.components._meta.confidence_breakdown.sample_size).toBeGreaterThan(
      lowN.components._meta.confidence_breakdown.sample_size,
    );
  });
});
