import { describe, expect, it } from 'vitest';
import { CDMX_INAH, CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeH08Heritage, getLabelKey, methodology, version } from '../h08-heritage-zone';

describe('H08 Heritage Zone calculator', () => {
  it('declara methodology INAH', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('inah');
    expect(methodology.weights.centro_historico).toBe(40);
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.h08.patrimonial');
    expect(getLabelKey(50, 'high')).toBe('ie.score.h08.con_heritage');
    expect(getLabelKey(20, 'high')).toBe('ie.score.h08.escaso');
    expect(getLabelKey(5, 'high')).toBe('ie.score.h08.sin_heritage');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.h08.insufficient');
  });

  it('16 zonas CDMX — snapshot', () => {
    const snapshot: Record<string, { value: number; confidence: string; label: string }> = {};
    for (const zone of CDMX_ZONES) {
      const data = CDMX_INAH[zone.zona_name];
      if (!data) throw new Error(`INAH ${zone.zona_name} missing`);
      const res = computeH08Heritage(data);
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      expect(res.confidence, zone.zona_name).toBe('high');
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('Tepito (dentro Centro Histórico) → score ≥ 80', () => {
    const byName = (n: string) => {
      const d = CDMX_INAH[n];
      if (!d) throw new Error(`INAH ${n} missing`);
      return d;
    };
    const tep = computeH08Heritage(byName('Tepito'));
    expect(tep.value).toBeGreaterThanOrEqual(80);
  });

  it('Milpa Alta (sin heritage) → score < 30', () => {
    const byName = (n: string) => {
      const d = CDMX_INAH[n];
      if (!d) throw new Error(`INAH ${n} missing`);
      return d;
    };
    const ma = computeH08Heritage(byName('Milpa Alta Centro'));
    expect(ma.value).toBeLessThan(30);
  });

  it('centro_score discrimina: dentro=40, buffer=20, fuera=0', () => {
    expect(
      computeH08Heritage({
        dentro_centro_historico: true,
        dentro_buffer_centro: true,
        monumentos_500m: 0,
        zonas_arqueologicas_2km: 0,
      }).components.centro_score,
    ).toBe(40);
    expect(
      computeH08Heritage({
        dentro_centro_historico: false,
        dentro_buffer_centro: true,
        monumentos_500m: 0,
        zonas_arqueologicas_2km: 0,
      }).components.centro_score,
    ).toBe(20);
    expect(
      computeH08Heritage({
        dentro_centro_historico: false,
        dentro_buffer_centro: false,
        monumentos_500m: 0,
        zonas_arqueologicas_2km: 0,
      }).components.centro_score,
    ).toBe(0);
  });
});
