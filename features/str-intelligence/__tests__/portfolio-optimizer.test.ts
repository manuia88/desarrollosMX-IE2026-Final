import { describe, expect, it } from 'vitest';
import {
  optimizePortfolio,
  type PortfolioCandidate,
  type PortfolioConstraints,
} from '../lib/portfolio/optimizer';

function candidate(overrides: Partial<PortfolioCandidate> = {}): PortfolioCandidate {
  return {
    listing_id: 'L1',
    platform: 'airbnb',
    zone_id: 'Z1',
    market_id: 'M1',
    price_minor: 1_000_000_00,
    expected_cap_rate: 0.08,
    expected_revenue_annual_minor: 80_000_00,
    risk_score: 0.3,
    ...overrides,
  };
}

const baseConstraints: PortfolioConstraints = {
  budget_total_minor: 10_000_000_00,
  max_listings_per_zone: 3,
  min_cap_rate: 0.05,
  max_risk: 0.6,
};

describe('optimizePortfolio', () => {
  it('selecciona portfolio dentro del budget', () => {
    const candidates = Array.from({ length: 20 }, (_, i) =>
      candidate({
        listing_id: `L${i + 1}`,
        zone_id: `Z${(i % 5) + 1}`,
        price_minor: 1_500_000_00,
        expected_cap_rate: 0.06 + (i % 5) * 0.01,
      }),
    );
    const result = optimizePortfolio(candidates, baseConstraints);
    expect(result.total_invested_minor).toBeLessThanOrEqual(baseConstraints.budget_total_minor);
    expect(result.portfolio.length).toBeGreaterThan(0);
  });

  it('respeta max_listings_per_zone', () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      candidate({
        listing_id: `L${i + 1}`,
        zone_id: 'Z1', // todos misma zona
        price_minor: 500_000_00,
      }),
    );
    const result = optimizePortfolio(candidates, baseConstraints);
    expect(result.portfolio.length).toBeLessThanOrEqual(baseConstraints.max_listings_per_zone);
  });

  it('filtra candidates con cap_rate < min_cap_rate', () => {
    const candidates = [
      candidate({ listing_id: 'A', expected_cap_rate: 0.03 }), // < 0.05
      candidate({ listing_id: 'B', expected_cap_rate: 0.1, zone_id: 'Z2' }),
      candidate({ listing_id: 'C', expected_cap_rate: 0.12, zone_id: 'Z3' }),
    ];
    const result = optimizePortfolio(candidates, baseConstraints);
    const ids = result.portfolio.map((p) => p.listing_id);
    expect(ids).not.toContain('A');
    expect(ids).toContain('B');
    expect(ids).toContain('C');
  });

  it('filtra candidates con risk_score > max_risk', () => {
    const candidates = [
      candidate({ listing_id: 'A', risk_score: 0.8 }), // > 0.6
      candidate({ listing_id: 'B', zone_id: 'Z2', risk_score: 0.4 }),
    ];
    const result = optimizePortfolio(candidates, baseConstraints);
    const ids = result.portfolio.map((p) => p.listing_id);
    expect(ids).not.toContain('A');
    expect(ids).toContain('B');
  });

  it('weighted_cap_rate refleja cap rate ponderado por capital', () => {
    const candidates = [
      candidate({ listing_id: 'A', price_minor: 1_000_000_00, expected_cap_rate: 0.1 }),
      candidate({
        listing_id: 'B',
        zone_id: 'Z2',
        price_minor: 1_000_000_00,
        expected_cap_rate: 0.06,
      }),
    ];
    const result = optimizePortfolio(candidates, {
      ...baseConstraints,
      budget_total_minor: 2_000_000_00,
    });
    expect(result.weighted_cap_rate).toBeCloseTo(0.08, 3);
  });

  it('diversification_score 1.0 cuando todos los listings están en zonas diferentes', () => {
    const candidates = Array.from({ length: 5 }, (_, i) =>
      candidate({
        listing_id: `L${i + 1}`,
        zone_id: `Z${i + 1}`,
        price_minor: 1_000_000_00,
      }),
    );
    const result = optimizePortfolio(candidates, {
      ...baseConstraints,
      budget_total_minor: 10_000_000_00,
      max_listings_per_zone: 1,
    });
    expect(result.diversification_score).toBeCloseTo(1 - 1 / 5, 2);
  });

  it('efficient_frontier_points tiene 10 puntos', () => {
    const candidates = Array.from({ length: 20 }, (_, i) =>
      candidate({
        listing_id: `L${i + 1}`,
        zone_id: `Z${(i % 5) + 1}`,
        risk_score: 0.1 + (i % 6) * 0.1,
      }),
    );
    const result = optimizePortfolio(candidates, baseConstraints);
    expect(result.efficient_frontier_points).toHaveLength(10);
  });

  it('empty candidates → portfolio vacío', () => {
    const result = optimizePortfolio([], baseConstraints);
    expect(result.portfolio).toHaveLength(0);
    expect(result.total_invested_minor).toBe(0);
    expect(result.weighted_cap_rate).toBe(0);
  });
});
