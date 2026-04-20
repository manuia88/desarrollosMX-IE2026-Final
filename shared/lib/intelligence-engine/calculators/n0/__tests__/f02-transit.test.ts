import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeF02Transit, getLabelKey, methodology, version } from '../f02-transit';

describe('F02 Transit calculator', () => {
  it('declara version + methodology GTFS', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('gtfs');
    expect(methodology.weights.metro).toBe(40);
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.f02.excelente');
    expect(getLabelKey(70, 'high')).toBe('ie.score.f02.bueno');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.f02.moderado');
    expect(getLabelKey(10, 'low')).toBe('ie.score.f02.limitado');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.f02.insufficient');
  });

  it('16 zonas CDMX — snapshot valores + confidence', () => {
    const snapshot: Record<string, { value: number; confidence: string; label: string }> = {};
    for (const zone of CDMX_ZONES) {
      const res = computeF02Transit(zone.sources.gtfs);
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('extremos: Polanco/Roma/Del Valle > 60, rural (Milpa Alta/Cuajimalpa) < 20', () => {
    const byName = (n: string) => {
      const found = CDMX_ZONES.find((z) => z.zona_name === n);
      if (!found) throw new Error(`Fixture ${n} no encontrada`);
      return found;
    };
    const pol = computeF02Transit(byName('Polanco').sources.gtfs);
    const roma = computeF02Transit(byName('Roma Norte').sources.gtfs);
    const dv = computeF02Transit(byName('Del Valle').sources.gtfs);
    const ma = computeF02Transit(byName('Milpa Alta Centro').sources.gtfs);
    const cuaj = computeF02Transit(byName('Cuajimalpa Centro').sources.gtfs);
    expect(pol.value, 'Polanco').toBeGreaterThan(60);
    expect(roma.value, 'Roma Norte').toBeGreaterThan(60);
    expect(dv.value, 'Del Valle').toBeGreaterThan(60);
    expect(ma.value, 'Milpa Alta').toBeLessThan(20);
    expect(cuaj.value, 'Cuajimalpa').toBeLessThan(20);
  });

  it('0 transporte → insufficient_data', () => {
    const res = computeF02Transit({
      estaciones_metro_1km: 0,
      paradas_metrobus_500m: 0,
      estaciones_tren_2km: 0,
      ecobici_400m: 0,
      densidad_rutas_brt: 0,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
  });
});
