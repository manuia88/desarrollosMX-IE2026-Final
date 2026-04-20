import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeH02Health, getLabelKey, methodology, version } from '../h02-health-access';

describe('H02 Health Access calculator', () => {
  it('declara methodology DGIS/CLUES', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('dgis_clues');
    expect(methodology.weights.distancia).toBe(40);
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.h02.excelente');
    expect(getLabelKey(65, 'high')).toBe('ie.score.h02.buena');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.h02.moderada');
    expect(getLabelKey(20, 'medium')).toBe('ie.score.h02.limitada');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.h02.insufficient');
  });

  it('16 zonas CDMX — snapshot + confidence matches DGIS cascade', () => {
    const snapshot: Record<string, { value: number; confidence: string; label: string }> = {};
    for (const zone of CDMX_ZONES) {
      const res = computeH02Health(zone.sources.dgis);
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      const n = zone.sources.dgis.total_2km;
      const expectedConfidence = n >= 3 ? 'high' : n >= 1 ? 'medium' : 'insufficient_data';
      expect(res.confidence, `${zone.zona_name} dgis=${n}`).toBe(expectedConfidence);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('extremos: Polanco (hospital cerca + 3 urgencias 24h) > 85, Milpa Alta (hospital 12km) < 30', () => {
    const byName = (n: string) => CDMX_ZONES.find((z) => z.zona_name === n);
    const pol = byName('Polanco');
    const ma = byName('Milpa Alta Centro');
    if (!pol || !ma) throw new Error('fixtures');
    const polRes = computeH02Health(pol.sources.dgis);
    const maRes = computeH02Health(ma.sources.dgis);
    expect(polRes.value).toBeGreaterThan(85);
    expect(maRes.value).toBeLessThan(30);
  });
});
