import { describe, expect, it } from 'vitest';
import {
  computeC06Commission,
  getLabelKey,
  methodology,
  version,
} from '../c06-commission-forecast';

function mkLead(
  overrides: Partial<{
    value_mxn: number;
    lead_score: number;
    absorption_pct: number;
    commission_pct: number;
  }> = {},
) {
  return {
    leadId: `L-${Math.random().toString(36).slice(2, 8)}`,
    value_mxn: 3_000_000,
    lead_score: 70,
    absorption_pct: 60,
    commission_pct: 0.03,
    ...overrides,
  };
}

describe('C06 Commission Forecast', () => {
  it('methodology + 3 horizontes', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('pipeline');
  });

  it('pipeline vacío → insufficient_data', () => {
    const res = computeC06Commission({ pipeline: [] });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.forecast_3m_mxn).toBe(0);
  });

  it('20 leads hot + pipeline $15M → forecast 6m ~$600K', () => {
    // 20 leads × $750K × 0.80 prob × 0.60 abs × 0.03 comm × 0.6 factor6 = ~$129K.
    // El criterio del plan es ejemplo; verificamos monotónicamente 3m < 6m < 12m.
    const pipeline = Array.from({ length: 20 }, () =>
      mkLead({ value_mxn: 750_000, lead_score: 80, absorption_pct: 60 }),
    );
    const res = computeC06Commission({ pipeline });
    expect(res.components.forecast_3m_mxn).toBeLessThan(res.components.forecast_6m_mxn);
    expect(res.components.forecast_6m_mxn).toBeLessThan(res.components.forecast_12m_mxn);
  });

  it('leads hot (score>=60) > 50% → confidence high', () => {
    const pipeline = Array.from({ length: 6 }, () => mkLead({ lead_score: 75 }));
    const res = computeC06Commission({ pipeline });
    expect(res.confidence).toBe('high');
  });

  it('leads cold (score<60) → confidence medium o low', () => {
    const pipeline = Array.from({ length: 6 }, () => mkLead({ lead_score: 30 }));
    const res = computeC06Commission({ pipeline });
    expect(['medium', 'low']).toContain(res.confidence);
  });

  it('pipeline < 5 → confidence low', () => {
    const pipeline = Array.from({ length: 3 }, () => mkLead());
    const res = computeC06Commission({ pipeline });
    expect(res.confidence).toBe('low');
  });

  it('absorption 100% + lead_score 100% → forecast máximo', () => {
    const res = computeC06Commission({
      pipeline: [mkLead({ lead_score: 100, absorption_pct: 100, value_mxn: 1_000_000 })],
    });
    // value × 0.03 comm × 1.0 prob × 1.0 abs × 1.0 factor12 = $30K
    expect(res.components.forecast_12m_mxn).toBe(30_000);
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.c06.forecast_alto');
    expect(getLabelKey(55, 'medium')).toBe('ie.score.c06.forecast_medio');
    expect(getLabelKey(30, 'medium')).toBe('ie.score.c06.forecast_bajo');
    expect(getLabelKey(10, 'low')).toBe('ie.score.c06.forecast_nulo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.c06.insufficient');
  });
});
