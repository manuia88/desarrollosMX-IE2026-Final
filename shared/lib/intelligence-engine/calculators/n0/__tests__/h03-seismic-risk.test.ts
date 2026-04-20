import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeH03Seismic, getLabelKey, methodology, version } from '../h03-seismic-risk';

describe('H03 Seismic Risk calculator', () => {
  it('declara methodology Atlas Riesgos', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('atlas_riesgos');
  });

  it('getLabelKey mapea riesgo INVERSO', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.h03.bajo');
    expect(getLabelKey(60, 'high')).toBe('ie.score.h03.medio');
    expect(getLabelKey(30, 'high')).toBe('ie.score.h03.alto');
    expect(getLabelKey(10, 'high')).toBe('ie.score.h03.muy_alto');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.h03.insufficient');
  });

  it('16 zonas CDMX — snapshot + confidence high (Atlas shapefile)', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; label: string; zona: string }
    > = {};
    for (const zone of CDMX_ZONES) {
      const res = computeH03Seismic(zone.sources.atlas);
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      expect(res.confidence, zone.zona_name).toBe('high');
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
        zona: zone.sources.atlas.zona_geotecnica,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('zona IIIc/IIId → score <30 (alto/muy alto riesgo)', () => {
    const iiic = computeH03Seismic({
      zona_geotecnica: 'IIIc',
      amplificacion_onda: 'alta',
      licuacion_riesgo: 'alto',
    });
    expect(iiic.value).toBeLessThan(10);
    const iiid = computeH03Seismic({
      zona_geotecnica: 'IIId',
      amplificacion_onda: 'alta',
      licuacion_riesgo: 'alto',
    });
    expect(iiid.value).toBeLessThan(5);
  });

  it('zona I + baja amp + bajo lic → score 100', () => {
    const i = computeH03Seismic({
      zona_geotecnica: 'I',
      amplificacion_onda: 'baja',
      licuacion_riesgo: 'bajo',
    });
    expect(i.value).toBe(100);
  });

  it('extremos: Contreras (I) > 80, Iztapalapa Sur (IIIc alta/alta) < 15', () => {
    const byName = (n: string) => CDMX_ZONES.find((z) => z.zona_name === n);
    const con = byName('Contreras Centro');
    const izt = byName('Iztapalapa Sur');
    if (!con || !izt) throw new Error('fixtures');
    const conRes = computeH03Seismic(con.sources.atlas);
    const iztRes = computeH03Seismic(izt.sources.atlas);
    expect(conRes.value).toBeGreaterThan(80);
    expect(iztRes.value).toBeLessThan(15);
  });
});
