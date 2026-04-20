import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeH01School, getLabelKey, methodology, version } from '../h01-school-quality';

describe('H01 School Quality calculator', () => {
  it('declara methodology SIGED', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('siged');
    expect(methodology.weights.densidad).toBe(40);
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.h01.excelente');
    expect(getLabelKey(65, 'high')).toBe('ie.score.h01.buena');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.h01.moderada');
    expect(getLabelKey(20, 'medium')).toBe('ie.score.h01.limitada');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.h01.insufficient');
  });

  it('16 zonas CDMX — snapshot + confidence matches SIGED cascade', () => {
    const snapshot: Record<string, { value: number; confidence: string; label: string }> = {};
    for (const zone of CDMX_ZONES) {
      const res = computeH01School(zone.sources.siged);
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      const n = zone.sources.siged.total_1km;
      const expectedConfidence = n >= 5 ? 'high' : n >= 1 ? 'medium' : 'insufficient_data';
      expect(res.confidence, `${zone.zona_name} siged=${n}`).toBe(expectedConfidence);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('Del Valle (≥8 escuelas privadas top 20) ≥ 85', () => {
    const byName = (n: string) => {
      const f = CDMX_ZONES.find((z) => z.zona_name === n);
      if (!f) throw new Error(`${n} no encontrada`);
      return f;
    };
    const dv = computeH01School(byName('Del Valle').sources.siged);
    expect(dv.value).toBeGreaterThanOrEqual(85);
  });

  it('extremos: Polanco (privadas+top20) > 85, Iztapalapa (0 top20, enlace bajo) < 40', () => {
    const byName = (n: string) => CDMX_ZONES.find((z) => z.zona_name === n);
    const pol = byName('Polanco');
    const izt = byName('Iztapalapa Sur');
    if (!pol || !izt) throw new Error('fixtures');
    const polRes = computeH01School(pol.sources.siged);
    const iztRes = computeH01School(izt.sources.siged);
    expect(polRes.value).toBeGreaterThan(85);
    expect(iztRes.value).toBeLessThan(40);
  });
});
