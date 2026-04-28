import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_CONAGUA, CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n07, {
  computeN07WaterSecurity,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n07-water-security';

describe('N07 Water Security calculator', () => {
  it('declara version, methodology, reasoning + D1 recommendations', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toEqual(expect.arrayContaining(['sacmex', 'conagua']));
    expect(reasoning_template).toContain('{score_value}');
    for (const bucket of ['low', 'medium', 'high', 'insufficient_data'] as const) {
      expect(methodology.recommendations[bucket].length).toBeGreaterThan(0);
    }
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.n07.seguridad_alta');
    expect(getLabelKey(65, 'medium')).toBe('ie.score.n07.seguridad_aceptable');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.n07.tension_moderada');
    expect(getLabelKey(20, 'low')).toBe('ie.score.n07.crisis_cronica');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.n07.insufficient');
    expect(getRecommendationKeys(90, 'high')).toEqual(methodology.recommendations.high);
  });

  it('Xochimilco (35d cortes + 30% sobreexp) → score <35', () => {
    const xochi = CDMX_ZONES.find((z) => z.zona_name === 'Xochimilco Centro');
    const conagua = CDMX_CONAGUA['Xochimilco Centro'];
    if (!xochi || !conagua) throw new Error('fixtures missing');
    const res = computeN07WaterSecurity({
      dias_sin_agua_anual: xochi.sources.sacmex.dias_sin_agua_anual,
      meses_datos_sacmex: xochi.sources.sacmex.meses_datos,
      sobreexplotacion_pct: conagua.sobreexplotacion_acuifero_pct,
      nivel_acuifero_delta_12m_m: conagua.nivel_acuifero_delta_12m_m,
    });
    expect(res.value).toBeLessThan(35);
  });

  it('Polanco (2d + 3% sobreexp) → score ≥85', () => {
    const polanco = CDMX_ZONES.find((z) => z.zona_name === 'Polanco');
    const conagua = CDMX_CONAGUA.Polanco;
    if (!polanco || !conagua) throw new Error('fixtures missing');
    const res = computeN07WaterSecurity({
      dias_sin_agua_anual: polanco.sources.sacmex.dias_sin_agua_anual,
      meses_datos_sacmex: polanco.sources.sacmex.meses_datos,
      sobreexplotacion_pct: conagua.sobreexplotacion_acuifero_pct,
      nivel_acuifero_delta_12m_m: conagua.nivel_acuifero_delta_12m_m,
    });
    expect(res.value).toBeGreaterThanOrEqual(85);
  });

  it('16 zonas CDMX — snapshot', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; dias: number; sobreexp: number }
    > = {};
    for (const zone of CDMX_ZONES) {
      const conagua = CDMX_CONAGUA[zone.zona_name];
      if (!conagua) throw new Error(`missing conagua for ${zone.zona_name}`);
      const res = computeN07WaterSecurity({
        dias_sin_agua_anual: zone.sources.sacmex.dias_sin_agua_anual,
        meses_datos_sacmex: zone.sources.sacmex.meses_datos,
        sobreexplotacion_pct: conagua.sobreexplotacion_acuifero_pct,
        nivel_acuifero_delta_12m_m: conagua.nivel_acuifero_delta_12m_m,
      });
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        dias: res.components.dias_sin_agua_anual,
        sobreexp: res.components.sobreexplotacion_pct,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('n07.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n07.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
  });
});
