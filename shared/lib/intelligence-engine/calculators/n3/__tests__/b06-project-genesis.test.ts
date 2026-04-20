import { describe, expect, it } from 'vitest';
import {
  CRITICAL_DEPS,
  computeB06Genesis,
  getLabelKey,
  methodology,
  version,
  WEIGHTS,
} from '../b06-project-genesis';

describe('B06 Project Genesis', () => {
  it('methodology + CRITICAL_DEPS B01+D03', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(
      WEIGHTS.value +
        WEIGHTS.gentrification +
        WEIGHTS.demand +
        WEIGHTS.pmf +
        WEIGHTS.supply_pressure +
        WEIGHTS.oportunidad,
    ).toBeCloseTo(1, 5);
    expect(CRITICAL_DEPS).toContain('B01');
    expect(CRITICAL_DEPS).toContain('D03');
    expect(methodology.dependencies).toHaveLength(6);
  });

  it('happy path: demanda alta + oferta baja → alta_viabilidad', () => {
    const res = computeB06Genesis({
      value: 75,
      gentrification: 65,
      demand: 85,
      pmf: 80,
      supply_pressure: 20,
      oportunidad: 75,
    });
    expect(res.value).toBeGreaterThanOrEqual(70);
    expect(res.components.bucket).toBe('alta_viabilidad');
  });

  it('Criterio done: zona saturada + demanda baja → no_viable (<40)', () => {
    const res = computeB06Genesis({
      value: 40,
      gentrification: 30,
      demand: 25,
      pmf: 35,
      supply_pressure: 85, // saturado
      oportunidad: 30,
    });
    expect(res.value).toBeLessThan(40);
    expect(['marginal', 'no_viable']).toContain(res.components.bucket);
  });

  it('B01 missing → insufficient_data', () => {
    const res = computeB06Genesis({
      value: 70,
      gentrification: 60,
      demand: null,
      pmf: 65,
      supply_pressure: 40,
      oportunidad: 70,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('B01');
  });

  it('D03 missing → insufficient_data', () => {
    const res = computeB06Genesis({
      value: 70,
      gentrification: 60,
      demand: 70,
      pmf: 65,
      supply_pressure: null,
      oportunidad: 70,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('D03');
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.b06.alta_viabilidad');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.b06.moderada');
    expect(getLabelKey(40, 'medium')).toBe('ie.score.b06.marginal');
    expect(getLabelKey(20, 'low')).toBe('ie.score.b06.no_viable');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.b06.insufficient');
  });
});
