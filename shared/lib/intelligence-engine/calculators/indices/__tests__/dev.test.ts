import { describe, expect, it } from 'vitest';
import {
  computeDmxDev,
  DEFAULT_DEV_WEIGHTS,
  getLabelKey,
  MIN_PROJECTS_FOR_HIGH_CONF,
  methodology,
  reasoning_template,
  version,
} from '../dev';

describe('DMX-DEV Salud Desarrolladora', () => {
  it('declara version, methodology H05 crítico + MIN_PROJECTS + reasoning', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toContain('H05');
    const critical = methodology.dependencies.filter((d) => d.critical).map((d) => d.score_id);
    expect(critical).toContain('H05');
    const sumW = Object.values(DEFAULT_DEV_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 3);
    expect(MIN_PROJECTS_FOR_HIGH_CONF).toBe(3);
    expect(methodology.confidence_thresholds.min_projects_for_high).toBe(3);
    expect(reasoning_template).toContain('{project_count}');
  });

  it('getLabelKey cubre 4 buckets + insufficient', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.index.dev.excelente');
    expect(getLabelKey(70, 'medium')).toBe('ie.index.dev.solida');
    expect(getLabelKey(50, 'medium')).toBe('ie.index.dev.aceptable');
    expect(getLabelKey(30, 'low')).toBe('ie.index.dev.riesgo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.dev.insufficient');
  });

  it('happy path — developer top-tier con 10+ proyectos', () => {
    const result = computeDmxDev({
      H05_value: 88,
      H06_value: 82,
      H07_value: 85,
      H15_value: 90,
      H08_value: 10,
      H09_value: 80,
      project_count: 15,
      universe_period: '2026-04-01',
    });
    expect(result.value).toBeGreaterThanOrEqual(70);
    expect(['solida', 'excelente']).toContain(result.components.bucket);
    expect(result.confidence).toBe('high');
    expect(result.components.coverage_pct).toBe(100);
  });

  it('missing data con fallback — H06/H07 null pero H05 presente', () => {
    const result = computeDmxDev({
      H05_value: 75,
      H06_value: null,
      H07_value: null,
      H15_value: 80,
      H08_value: 15,
      H09_value: 70,
      project_count: 5,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).not.toBe('insufficient_data');
    expect(result.components._meta.missing_components).toContain('H06');
    expect(result.components._meta.missing_components).toContain('H07');
    expect(result.components._meta.redistributed_weights).toBe(true);
  });

  it('insufficient — H05 null (critical) → insufficient_data', () => {
    const result = computeDmxDev({
      H05_value: null,
      H06_value: 80,
      H07_value: 75,
      H15_value: 85,
      H08_value: 10,
      H09_value: 70,
      project_count: 10,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.value).toBe(0);
    expect(result.components._meta.fallback_reason).toBe('h05_critical_missing');
  });

  it('developer con <3 proyectos → confidence low', () => {
    const result = computeDmxDev({
      H05_value: 85,
      H06_value: 80,
      H07_value: 82,
      H15_value: 88,
      H08_value: 5,
      H09_value: 78,
      project_count: 2,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).toBe('low');
    expect(result.components._meta.limitation).toContain('historial_insuficiente');
  });

  it('edge 0 — developer con H08 máximo (muchas demandas) + resto bajo', () => {
    const result = computeDmxDev({
      H05_value: 10,
      H06_value: 15,
      H07_value: 20,
      H15_value: 15,
      H08_value: 90, // H08_inv = 10
      H09_value: 20,
      project_count: 5,
      universe_period: '2026-04-01',
    });
    expect(result.value).toBeLessThan(40);
    expect(result.components.bucket).toBe('riesgo');
  });

  it('edge 100 — developer ideal', () => {
    const result = computeDmxDev({
      H05_value: 100,
      H06_value: 100,
      H07_value: 100,
      H15_value: 100,
      H08_value: 0, // H08_inv = 100
      H09_value: 100,
      project_count: 20,
      universe_period: '2026-04-01',
    });
    expect(result.value).toBe(100);
    expect(result.components.bucket).toBe('excelente');
  });

  it('score band correcto — trust medio + historial ok → solida', () => {
    const result = computeDmxDev({
      H05_value: 72,
      H06_value: 70,
      H07_value: 68,
      H15_value: 75,
      H08_value: 15,
      H09_value: 65,
      project_count: 8,
      universe_period: '2026-04-01',
    });
    expect(result.value).toBeGreaterThanOrEqual(65);
    expect(result.value).toBeLessThan(80);
    expect(result.components.bucket).toBe('solida');
  });

  it('circuit breaker — Δ>20% triggers flag', () => {
    const result = computeDmxDev({
      H05_value: 85,
      H06_value: 80,
      H07_value: 82,
      H15_value: 88,
      H08_value: 10,
      H09_value: 78,
      project_count: 10,
      universe_period: '2026-04-01',
      previous_value: 30,
    });
    expect(result.components._meta.circuit_breaker_triggered).toBe(true);
  });

  it('shadow_mode propaga a _meta', () => {
    const result = computeDmxDev({
      H05_value: 70,
      H06_value: 65,
      H07_value: 68,
      H15_value: 72,
      H08_value: 20,
      H09_value: 60,
      project_count: 5,
      universe_period: '2026-04-01',
      shadow_mode: true,
    });
    expect(result.components._meta.shadow).toBe(true);
  });
});
