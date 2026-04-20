import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n02, {
  computeN02Employment,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n02-employment-accessibility';

describe('N02 Employment Accessibility calculator', () => {
  it('declara version, methodology, reasoning_template + D1 recommendations', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toEqual(expect.arrayContaining(['denue', 'gtfs']));
    expect(reasoning_template).toContain('{score_value}');
    for (const bucket of ['low', 'medium', 'high', 'insufficient_data'] as const) {
      expect(methodology.recommendations[bucket].length).toBeGreaterThan(0);
    }
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.n02.hub_laboral');
    expect(getLabelKey(65, 'high')).toBe('ie.score.n02.acceso_bueno');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.n02.acceso_moderado');
    expect(getLabelKey(20, 'low')).toBe('ie.score.n02.aislada');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.n02.insufficient');
    expect(getRecommendationKeys(85, 'high')).toEqual(methodology.recommendations.high);
  });

  it('16 zonas CDMX — snapshot + discriminación', () => {
    const snapshot: Record<string, { value: number; confidence: string; empleos: number }> = {};
    for (const zone of CDMX_ZONES) {
      const res = computeN02Employment({
        by_macro_category: zone.sources.denue.by_macro_category,
        total_denue: zone.sources.denue.total,
        gtfs: zone.sources.gtfs,
      });
      expect(res.value).toBeGreaterThanOrEqual(0);
      expect(res.value).toBeLessThanOrEqual(100);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        empleos: res.components.empleos_accesibles,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('Del Valle (cerca Metro) → score ≥80', () => {
    const dv = CDMX_ZONES.find((z) => z.zona_name === 'Del Valle');
    if (!dv) throw new Error('fixture missing');
    const res = computeN02Employment({
      by_macro_category: dv.sources.denue.by_macro_category,
      total_denue: dv.sources.denue.total,
      gtfs: dv.sources.gtfs,
    });
    expect(res.value).toBeGreaterThanOrEqual(80);
  });

  it('Milpa Alta (aislada, zero metro) → score menor', () => {
    const ma = CDMX_ZONES.find((z) => z.zona_name === 'Milpa Alta Centro');
    const dv = CDMX_ZONES.find((z) => z.zona_name === 'Del Valle');
    if (!ma || !dv) throw new Error('fixtures missing');
    const resMA = computeN02Employment({
      by_macro_category: ma.sources.denue.by_macro_category,
      total_denue: ma.sources.denue.total,
      gtfs: ma.sources.gtfs,
    });
    const resDV = computeN02Employment({
      by_macro_category: dv.sources.denue.by_macro_category,
      total_denue: dv.sources.denue.total,
      gtfs: dv.sources.gtfs,
    });
    expect(resMA.value).toBeLessThan(resDV.value);
  });

  it('n02.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n02.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
  });
});
