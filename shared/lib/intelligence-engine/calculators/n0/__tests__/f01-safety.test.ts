import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import f01, {
  computeF01Safety,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../f01-safety';

describe('F01 Safety calculator', () => {
  it('declara version, methodology, reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('fgj');
    expect(methodology.weights.violentos).toBeGreaterThan(methodology.weights.patrimoniales);
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('getLabelKey mapea umbrales correctamente', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.f01.muy_seguro');
    expect(getLabelKey(70, 'high')).toBe('ie.score.f01.seguro');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.f01.moderado');
    expect(getLabelKey(20, 'medium')).toBe('ie.score.f01.riesgoso');
    expect(getLabelKey(90, 'insufficient_data')).toBe('ie.score.f01.insufficient');
  });

  it('16 zonas CDMX — valores en [0,100] + confidence coherente + snapshot', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; label: string; trend: string }
    > = {};
    for (const zone of CDMX_ZONES) {
      const res = computeF01Safety({
        count_12m: zone.sources.fgj.count_12m,
        count_12m_prev: zone.sources.fgj.count_12m_prev,
        by_categoria: zone.sources.fgj.by_categoria,
        hora_max_riesgo: zone.sources.fgj.hora_max_riesgo,
        poblacion: zone.poblacion,
      });
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      expect(['high', 'medium', 'low', 'insufficient_data'], zone.zona_name).toContain(
        res.confidence,
      );
      // Confidence matches FGJ cascade thresholds (high≥50, medium≥10, low≥1)
      const c = zone.sources.fgj.count_12m;
      const expectedConfidence =
        c >= 50 ? 'high' : c >= 10 ? 'medium' : c >= 1 ? 'low' : 'insufficient_data';
      expect(res.confidence, `${zone.zona_name} count=${c}`).toBe(expectedConfidence);
      expect(res.components.by_categoria).toEqual(zone.sources.fgj.by_categoria);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
        trend: res.trend_direction,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('extremos discriminan: Del Valle > 60, Polanco > 40 (crime per capita), Tepito < 25', () => {
    const del_valle = CDMX_ZONES.find((z) => z.zona_name === 'Del Valle');
    const polanco = CDMX_ZONES.find((z) => z.zona_name === 'Polanco');
    const tepito = CDMX_ZONES.find((z) => z.zona_name === 'Tepito');
    if (!del_valle || !polanco || !tepito) throw new Error('fixtures incompletas');
    const dv = computeF01Safety({
      count_12m: del_valle.sources.fgj.count_12m,
      count_12m_prev: del_valle.sources.fgj.count_12m_prev,
      by_categoria: del_valle.sources.fgj.by_categoria,
      hora_max_riesgo: del_valle.sources.fgj.hora_max_riesgo,
      poblacion: del_valle.poblacion,
    });
    const pol = computeF01Safety({
      count_12m: polanco.sources.fgj.count_12m,
      count_12m_prev: polanco.sources.fgj.count_12m_prev,
      by_categoria: polanco.sources.fgj.by_categoria,
      hora_max_riesgo: polanco.sources.fgj.hora_max_riesgo,
      poblacion: polanco.poblacion,
    });
    const tep = computeF01Safety({
      count_12m: tepito.sources.fgj.count_12m,
      count_12m_prev: tepito.sources.fgj.count_12m_prev,
      by_categoria: tepito.sources.fgj.by_categoria,
      hora_max_riesgo: tepito.sources.fgj.hora_max_riesgo,
      poblacion: tepito.poblacion,
    });
    expect(dv.value).toBeGreaterThan(60);
    expect(pol.value).toBeGreaterThan(40);
    expect(tep.value).toBeLessThan(25);
    // Del Valle (familiar consolidado) > Polanco (denso comercio) > Tepito (extremo) — discriminación válida.
    expect(dv.value).toBeGreaterThan(pol.value);
    expect(pol.value).toBeGreaterThan(tep.value);
  });

  it('trend_direction clasifica por delta', () => {
    expect(
      computeF01Safety({
        count_12m: 40,
        count_12m_prev: 60,
        by_categoria: { violentos: 5, patrimoniales: 25, no_violentos: 10 },
        hora_max_riesgo: '20:00',
        poblacion: 50000,
      }).trend_direction,
    ).toBe('mejorando');
    expect(
      computeF01Safety({
        count_12m: 65,
        count_12m_prev: 50,
        by_categoria: { violentos: 10, patrimoniales: 40, no_violentos: 15 },
        hora_max_riesgo: '22:00',
        poblacion: 50000,
      }).trend_direction,
    ).toBe('empeorando');
    expect(
      computeF01Safety({
        count_12m: 50,
        count_12m_prev: 51,
        by_categoria: { violentos: 8, patrimoniales: 30, no_violentos: 12 },
        hora_max_riesgo: '21:00',
        poblacion: 50000,
      }).trend_direction,
    ).toBe('estable');
  });

  it('confidence insufficient si count < 1', () => {
    const res = computeF01Safety({
      count_12m: 0,
      count_12m_prev: 5,
      by_categoria: { violentos: 0, patrimoniales: 0, no_violentos: 0 },
      hora_max_riesgo: 'n/a',
      poblacion: 50000,
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('f01.run() prod-path devuelve insufficient cuando geo_data_points vacío + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await f01.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.f01.insufficient');
  });
});
