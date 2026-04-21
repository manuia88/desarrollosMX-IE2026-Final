import { describe, expect, it } from 'vitest';
import {
  computeIre,
  DEFAULT_IRE_RISK_WEIGHTS,
  getLabelKey,
  IRE_BASE_KEYS,
  methodology,
  version,
} from '../ire';

const PERIOD = '2026-04-01';

describe('DMX-IRE — Índice Riesgo Estructural', () => {
  it('version + risk weights suman 1 + 5 keys base', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    const sum = Object.values(DEFAULT_IRE_RISK_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(IRE_BASE_KEYS.length).toBe(5);
    expect(methodology.dependencies.length).toBe(5);
  });

  it('fórmula inversa: H03=0, N07=0, F01=100, F06=100, N05=100 → risk_load=0 → IRE=100', () => {
    // Safety/infra/agua al máximo + riesgos directo/ambiental en 0 = sin riesgo.
    const res = computeIre({
      scores: { H03: 0, N07: 0, F01: 100, F06: 100, N05: 100 },
      period_date: PERIOD,
      sample_size: 50,
    });
    expect(res.value).toBe(100);
    expect(res.components.risk_load).toBeCloseTo(0, 1);
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.index.dmx_ire.muy_bajo_riesgo');
  });

  it('fórmula inversa: H03=100, N07=100, F01=0, F06=0, N05=0 → risk_load=100 → IRE=0', () => {
    const res = computeIre({
      scores: { H03: 100, N07: 100, F01: 0, F06: 0, N05: 0 },
      period_date: PERIOD,
      sample_size: 50,
    });
    expect(res.value).toBe(0);
    expect(res.components.risk_load).toBeCloseTo(100, 1);
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.index.dmx_ire.alto_riesgo');
  });

  it('desglose B2B aseguradoras: breakdown con sismico/hidrico/social/uso_suelo/infraestructura', () => {
    const res = computeIre({
      scores: { H03: 60, N07: 40, F01: 70, F06: 80, N05: 65 },
      period_date: PERIOD,
      sample_size: 50,
    });
    expect(res.components.breakdown.sismico).toBe(60); // = H03
    expect(res.components.breakdown.uso_suelo).toBe(40); // = N07
    expect(res.components.breakdown.social).toBe(30); // = 100-F01
    expect(res.components.breakdown.infraestructura).toBe(20); // = 100-F06
    expect(res.components.breakdown.hidrico).toBe(35); // = 100-N05
  });

  it('missing 2 componentes → renormaliza + confidence medium/low', () => {
    const res = computeIre({
      scores: { H03: 50, N07: 40, F01: null, F06: 80, N05: null },
      period_date: PERIOD,
      sample_size: 30,
      data_staleness_days: 20,
    });
    expect(res.confidence === 'medium' || res.confidence === 'low').toBe(true);
    expect(res.components.missing_components).toContain('F01_inv');
    expect(res.components.missing_components).toContain('N05_inv');
    expect(res.components.breakdown.social).toBeNull();
    expect(res.components.breakdown.hidrico).toBeNull();
  });

  it('insufficient_data: solo H03 presente (<50%)', () => {
    const res = computeIre({
      scores: { H03: 70, N07: null, F01: null, F06: null, N05: null },
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
  });

  it('circuit breaker: cambio > 20% vs previous', () => {
    const res = computeIre({
      scores: { H03: 10, N07: 10, F01: 90, F06: 90, N05: 90 },
      period_date: PERIOD,
      previous_value: 40,
      sample_size: 50,
    });
    // value ~ 90 vs previous 40 → delta 125% > 20%
    expect(res.components._meta.circuit_breaker_triggered).toBe(true);
  });

  it('labels: thresholds', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.index.dmx_ire.muy_bajo_riesgo');
    expect(getLabelKey(65, 'high')).toBe('ie.index.dmx_ire.bajo_riesgo');
    expect(getLabelKey(45, 'medium')).toBe('ie.index.dmx_ire.riesgo_moderado');
    expect(getLabelKey(20, 'low')).toBe('ie.index.dmx_ire.alto_riesgo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.dmx_ire.insufficient');
  });

  it('explainability: H03 entry con inverted=false, F01 entry con inverted=true', () => {
    const res = computeIre({
      scores: { H03: 40, N07: 30, F01: 70, F06: 80, N05: 75 },
      period_date: PERIOD,
      sample_size: 50,
    });
    expect(res.components.H03?.inverted).toBe(false);
    expect(res.components.F01?.inverted).toBe(true);
    expect(res.components.H03?.citation_source).toBe('zone_scores:H03');
    expect(res.components.F01?.citation_source).toBe('zone_scores:F01');
  });

  it('confidence_breakdown max total 100 y suma = subcomponents', () => {
    const res = computeIre({
      scores: { H03: 50, N07: 50, F01: 50, F06: 50, N05: 50 },
      period_date: PERIOD,
      sample_size: 50,
      data_staleness_days: 0,
    });
    const b = res.components._meta.confidence_breakdown;
    expect(b.total).toBe(
      b.data_freshness + b.data_completeness + b.sample_size + b.methodology_maturity,
    );
    expect(b.total).toBeLessThanOrEqual(100);
  });
});
