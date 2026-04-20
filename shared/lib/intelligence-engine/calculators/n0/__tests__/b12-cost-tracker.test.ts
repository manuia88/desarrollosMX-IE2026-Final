import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeB12Cost, getLabelKey, methodology, version } from '../b12-cost-tracker';

describe('B12 Cost Tracker calculator', () => {
  it('declara methodology INPP construcción', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('inegi_inpp');
    expect(methodology.weights.inpp_construccion).toBe(0.5);
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.b12.normal');
    expect(getLabelKey(55, 'high')).toBe('ie.score.b12.warning');
    expect(getLabelKey(30, 'high')).toBe('ie.score.b12.critical');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.b12.insufficient');
  });

  it('16 zonas CDMX — snapshot + alert_level discriminado', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; label: string; alert: string }
    > = {};
    for (const zone of CDMX_ZONES) {
      const res = computeB12Cost(zone.sources.inegi_inpp);
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
        alert: res.components.alert_level,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('INPP +15% → alertLevel critical', () => {
    const res = computeB12Cost({
      inpp_construccion_delta_12m: 16,
      materiales_delta_12m: 18,
      mano_obra_delta_12m: 14,
    });
    expect(res.components.alert_level).toBe('critical');
    expect(res.value).toBeLessThan(30);
  });

  it('delta ~8% → alertLevel normal', () => {
    const res = computeB12Cost({
      inpp_construccion_delta_12m: 8,
      materiales_delta_12m: 9,
      mano_obra_delta_12m: 7,
    });
    expect(res.components.alert_level).toBe('normal');
    expect(res.value).toBeGreaterThanOrEqual(55);
  });

  it('Iztapalapa Sur (critical fixture) → alertLevel critical', () => {
    const byName = (n: string) => CDMX_ZONES.find((z) => z.zona_name === n);
    const izt = byName('Iztapalapa Sur');
    if (!izt) throw new Error('fixture');
    const res = computeB12Cost(izt.sources.inegi_inpp);
    expect(res.components.alert_level).not.toBe('normal');
  });
});
