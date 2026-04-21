import { describe, expect, it } from 'vitest';
import {
  CRITICAL_DEPS,
  computeA07Timing,
  getLabelKey,
  methodology,
  version,
  WEIGHTS,
} from '../a07-timing-optimizer';

describe('A07 Timing Optimizer', () => {
  it('declara methodology + sensitivity + deps + CRITICAL_DEPS', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toMatch(/market_cycle/);
    expect(methodology.sources).toContain('zone_scores:B05');
    expect(methodology.sources).toContain('zone_scores:N11');
    expect(
      WEIGHTS.market_cycle + WEIGHTS.affordability + WEIGHTS.rate_forecast + WEIGHTS.momentum,
    ).toBeCloseTo(1, 5);
    expect(methodology.sensitivity_analysis).toHaveLength(3);
    expect(methodology.dependencies.find((d) => d.score_id === 'B05')?.critical).toBe(true);
    expect(CRITICAL_DEPS).toContain('B05');
  });

  it('D29 scenarios nativos: genera buy_now/wait_3m/wait_6m/wait_12m', () => {
    const res = computeA07Timing({
      market_cycle: 70,
      affordability_trend: 60,
      rate_forecast_signal: 55,
      momentum: 75,
    });
    expect(Object.keys(res.scenarios)).toEqual(['buy_now', 'wait_3m', 'wait_6m', 'wait_12m']);
    expect(res.scenarios.buy_now?.value).toBeGreaterThan(0);
    expect(res.scenarios.wait_12m?.rationale).toMatch(/12m/);
  });

  it('recommendation selecciona escenario con mayor valor', () => {
    const res = computeA07Timing({
      market_cycle: 80,
      affordability_trend: 30,
      rate_forecast_signal: 30,
      momentum: 80,
    });
    expect(['buy_now', 'wait_3m', 'wait_6m', 'wait_12m']).toContain(res.components.recommendation);
    const recValue = res.scenarios[res.components.recommendation]?.value;
    expect(recValue).toBe(res.components.confidence_pct);
  });

  it('contraccion + tasas bajando → recomienda wait_6m o wait_12m', () => {
    const res = computeA07Timing({
      market_cycle: 30, // contraccion
      affordability_trend: 70, // mejorando
      rate_forecast_signal: 75, // tasa bajando
      momentum: 25,
    });
    expect(['wait_3m', 'wait_6m', 'wait_12m']).toContain(res.components.recommendation);
  });

  it('critical B05 missing → insufficient_data', () => {
    const res = computeA07Timing({
      market_cycle: null,
      affordability_trend: 60,
      rate_forecast_signal: 55,
      momentum: 70,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('B05');
    expect(res.components.cap_reason).toBe('critical_dependency_missing');
    expect(res.scenarios).toEqual({});
  });

  it('coverage <50% → insufficient_data', () => {
    const res = computeA07Timing({
      market_cycle: 60,
      affordability_trend: null,
      rate_forecast_signal: null,
      momentum: null,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.coverage_pct).toBe(25);
  });

  it('D13: B05 low → no puede ser high', () => {
    const res = computeA07Timing({
      market_cycle: 60,
      affordability_trend: 60,
      rate_forecast_signal: 60,
      momentum: 60,
      deps: [
        { scoreId: 'B05', confidence: 'low' },
        { scoreId: 'A02', confidence: 'high' },
        { scoreId: 'N11', confidence: 'high' },
      ],
    });
    expect(res.confidence).not.toBe('high');
  });

  it('getLabelKey mapea recommendations', () => {
    expect(getLabelKey('buy_now', 'high')).toBe('ie.score.a07.buy_now');
    expect(getLabelKey('wait_3m', 'medium')).toBe('ie.score.a07.wait_3m');
    expect(getLabelKey('wait_6m', 'low')).toBe('ie.score.a07.wait_6m');
    expect(getLabelKey('wait_12m', 'high')).toBe('ie.score.a07.wait_12m');
    expect(getLabelKey('buy_now', 'insufficient_data')).toBe('ie.score.a07.insufficient');
  });
});
