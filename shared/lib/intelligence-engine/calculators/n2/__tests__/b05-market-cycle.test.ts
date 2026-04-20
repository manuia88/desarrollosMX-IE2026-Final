import { describe, expect, it } from 'vitest';
import {
  computeB05MarketCycle,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../b05-market-cycle';

describe('B05 Market Cycle calculator', () => {
  it('declara version, methodology (con dependencies critical + sensitivity_analysis), reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toMatch(/expansion/);
    expect(methodology.sources.length).toBeGreaterThanOrEqual(4);
    const depIds = methodology.dependencies.map((d) => d.score_id).sort();
    expect(depIds).toEqual(['A12', 'B01', 'B08', 'N11']);
    const critical = methodology.dependencies.filter((d) => d.critical).map((d) => d.score_id);
    expect(critical.sort()).toEqual(['B01', 'B08', 'N11']);
    expect(methodology.validity).toEqual({ unit: 'days', value: 30 });
    expect(methodology.sensitivity_analysis.most_sensitive_input).toBe('N11_momentum');
    expect(methodology.sensitivity_analysis.impact_notes.length).toBeGreaterThan(0);
    expect(reasoning_template).toContain('{fase}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('fase expansion — momentum>60 + absorcion ascending + precio alto + demanda fuerte', () => {
    const result = computeB05MarketCycle({
      N11_momentum: 75,
      B01_demand: 78,
      B08_absorption_trend: 'ascending',
      A12_price_fairness_avg: 68,
      macro_tiie: 10.5,
      confidences: { N11: 'high', B01: 'high', B08: 'high', A12: 'medium' },
    });
    expect(result.components.fase).toBe('expansion');
    expect(result.value).toBe(80);
    expect(getLabelKey(result.value, result.confidence)).toBe('ie.score.b05.expansion');
  });

  it('fase pico — momentum<40 + absorcion descendente + precio alto', () => {
    const result = computeB05MarketCycle({
      N11_momentum: 35,
      B01_demand: 55,
      B08_absorption_trend: 'descending',
      A12_price_fairness_avg: 75,
      macro_tiie: 11.25,
      confidences: { N11: 'medium', B01: 'medium', B08: 'medium', A12: 'medium' },
    });
    expect(result.components.fase).toBe('pico');
    expect(result.value).toBe(40);
    expect(getLabelKey(result.value, result.confidence)).toBe('ie.score.b05.pico');
  });

  it('fase contraccion — momentum<30 + demanda<40 + precios bajos + absorcion no ascendente', () => {
    const result = computeB05MarketCycle({
      N11_momentum: 22,
      B01_demand: 30,
      B08_absorption_trend: 'descending',
      A12_price_fairness_avg: 38,
      macro_tiie: 12.5,
      confidences: { N11: 'medium', B01: 'medium', B08: 'medium' },
    });
    expect(result.components.fase).toBe('contraccion');
    expect(result.value).toBe(20);
    expect(getLabelKey(result.value, result.confidence)).toBe('ie.score.b05.contraccion');
  });

  it('fase recuperacion — momentum 30-60 + absorcion ascending + precios estabilizados', () => {
    const result = computeB05MarketCycle({
      N11_momentum: 45,
      B01_demand: 55,
      B08_absorption_trend: 'ascending',
      A12_price_fairness_avg: 55,
      macro_tiie: 9.75,
      confidences: { N11: 'high', B01: 'medium', B08: 'high', A12: 'medium' },
    });
    expect(result.components.fase).toBe('recuperacion');
    expect(result.value).toBe(60);
    expect(getLabelKey(result.value, result.confidence)).toBe('ie.score.b05.recuperacion');
  });

  it('critical dep missing (B01 null) → insufficient_data + cap_reason', () => {
    const result = computeB05MarketCycle({
      N11_momentum: 70,
      B01_demand: null,
      B08_absorption_trend: 'ascending',
      A12_price_fairness_avg: 60,
      macro_tiie: 10,
    });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.value).toBe(0);
    expect(result.components.fase).toBe('insufficient');
    expect(result.components.missing_dimensions).toContain('B01');
    expect(result.components.capped_by).toContain('B01');
    expect(result.components.cap_reason).toBe('critical_dependency_missing');
  });

  it('critical dep confidence low → cap confidence ≤ medium', () => {
    const result = computeB05MarketCycle({
      N11_momentum: 70,
      B01_demand: 60,
      B08_absorption_trend: 'ascending',
      A12_price_fairness_avg: 65,
      macro_tiie: 10,
      confidences: { N11: 'high', B01: 'low', B08: 'high', A12: 'high' },
    });
    expect(result.components.fase).toBe('expansion');
    expect(['low', 'medium']).toContain(result.confidence);
    expect(result.confidence).not.toBe('high');
    expect(result.components.capped_by).toContain('B01');
  });

  it('A12 (supporting) faltante no bloquea — usa fallback 50 y degrada coverage', () => {
    const result = computeB05MarketCycle({
      N11_momentum: 68,
      B01_demand: 62,
      B08_absorption_trend: 'ascending',
      A12_price_fairness_avg: null,
      macro_tiie: 10,
      confidences: { N11: 'high', B01: 'high', B08: 'high' },
    });
    expect(result.components.missing_dimensions).toContain('A12');
    expect(result.components.fase).not.toBe('insufficient');
    expect(result.components.coverage_pct).toBe(75);
    // Coverage < high_coverage (100%) → cap a medium.
    expect(result.confidence).toBe('medium');
  });

  it('confidence_pct mapea confidence → pct válido', () => {
    const r1 = computeB05MarketCycle({
      N11_momentum: 70,
      B01_demand: 65,
      B08_absorption_trend: 'ascending',
      A12_price_fairness_avg: 62,
      macro_tiie: 10,
      confidences: { N11: 'high', B01: 'high', B08: 'high', A12: 'high' },
    });
    expect(r1.components.confidence_pct).toBeGreaterThanOrEqual(70);
    expect(r1.components.confidence_pct).toBeLessThanOrEqual(95);
  });

  it('getLabelKey mapea rangos + insufficient', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.b05.expansion');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.b05.recuperacion');
    expect(getLabelKey(40, 'low')).toBe('ie.score.b05.pico');
    expect(getLabelKey(20, 'low')).toBe('ie.score.b05.contraccion');
    expect(getLabelKey(80, 'insufficient_data')).toBe('ie.score.b05.insufficient');
  });

  it('snapshot 4 fases del ciclo', () => {
    const scenarios = {
      expansion: computeB05MarketCycle({
        N11_momentum: 75,
        B01_demand: 78,
        B08_absorption_trend: 'ascending',
        A12_price_fairness_avg: 68,
        macro_tiie: 10.5,
        confidences: { N11: 'high', B01: 'high', B08: 'high', A12: 'medium' },
      }),
      pico: computeB05MarketCycle({
        N11_momentum: 35,
        B01_demand: 55,
        B08_absorption_trend: 'descending',
        A12_price_fairness_avg: 75,
        macro_tiie: 11.25,
        confidences: { N11: 'medium', B01: 'medium', B08: 'medium', A12: 'medium' },
      }),
      contraccion: computeB05MarketCycle({
        N11_momentum: 22,
        B01_demand: 30,
        B08_absorption_trend: 'descending',
        A12_price_fairness_avg: 38,
        macro_tiie: 12.5,
        confidences: { N11: 'medium', B01: 'medium', B08: 'medium', A12: 'low' },
      }),
      recuperacion: computeB05MarketCycle({
        N11_momentum: 45,
        B01_demand: 55,
        B08_absorption_trend: 'ascending',
        A12_price_fairness_avg: 55,
        macro_tiie: 9.75,
        confidences: { N11: 'high', B01: 'medium', B08: 'high', A12: 'medium' },
      }),
    };
    const snapshot = Object.fromEntries(
      Object.entries(scenarios).map(([k, v]) => [
        k,
        {
          value: v.value,
          confidence: v.confidence,
          fase: v.components.fase,
          confidence_pct: v.components.confidence_pct,
          label: getLabelKey(v.value, v.confidence),
        },
      ]),
    );
    expect(snapshot).toMatchSnapshot();
  });
});
