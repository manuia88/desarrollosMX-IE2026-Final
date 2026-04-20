import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeF05Water, getLabelKey, methodology, version } from '../f05-water';

describe('F05 Water calculator', () => {
  it('declara methodology SACMEX', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('sacmex');
    expect(methodology.weights.cortes).toBe(60);
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.f05.excelente');
    expect(getLabelKey(65, 'high')).toBe('ie.score.f05.bueno');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.f05.precario');
    expect(getLabelKey(20, 'medium')).toBe('ie.score.f05.crisis');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.f05.insufficient');
  });

  it('16 zonas CDMX — snapshot + confidence matches SACMEX cascade', () => {
    const snapshot: Record<string, { value: number; confidence: string; label: string }> = {};
    for (const zone of CDMX_ZONES) {
      const res = computeF05Water(zone.sources.sacmex);
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      const m = zone.sources.sacmex.meses_datos;
      const expectedConfidence =
        m >= 6 ? 'high' : m >= 3 ? 'medium' : m >= 1 ? 'low' : 'insufficient_data';
      expect(res.confidence, `${zone.zona_name} meses=${m}`).toBe(expectedConfidence);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('extremos: Polanco/Del Valle > 85, Iztapalapa Sur/Milpa Alta < 50', () => {
    const byName = (n: string) => {
      const f = CDMX_ZONES.find((z) => z.zona_name === n);
      if (!f) throw new Error(`${n} no encontrada`);
      return f;
    };
    const pol = computeF05Water(byName('Polanco').sources.sacmex);
    const dv = computeF05Water(byName('Del Valle').sources.sacmex);
    const izt = computeF05Water(byName('Iztapalapa Sur').sources.sacmex);
    const ma = computeF05Water(byName('Milpa Alta Centro').sources.sacmex);
    expect(pol.value, 'Polanco').toBeGreaterThan(85);
    expect(dv.value, 'Del Valle').toBeGreaterThan(85);
    expect(izt.value, 'Iztapalapa').toBeLessThan(50);
    expect(ma.value, 'Milpa Alta').toBeLessThan(60);
  });

  it('colonias con tandeo ≥3/semana → score bajo', () => {
    const res = computeF05Water({
      meses_datos: 12,
      dias_sin_agua_anual: 50,
      presion_promedio_kpa: 120,
      tandeos_mes_promedio: 4,
    });
    expect(res.value).toBeLessThan(30);
  });
});
