import { describe, expect, it } from 'vitest';
import {
  computeIpv,
  DEFAULT_IPV_WEIGHTS,
  getLabelKey,
  IPV_COMPONENT_KEYS,
  methodology,
  version,
} from '../ipv';

const PERIOD = '2026-04-01';

describe('DMX-IPV — Índice Precio-Valor', () => {
  it('version + weights sum ≈ 1 + methodology dependencies correctos', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    const sum = Object.values(DEFAULT_IPV_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(methodology.dependencies.length).toBe(5);
    expect(IPV_COMPONENT_KEYS.length).toBe(5);
  });

  it('happy path: todos componentes altos → value ≥ 85 + confidence high', () => {
    const res = computeIpv({
      scores: { F08: 90, F09: 88, N11: 85, A12: 90, N01: 87 },
      period_date: PERIOD,
      sample_size: 50,
      data_staleness_days: 0,
    });
    expect(res.value).toBeGreaterThanOrEqual(85);
    expect(res.confidence).toBe('high');
    expect(res.components.coverage_pct).toBe(100);
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.index.dmx_ipv.excelente');
    expect(res.components.F08?.weight).toBeCloseTo(0.3, 2);
  });

  it('missing data: 2 componentes missing → renormalización aplica + coverage 60%', () => {
    const res = computeIpv({
      scores: { F08: 80, F09: 70, N11: null, A12: null, N01: 75 },
      period_date: PERIOD,
      sample_size: 30,
      data_staleness_days: 15,
    });
    expect(res.confidence).not.toBe('insufficient_data');
    expect(res.components.missing_components).toContain('N11');
    expect(res.components.missing_components).toContain('A12');
    expect(res.components.coverage_pct).toBe(60);
    // Weights renormalizados: suman 1.
    const wsum = Object.values(res.components.weights_used).reduce((s, v) => s + v, 0);
    expect(wsum).toBeCloseTo(1, 3);
  });

  it('missing data + staleness alto + sample bajo → confidence degradado a medium/low', () => {
    const res = computeIpv({
      scores: { F08: 80, F09: 70, N11: null, A12: null, N01: 75 },
      period_date: PERIOD,
      sample_size: 5,
      data_staleness_days: 80,
    });
    expect(res.confidence === 'medium' || res.confidence === 'low').toBe(true);
  });

  it('insufficient_data: <50% componentes presentes', () => {
    const res = computeIpv({
      scores: { F08: 80, F09: null, N11: null, A12: null, N01: null },
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.dmx_ipv.insufficient');
  });

  it('edge: todos=0 → value=0, todos=100 → value=100', () => {
    const zeros = computeIpv({
      scores: { F08: 0, F09: 0, N11: 0, A12: 0, N01: 0 },
      period_date: PERIOD,
      sample_size: 50,
    });
    expect(zeros.value).toBe(0);
    const hundreds = computeIpv({
      scores: { F08: 100, F09: 100, N11: 100, A12: 100, N01: 100 },
      period_date: PERIOD,
      sample_size: 50,
    });
    expect(hundreds.value).toBe(100);
  });

  it('circuit breaker: cambio > 20% vs previous → flag triggered', () => {
    const res = computeIpv({
      scores: { F08: 90, F09: 90, N11: 90, A12: 90, N01: 90 },
      period_date: PERIOD,
      previous_value: 50, // 90 vs 50 = 80% change
      sample_size: 50,
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(true);
    expect(res.components._meta.previous_value).toBe(50);
  });

  it('circuit breaker NO triggered: cambio < 20% vs previous', () => {
    const res = computeIpv({
      scores: { F08: 82, F09: 80, N11: 80, A12: 80, N01: 80 },
      period_date: PERIOD,
      previous_value: 78, // ~3% change
      sample_size: 50,
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(false);
  });

  it('labels: thresholds correctos', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.index.dmx_ipv.excelente');
    expect(getLabelKey(75, 'high')).toBe('ie.index.dmx_ipv.bueno');
    expect(getLabelKey(60, 'medium')).toBe('ie.index.dmx_ipv.regular');
    expect(getLabelKey(40, 'low')).toBe('ie.index.dmx_ipv.pobre');
  });

  it('confidence_breakdown: suma subcomponents = total, max 100', () => {
    const res = computeIpv({
      scores: { F08: 80, F09: 80, N11: 80, A12: 80, N01: 80 },
      period_date: PERIOD,
      sample_size: 50,
      data_staleness_days: 0,
    });
    const b = res.components._meta.confidence_breakdown;
    expect(b.data_freshness).toBeLessThanOrEqual(30);
    expect(b.data_completeness).toBeLessThanOrEqual(30);
    expect(b.sample_size).toBeLessThanOrEqual(20);
    expect(b.methodology_maturity).toBeLessThanOrEqual(20);
    expect(b.total).toBe(
      b.data_freshness + b.data_completeness + b.sample_size + b.methodology_maturity,
    );
    expect(b.total).toBeLessThanOrEqual(100);
  });

  it('explainability: cada component tiene {value, weight, citation_source, citation_period}', () => {
    const res = computeIpv({
      scores: { F08: 80, F09: 80, N11: 80, A12: 80, N01: 80 },
      period_date: PERIOD,
      sample_size: 50,
    });
    expect(res.components.F08).toMatchObject({
      value: 80,
      citation_source: 'zone_scores:F08',
      citation_period: PERIOD,
    });
    expect(res.components.F08?.weight).toBeGreaterThan(0);
  });

  it('staleness bajo freshness y afecta total confidence', () => {
    const fresh = computeIpv({
      scores: { F08: 80, F09: 80, N11: 80, A12: 80, N01: 80 },
      period_date: PERIOD,
      sample_size: 50,
      data_staleness_days: 0,
    });
    const stale = computeIpv({
      scores: { F08: 80, F09: 80, N11: 80, A12: 80, N01: 80 },
      period_date: PERIOD,
      sample_size: 50,
      data_staleness_days: 89,
    });
    expect(fresh.components._meta.confidence_breakdown.data_freshness).toBeGreaterThan(
      stale.components._meta.confidence_breakdown.data_freshness,
    );
  });
});
