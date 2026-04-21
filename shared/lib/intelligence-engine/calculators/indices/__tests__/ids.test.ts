import { describe, expect, it } from 'vitest';
import {
  computeIds,
  DEFAULT_IDS_WEIGHTS,
  getLabelKey,
  IDS_COMPONENT_KEYS,
  methodology,
  version,
} from '../ids';

const PERIOD = '2026-04-01';

describe('DMX-IDS — Desarrollo Social Integrado', () => {
  it('version + weights suman ≈ 1 + 7 componentes', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    const sum = Object.values(DEFAULT_IDS_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(IDS_COMPONENT_KEYS.length).toBe(7);
    expect(methodology.dependencies.length).toBe(7);
  });

  it('happy path: todos componentes en 85+ → value alto + high confidence', () => {
    const res = computeIds({
      scores: { F08: 90, H01: 85, H02: 85, N01: 88, N02: 87, F01: 90, F02: 85 },
      period_date: PERIOD,
      sample_size: 50,
      data_staleness_days: 0,
    });
    expect(res.value).toBeGreaterThanOrEqual(85);
    expect(res.confidence).toBe('high');
    expect(res.components.coverage_pct).toBe(100);
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.index.dmx_ids.excelente');
  });

  it('missing data: 2 componentes missing → renormalizado + coverage 71%', () => {
    const res = computeIds({
      scores: { F08: 70, H01: 75, H02: null, N01: 70, N02: 72, F01: null, F02: 70 },
      period_date: PERIOD,
      sample_size: 30,
      data_staleness_days: 15,
    });
    expect(res.confidence).not.toBe('insufficient_data');
    expect(res.components.missing_components).toContain('H02');
    expect(res.components.missing_components).toContain('F01');
    const wsum = Object.values(res.components.weights_used).reduce((s, v) => s + v, 0);
    expect(wsum).toBeCloseTo(1, 3);
    expect(res.components.coverage_pct).toBe(71); // 5/7 ≈ 71%
  });

  it('staleness alto + sample bajo → confidence medium/low', () => {
    const res = computeIds({
      scores: { F08: 70, H01: 75, H02: null, N01: 70, N02: 72, F01: null, F02: 70 },
      period_date: PERIOD,
      sample_size: 5,
      data_staleness_days: 80,
    });
    expect(res.confidence === 'medium' || res.confidence === 'low').toBe(true);
  });

  it('insufficient_data: <50% componentes → value=0', () => {
    const res = computeIds({
      scores: { F08: 70, H01: 75, H02: null, N01: null, N02: null, F01: null, F02: null },
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
  });

  it('edge: todos=0 → value=0, todos=100 → value=100', () => {
    const zeros = computeIds({
      scores: { F08: 0, H01: 0, H02: 0, N01: 0, N02: 0, F01: 0, F02: 0 },
      period_date: PERIOD,
      sample_size: 50,
    });
    expect(zeros.value).toBe(0);
    const hundreds = computeIds({
      scores: { F08: 100, H01: 100, H02: 100, N01: 100, N02: 100, F01: 100, F02: 100 },
      period_date: PERIOD,
      sample_size: 50,
    });
    expect(hundreds.value).toBe(100);
  });

  it('circuit breaker: delta > 20% vs previous → flag', () => {
    const res = computeIds({
      scores: { F08: 90, H01: 90, H02: 90, N01: 90, N02: 90, F01: 90, F02: 90 },
      period_date: PERIOD,
      previous_value: 40,
      sample_size: 50,
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(true);
  });

  it('trend-ready: previous_value propaga en _meta', () => {
    const res = computeIds({
      scores: { F08: 70, H01: 70, H02: 70, N01: 70, N02: 70, F01: 70, F02: 70 },
      period_date: PERIOD,
      previous_value: 65,
      sample_size: 50,
    });
    expect(res.components._meta.previous_value).toBe(65);
  });

  it('labels por threshold', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.index.dmx_ids.excelente');
    expect(getLabelKey(75, 'high')).toBe('ie.index.dmx_ids.bueno');
    expect(getLabelKey(60, 'medium')).toBe('ie.index.dmx_ids.regular');
    expect(getLabelKey(35, 'low')).toBe('ie.index.dmx_ids.pobre');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.dmx_ids.insufficient');
  });

  it('explainability: cada componente con {value, weight, citation_source, citation_period}', () => {
    const res = computeIds({
      scores: { F08: 80, H01: 80, H02: 80, N01: 80, N02: 80, F01: 80, F02: 80 },
      period_date: PERIOD,
      sample_size: 50,
    });
    expect(res.components.F08).toMatchObject({
      value: 80,
      citation_source: 'zone_scores:F08',
      citation_period: PERIOD,
    });
    expect(res.components.H01?.weight).toBeGreaterThan(0);
  });
});
