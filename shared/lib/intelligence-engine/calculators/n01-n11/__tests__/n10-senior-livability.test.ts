import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n10, {
  computeN10SeniorLivability,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n10-senior-livability';

describe('N10 Senior Livability calculator', () => {
  it('declara version, methodology, reasoning + D1 recommendations', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toEqual(expect.arrayContaining(['dgis', 'siged', 'gtfs', 'denue']));
    expect(reasoning_template).toContain('{score_value}');
    for (const bucket of ['low', 'medium', 'high', 'insufficient_data'] as const) {
      expect(methodology.recommendations[bucket].length).toBeGreaterThan(0);
    }
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.n10.ideal_senior');
    expect(getLabelKey(65, 'medium')).toBe('ie.score.n10.apta_senior');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.n10.aceptable');
    expect(getLabelKey(20, 'low')).toBe('ie.score.n10.poco_apta');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.n10.insufficient');
    expect(getRecommendationKeys(85, 'high')).toEqual(methodology.recommendations.high);
  });

  it('Del Valle (proxy Narvarte) → score ≥75 apta/ideal senior', () => {
    const dv = CDMX_ZONES.find((z) => z.zona_name === 'Del Valle');
    if (!dv) throw new Error('fixture missing');
    const res = computeN10SeniorLivability({
      dgis: dv.sources.dgis,
      siged: dv.sources.siged,
      gtfs: dv.sources.gtfs,
      by_macro_category: dv.sources.denue.by_macro_category,
    });
    expect(res.value).toBeGreaterThanOrEqual(75);
  });

  it('Milpa Alta (distancia hospital 12km + zero transit) → score bajo', () => {
    const ma = CDMX_ZONES.find((z) => z.zona_name === 'Milpa Alta Centro');
    if (!ma) throw new Error('fixture missing');
    const res = computeN10SeniorLivability({
      dgis: ma.sources.dgis,
      siged: ma.sources.siged,
      gtfs: ma.sources.gtfs,
      by_macro_category: ma.sources.denue.by_macro_category,
    });
    expect(res.value).toBeLessThan(40);
    expect(res.components.bucket).toBe('low');
  });

  it('16 zonas CDMX — snapshot', () => {
    const snapshot: Record<
      string,
      {
        value: number;
        confidence: string;
        health: number;
        edu: number;
        transit: number;
        diversity: number;
      }
    > = {};
    for (const zone of CDMX_ZONES) {
      const res = computeN10SeniorLivability({
        dgis: zone.sources.dgis,
        siged: zone.sources.siged,
        gtfs: zone.sources.gtfs,
        by_macro_category: zone.sources.denue.by_macro_category,
      });
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        health: res.components.health_score,
        edu: res.components.edu_ext_score,
        transit: res.components.transit_esfuerzo,
        diversity: res.components.diversity_score,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('n10.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n10.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
  });
});
