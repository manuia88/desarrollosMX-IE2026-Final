import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n08, {
  computeN08Walkability,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n08-walkability-mx';

describe('N08 Walkability MX calculator', () => {
  it('declara version, methodology, reasoning + D1 recommendations', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toEqual(expect.arrayContaining(['denue', 'gtfs']));
    expect(reasoning_template).toContain('{score_value}');
    for (const bucket of ['low', 'medium', 'high', 'insufficient_data'] as const) {
      expect(methodology.recommendations[bucket].length).toBeGreaterThan(0);
    }
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.n08.muy_walkable');
    expect(getLabelKey(65, 'high')).toBe('ie.score.n08.walkable');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.n08.mixto');
    expect(getLabelKey(25, 'low')).toBe('ie.score.n08.requiere_auto');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.n08.insufficient');
    expect(getRecommendationKeys(85, 'high')).toEqual(methodology.recommendations.high);
  });

  it('Roma Norte (DENUE denso + metro + ecobici) → score ≥80', () => {
    const roma = CDMX_ZONES.find((z) => z.zona_name === 'Roma Norte');
    if (!roma) throw new Error('fixture missing');
    const res = computeN08Walkability({
      total_denue: roma.sources.denue.total,
      by_macro_category: roma.sources.denue.by_macro_category,
      gtfs: roma.sources.gtfs,
    });
    expect(res.value).toBeGreaterThanOrEqual(80);
    expect(res.components.bucket).toBe('high');
  });

  it('Milpa Alta (zero transit, baja densidad) → score bajo vs Roma Norte', () => {
    const ma = CDMX_ZONES.find((z) => z.zona_name === 'Milpa Alta Centro');
    const roma = CDMX_ZONES.find((z) => z.zona_name === 'Roma Norte');
    if (!ma || !roma) throw new Error('fixtures missing');
    const resMA = computeN08Walkability({
      total_denue: ma.sources.denue.total,
      by_macro_category: ma.sources.denue.by_macro_category,
      gtfs: ma.sources.gtfs,
    });
    const resRoma = computeN08Walkability({
      total_denue: roma.sources.denue.total,
      by_macro_category: roma.sources.denue.by_macro_category,
      gtfs: roma.sources.gtfs,
    });
    expect(resMA.value).toBeLessThan(resRoma.value);
    expect(resMA.value).toBeLessThan(50);
  });

  it('16 zonas CDMX — snapshot', () => {
    const snapshot: Record<
      string,
      {
        value: number;
        confidence: string;
        density: number;
        diversity: number;
        connectivity: number;
      }
    > = {};
    for (const zone of CDMX_ZONES) {
      const res = computeN08Walkability({
        total_denue: zone.sources.denue.total,
        by_macro_category: zone.sources.denue.by_macro_category,
        gtfs: zone.sources.gtfs,
      });
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        density: res.components.densidad_manzanas,
        diversity: res.components.diversidad_usos,
        connectivity: res.components.conectividad,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('n08.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n08.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
  });
});
