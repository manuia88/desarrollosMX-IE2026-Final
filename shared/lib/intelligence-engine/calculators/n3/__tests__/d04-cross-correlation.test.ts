import { describe, expect, it } from 'vitest';
import {
  computeD04Correlation,
  computePearson,
  getLabelKey,
  methodology,
  version,
} from '../d04-cross-correlation';

describe('D04 Cross Correlation', () => {
  it('methodology + min pairs threshold', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.min_pairs_for_confidence).toBe(30);
  });

  it('computePearson correlación perfecta positiva = 1', () => {
    const r = computePearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(r).toBe(1);
  });

  it('computePearson correlación perfecta negativa = -1', () => {
    const r = computePearson([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]);
    expect(r).toBe(-1);
  });

  it('computePearson sin relación ≈ 0', () => {
    const r = computePearson([1, 2, 3, 4, 5], [3, 3, 3, 3, 3]);
    // stddev y=0 → devolvemos 0
    expect(r).toBe(0);
  });

  it('Criterio done: F01 vs precio_m2 correlación >=0.4 detectada', () => {
    const obs: Record<string, Record<string, number>> = {};
    // 5 zonas con correlación fuerte F01 ↔ precio
    for (let i = 0; i < 5; i++) {
      obs[`z${i}`] = { F01: 50 + i * 10, precio: 3000 + i * 500 };
    }
    const res = computeD04Correlation({
      score_ids: ['F01', 'precio'],
      observations: obs,
    });
    const pair = res.components.pairs.find((p) => p.score_a === 'F01' && p.score_b === 'precio');
    expect(pair).toBeDefined();
    expect(pair?.abs_r).toBeGreaterThanOrEqual(0.9);
    expect(pair?.direction).toBe('positive');
  });

  it('matriz simetrica: matrix[a][b] = matrix[b][a]', () => {
    const obs: Record<string, Record<string, number>> = {};
    for (let i = 0; i < 5; i++) {
      obs[`z${i}`] = { A: i, B: i * 2, C: 10 - i };
    }
    const res = computeD04Correlation({
      score_ids: ['A', 'B', 'C'],
      observations: obs,
    });
    expect(res.components.matrix.A?.B).toBe(res.components.matrix.B?.A);
    expect(res.components.matrix.A?.A).toBe(1);
  });

  it('<3 zonas → insufficient_data', () => {
    const res = computeD04Correlation({
      score_ids: ['A', 'B'],
      observations: { z1: { A: 1, B: 2 } },
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('<2 score_ids → insufficient_data', () => {
    const res = computeD04Correlation({
      score_ids: ['A'],
      observations: { z1: { A: 1 }, z2: { A: 2 }, z3: { A: 3 } },
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(60, 'high')).toBe('ie.score.d04.fuertemente_correlacionado');
    expect(getLabelKey(30, 'medium')).toBe('ie.score.d04.parcialmente_correlacionado');
    expect(getLabelKey(10, 'low')).toBe('ie.score.d04.independiente');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.d04.insufficient');
  });
});
