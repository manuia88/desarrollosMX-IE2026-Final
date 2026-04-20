import { describe, expect, it } from 'vitest';
import { CDMX_CNBV, CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeH04Credit, getLabelKey, methodology, version } from '../h04-credit-demand';

describe('H04 Credit Demand calculator', () => {
  it('declara methodology CNBV/Infonavit + validity 30d', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('cnbv');
    expect(methodology.validity.value).toBe(30);
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.h04.saludable');
    expect(getLabelKey(65, 'high')).toBe('ie.score.h04.moderada');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.h04.debil');
    expect(getLabelKey(20, 'low')).toBe('ie.score.h04.estancada');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.h04.insufficient');
  });

  it('16 zonas CDMX — snapshot + confidence matches CNBV cascade', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; label: string; ratio: number; trend: string }
    > = {};
    for (const zone of CDMX_ZONES) {
      const data = CDMX_CNBV[zone.zona_name];
      if (!data) throw new Error(`CNBV data missing for ${zone.zona_name}`);
      const res = computeH04Credit(data);
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      const c = data.creditos_hipotecarios_12m;
      const expectedConfidence =
        c >= 100 ? 'high' : c >= 30 ? 'medium' : c >= 5 ? 'low' : 'insufficient_data';
      expect(res.confidence, `${zone.zona_name} creditos=${c}`).toBe(expectedConfidence);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
        ratio: res.components.ratio_pct,
        trend: res.components.trend_direction,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('extremos: Del Valle/Polanco (sweet spot 4-7%) >85, Tepito (0.7%) <30', () => {
    const byName = (n: string) => {
      const d = CDMX_CNBV[n];
      if (!d) throw new Error(`CNBV ${n} missing`);
      return d;
    };
    const dv = computeH04Credit(byName('Del Valle'));
    const pol = computeH04Credit(byName('Polanco'));
    const tep = computeH04Credit(byName('Tepito'));
    expect(dv.value, 'Del Valle').toBeGreaterThan(85);
    expect(pol.value, 'Polanco').toBeGreaterThan(85);
    expect(tep.value, 'Tepito').toBeLessThan(30);
  });

  it('overheating penalizado: ratio 12% → score <70', () => {
    const res = computeH04Credit({
      creditos_hipotecarios_12m: 1200,
      hogares_municipio: 10000,
      creditos_6m_anteriores: 500,
      creditos_6m_actual: 700,
    });
    expect(res.components.ratio_pct).toBeCloseTo(12, 1);
    expect(res.value).toBeLessThan(75);
    expect(res.value).toBeGreaterThan(40);
  });

  it('trend_direction clasificado por ratio 6m', () => {
    const creciendo = computeH04Credit({
      creditos_hipotecarios_12m: 100,
      hogares_municipio: 2000,
      creditos_6m_anteriores: 40,
      creditos_6m_actual: 60,
    });
    expect(creciendo.components.trend_direction).toBe('creciendo');
    const decreciendo = computeH04Credit({
      creditos_hipotecarios_12m: 100,
      hogares_municipio: 2000,
      creditos_6m_anteriores: 60,
      creditos_6m_actual: 40,
    });
    expect(decreciendo.components.trend_direction).toBe('decreciendo');
  });
});
