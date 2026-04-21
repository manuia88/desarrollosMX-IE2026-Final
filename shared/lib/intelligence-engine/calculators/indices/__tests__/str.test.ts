import { describe, expect, it } from 'vitest';
import {
  computeDmxStr,
  DEFAULT_STR_WEIGHTS,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../str';

describe('DMX-STR Airbnb-Ready Index', () => {
  it('declara version, methodology con dependencies críticas AirROI + sensitivity + reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toContain('airroi');
    expect(methodology.sources.length).toBeGreaterThanOrEqual(5);
    const critical = methodology.dependencies.filter((d) => d.critical).map((d) => d.score_id);
    expect(critical).toContain('airroi_occ_norm');
    expect(critical).toContain('airroi_adr_norm');
    const sumW = Object.values(DEFAULT_STR_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 3);
    expect(methodology.validity).toEqual({ unit: 'days', value: 30 });
    expect(methodology.sensitivity_analysis.length).toBeGreaterThan(0);
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('getLabelKey cubre 4 buckets + insufficient', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.index.str.excelente');
    expect(getLabelKey(65, 'medium')).toBe('ie.index.str.bueno');
    expect(getLabelKey(45, 'medium')).toBe('ie.index.str.regular');
    expect(getLabelKey(20, 'low')).toBe('ie.index.str.bajo');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.index.str.insufficient');
  });

  it('happy path — Roma Norte: OCC alta + ADR alto + N09 + F01 buenos → bucket excelente', () => {
    const result = computeDmxStr({
      airroi_occupancy_rate: 85,
      airroi_adr: 3500,
      airroi_occupancy_cdmx_max: 100,
      airroi_adr_cdmx_max: 4000,
      n09_value: 85,
      f01_value: 70,
      str_permits_pct: 20,
      str_saturation_pct: 40,
      universe_period: '2026-04-01',
    });
    expect(result.value).toBeGreaterThanOrEqual(60);
    expect(['bueno', 'excelente']).toContain(result.components.bucket);
    expect(result.confidence).not.toBe('insufficient_data');
    expect(result.components.airroi_occ_norm).not.toBeNull();
    expect(result.components.airroi_adr_norm).not.toBeNull();
    expect(result.components.coverage_pct).toBe(100);
  });

  it('missing data con fallback — N09 null pero AirROI presentes', () => {
    const result = computeDmxStr({
      airroi_occupancy_rate: 70,
      airroi_adr: 2800,
      n09_value: null,
      f01_value: 65,
      str_permits_pct: 30,
      str_saturation_pct: 50,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).not.toBe('insufficient_data');
    expect(result.components.coverage_pct).toBeLessThan(100);
    expect(result.components.N09).toBeNull();
    expect(result.components._meta.missing_components).toContain('N09');
  });

  it('insufficient_data — ambos AirROI null → insufficient', () => {
    const result = computeDmxStr({
      airroi_occupancy_rate: null,
      airroi_adr: null,
      n09_value: 80,
      f01_value: 70,
      str_permits_pct: 20,
      str_saturation_pct: 40,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.value).toBe(0);
    expect(result.components._meta.fallback_reason).toBe('airroi_data_missing');
  });

  it('edge 0 — todos componentes 0 → value cerca 0', () => {
    const result = computeDmxStr({
      airroi_occupancy_rate: 0,
      airroi_adr: 0,
      n09_value: 0,
      f01_value: 0,
      str_permits_pct: 100,
      str_saturation_pct: 100,
      universe_period: '2026-04-01',
    });
    expect(result.value).toBe(0);
    expect(result.components.bucket).toBe('bajo');
  });

  it('edge 100 — máximos todos → value cerca 100', () => {
    const result = computeDmxStr({
      airroi_occupancy_rate: 100,
      airroi_adr: 5000,
      n09_value: 100,
      f01_value: 100,
      str_permits_pct: 0,
      str_saturation_pct: 0,
      universe_period: '2026-04-01',
    });
    expect(result.value).toBeGreaterThanOrEqual(95);
    expect(result.components.bucket).toBe('excelente');
  });

  it('circuit breaker — Δ>20% vs previous triggers flag', () => {
    const result = computeDmxStr({
      airroi_occupancy_rate: 90,
      airroi_adr: 3800,
      n09_value: 85,
      f01_value: 75,
      str_permits_pct: 20,
      str_saturation_pct: 40,
      universe_period: '2026-04-01',
      previous_value: 30,
    });
    expect(result.components._meta.circuit_breaker_triggered).toBe(true);
    expect(result.trend_vs_previous).not.toBeNull();
  });

  it('shadow_mode propaga a _meta', () => {
    const result = computeDmxStr({
      airroi_occupancy_rate: 70,
      airroi_adr: 2500,
      n09_value: 65,
      f01_value: 60,
      str_permits_pct: 30,
      str_saturation_pct: 50,
      universe_period: '2026-04-01',
      shadow_mode: true,
    });
    expect(result.components._meta.shadow).toBe(true);
  });

  it('coverage ≥85% + no missing → confidence high potencial (medium si proxy tables no disponibles)', () => {
    const result = computeDmxStr({
      airroi_occupancy_rate: 75,
      airroi_adr: 3000,
      n09_value: 70,
      f01_value: 68,
      str_permits_pct: 25,
      str_saturation_pct: 45,
      universe_period: '2026-04-01',
    });
    expect(['medium', 'high']).toContain(result.confidence);
  });
});
