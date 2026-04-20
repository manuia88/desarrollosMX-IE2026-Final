import { describe, expect, it } from 'vitest';
import { CDMX_CONAGUA, CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeH10Water, getLabelKey, methodology, version } from '../h10-water-crisis';

describe('H10 Water Crisis calculator', () => {
  it('declara methodology SACMEX + CONAGUA', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toEqual(expect.arrayContaining(['sacmex', 'conagua']));
  });

  it('getLabelKey mapea severidades INVERSAS', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.h10.sin_crisis');
    expect(getLabelKey(55, 'high')).toBe('ie.score.h10.estres_moderado');
    expect(getLabelKey(30, 'high')).toBe('ie.score.h10.crisis_activa');
    expect(getLabelKey(15, 'high')).toBe('ie.score.h10.crisis_severa');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.h10.insufficient');
  });

  it('16 zonas CDMX — snapshot cruzando SACMEX + CONAGUA', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; label: string; severidad: string }
    > = {};
    for (const zone of CDMX_ZONES) {
      const conagua = CDMX_CONAGUA[zone.zona_name];
      if (!conagua) throw new Error(`CONAGUA ${zone.zona_name} missing`);
      const res = computeH10Water({
        meses_datos: zone.sources.sacmex.meses_datos,
        dias_sin_agua_anual: zone.sources.sacmex.dias_sin_agua_anual,
        sobreexplotacion_acuifero_pct: conagua.sobreexplotacion_acuifero_pct,
        nivel_acuifero_delta_m: conagua.nivel_acuifero_delta_12m_m,
      });
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
        severidad: res.components.severidad,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('extremos: Iztapalapa Sur <30, Coyoacán Centro ≥75 (per plan criterio done)', () => {
    const byZone = (n: string) => {
      const z = CDMX_ZONES.find((x) => x.zona_name === n);
      const c = CDMX_CONAGUA[n];
      if (!z || !c) throw new Error(`${n} missing`);
      return { z, c };
    };
    const { z: izt_z, c: izt_c } = byZone('Iztapalapa Sur');
    const izt = computeH10Water({
      meses_datos: izt_z.sources.sacmex.meses_datos,
      dias_sin_agua_anual: izt_z.sources.sacmex.dias_sin_agua_anual,
      sobreexplotacion_acuifero_pct: izt_c.sobreexplotacion_acuifero_pct,
      nivel_acuifero_delta_m: izt_c.nivel_acuifero_delta_12m_m,
    });
    const { z: coy_z, c: coy_c } = byZone('Coyoacán Centro');
    const coy = computeH10Water({
      meses_datos: coy_z.sources.sacmex.meses_datos,
      dias_sin_agua_anual: coy_z.sources.sacmex.dias_sin_agua_anual,
      sobreexplotacion_acuifero_pct: coy_c.sobreexplotacion_acuifero_pct,
      nivel_acuifero_delta_m: coy_c.nivel_acuifero_delta_12m_m,
    });
    expect(izt.value, 'Iztapalapa').toBeLessThan(30);
    expect(coy.value, 'Coyoacán').toBeGreaterThanOrEqual(75);
  });

  it('severidad clasificación', () => {
    expect(
      computeH10Water({
        meses_datos: 12,
        dias_sin_agua_anual: 100,
        sobreexplotacion_acuifero_pct: 40,
        nivel_acuifero_delta_m: -3,
      }).components.severidad,
    ).toBe('critica');
    expect(
      computeH10Water({
        meses_datos: 12,
        dias_sin_agua_anual: 10,
        sobreexplotacion_acuifero_pct: 5,
        nivel_acuifero_delta_m: -0.2,
      }).components.severidad,
    ).toBe('leve');
  });
});
