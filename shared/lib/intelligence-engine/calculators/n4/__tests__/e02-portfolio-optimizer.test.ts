import { describe, expect, it } from 'vitest';
import {
  computeE02PortfolioOptimizer,
  DEFAULT_RISK_FREE_RATE,
  getLabelKey,
  MIN_PORTFOLIO_SIZE,
  methodology,
  version,
} from '../e02-portfolio-optimizer';

describe('E02 Portfolio Optimizer', () => {
  it('declara methodology + tier 3 + tenant_scope_required', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.tenant_scope_required).toBe(true);
    expect(methodology.default_risk_free_rate).toBe(DEFAULT_RISK_FREE_RATE);
    expect(methodology.dependencies[0]?.score_id).toBe('E01');
  });

  it('portfolio alto rendimiento + diversificado → score alto y confidence high', () => {
    // avg ≈ 85, stddev pequeño, risk_free 10% → sharpe muy alto.
    const res = computeE02PortfolioOptimizer({
      portfolio_e01_scores: [82, 85, 88, 84, 87, 83, 86, 88],
      portfolio_cost_basis: [10, 10, 10, 10, 10, 10, 10, 10].map((v) => v * 1_000_000),
    });
    expect(res.confidence).toBe('high');
    expect(res.components.portfolio_size).toBe(8);
    expect(res.value).toBeGreaterThan(70);
    expect(res.components.sharpe_ratio).toBeGreaterThan(1);
    expect(res.components.diversification_index).toBeCloseTo(1, 2);
  });

  it('portfolio bajo rendimiento → sharpe negativo clampea a 0', () => {
    const res = computeE02PortfolioOptimizer({
      portfolio_e01_scores: [8, 6, 9, 7, 5], // avg=7 → 0.07 < rf 0.10
    });
    expect(res.value).toBe(0);
    expect(res.components.sharpe_ratio).toBeLessThan(0);
  });

  it('portfolio insuficiente (<3 proyectos) → insufficient_data', () => {
    const res = computeE02PortfolioOptimizer({
      portfolio_e01_scores: [80, 85],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.portfolio_size).toBe(2);
  });

  it('portfolio homogéneo (stddev=0) y avg > rf → sharpe ceiling', () => {
    const res = computeE02PortfolioOptimizer({
      portfolio_e01_scores: [50, 50, 50, 50],
    });
    expect(res.components.stddev).toBe(0);
    expect(res.value).toBe(100); // sharpe clamp a ceiling → 100
  });

  it('risk_free override respeta el input', () => {
    const res = computeE02PortfolioOptimizer({
      portfolio_e01_scores: [60, 65, 70, 75],
      risk_free_rate: 0.05,
    });
    expect(res.components.risk_free_rate).toBe(0.05);
  });

  it('cost_basis asimétrico reduce diversification_index', () => {
    const uniform = computeE02PortfolioOptimizer({
      portfolio_e01_scores: [70, 72, 74, 76],
      portfolio_cost_basis: [10, 10, 10, 10],
    });
    const concentrated = computeE02PortfolioOptimizer({
      portfolio_e01_scores: [70, 72, 74, 76],
      portfolio_cost_basis: [100, 1, 1, 1],
    });
    expect(uniform.components.diversification_index).toBeGreaterThan(
      concentrated.components.diversification_index,
    );
  });

  it('componentes raw_positions y cost_basis persisten para RLS institucional', () => {
    const input = {
      portfolio_e01_scores: [80, 82, 84, 86] as const,
      portfolio_cost_basis: [5_000_000, 6_000_000, 7_000_000, 8_000_000] as const,
    };
    const res = computeE02PortfolioOptimizer(input);
    expect(res.components.raw_positions).toEqual(input.portfolio_e01_scores);
    expect(res.components.cost_basis).toEqual(input.portfolio_cost_basis);
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.e02.excelente');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.e02.bueno');
    expect(getLabelKey(40, 'medium')).toBe('ie.score.e02.regular');
    expect(getLabelKey(10, 'low')).toBe('ie.score.e02.pobre');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.e02.insufficient');
  });

  it('min portfolio threshold exportado y consistente con methodology', () => {
    expect(MIN_PORTFOLIO_SIZE).toBe(3);
    expect(methodology.confidence_thresholds.min_portfolio_size).toBe(3);
  });
});
