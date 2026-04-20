import { describe, expect, it } from 'vitest';
import {
  CRITICAL_DEPS,
  computeA09Risk,
  getLabelKey,
  methodology,
  version,
  WEIGHTS,
} from '../a09-risk-score-comprador';

describe('A09 Risk Score Comprador', () => {
  it('methodology + 5 deps + CRITICAL H03', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(
      WEIGHTS.sismico + WEIGHTS.crime + WEIGHTS.desastres + WEIGHTS.risk_map + WEIGHTS.ruido,
    ).toBeCloseTo(1, 5);
    expect(methodology.dependencies).toHaveLength(5);
    expect(CRITICAL_DEPS).toContain('H03');
  });

  it('D29 scenarios optimistic/base/pessimistic', () => {
    const res = computeA09Risk({
      sismico: 70,
      crime: 60,
      desastres: 55,
      risk_map: 50,
      ruido: 40,
    });
    expect(Object.keys(res.scenarios)).toEqual(['optimistic', 'base', 'pessimistic']);
    // Pessimistic > base > optimistic (más peso a factores altos)
    expect(res.scenarios.pessimistic?.value).toBeGreaterThanOrEqual(res.scenarios.base?.value ?? 0);
  });

  it('base scenario: riesgo alto sísmico=80 + crime=70 → bucket alto/muy_alto', () => {
    const res = computeA09Risk({
      sismico: 80,
      crime: 70,
      desastres: 60,
      risk_map: 55,
      ruido: 50,
    });
    expect(['alto', 'muy_alto']).toContain(res.components.bucket);
  });

  it('Criterio done: avance 30% + trust medio (simulando scores 55) → risk ~55', () => {
    const res = computeA09Risk({
      sismico: 55,
      crime: 55,
      desastres: 55,
      risk_map: 55,
      ruido: 55,
    });
    expect(res.value).toBe(55);
    expect(res.components.bucket).toBe('alto');
  });

  it('H03 missing → insufficient_data + capped_by H03', () => {
    const res = computeA09Risk({
      sismico: null,
      crime: 50,
      desastres: 50,
      risk_map: 50,
      ruido: 50,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('H03');
  });

  it('D13: H03 low → no puede ser high', () => {
    const res = computeA09Risk({
      sismico: 60,
      crime: 50,
      desastres: 50,
      risk_map: 50,
      ruido: 50,
      deps: [
        { scoreId: 'H03', confidence: 'low' },
        { scoreId: 'N04', confidence: 'high' },
      ],
    });
    expect(res.confidence).not.toBe('high');
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.a09.muy_alto');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.a09.alto');
    expect(getLabelKey(40, 'medium')).toBe('ie.score.a09.moderado');
    expect(getLabelKey(20, 'low')).toBe('ie.score.a09.bajo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.a09.insufficient');
  });
});
