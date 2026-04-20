import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n01, {
  computeN01Diversity,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n01-ecosystem-diversity';

describe('N01 Ecosystem Diversity (Shannon-Wiener) calculator', () => {
  it('declara version, methodology, reasoning_template + D1 recommendations 4 buckets', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('denue');
    expect(reasoning_template).toContain('{score_value}');
    expect(methodology.recommendations.low.length).toBeGreaterThan(0);
    expect(methodology.recommendations.medium.length).toBeGreaterThan(0);
    expect(methodology.recommendations.high.length).toBeGreaterThan(0);
    expect(methodology.recommendations.insufficient_data.length).toBeGreaterThan(0);
    expect(methodology.validity.unit).toBe('months');
  });

  it('getLabelKey + getRecommendationKeys mapean buckets', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.n01.hiperdiverso');
    expect(getLabelKey(65, 'high')).toBe('ie.score.n01.diverso');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.n01.moderado');
    expect(getLabelKey(20, 'low')).toBe('ie.score.n01.homogeneo');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.n01.insufficient');
    expect(getRecommendationKeys(90, 'high')).toEqual(methodology.recommendations.high);
    expect(getRecommendationKeys(30, 'low')).toEqual(methodology.recommendations.low);
    expect(getRecommendationKeys(0, 'insufficient_data')).toEqual(
      methodology.recommendations.insufficient_data,
    );
  });

  it('16 zonas CDMX — snapshot + valores en [0,100] + confidence coherente', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; shannon: number; top: readonly string[] }
    > = {};
    for (const zone of CDMX_ZONES) {
      const res = computeN01Diversity({
        total: zone.sources.denue.total,
        tier_counts: zone.sources.denue.tier_counts,
        by_macro_category: zone.sources.denue.by_macro_category,
      });
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      const c = zone.sources.denue.total;
      const expected =
        c >= 100 ? 'high' : c >= 20 ? 'medium' : c >= 1 ? 'low' : 'insufficient_data';
      expect(res.confidence, `${zone.zona_name} total=${c}`).toBe(expected);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        shannon: res.components.shannon_H,
        top: res.components.top_3_categorias,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('extremos discriminan: Polanco/Roma Norte (diversa) > Iztapalapa Sur (homogénea)', () => {
    const polanco = CDMX_ZONES.find((z) => z.zona_name === 'Polanco');
    const roma = CDMX_ZONES.find((z) => z.zona_name === 'Roma Norte');
    const izta = CDMX_ZONES.find((z) => z.zona_name === 'Iztapalapa Sur');
    if (!polanco || !roma || !izta) throw new Error('fixtures incompletas');
    const p = computeN01Diversity({
      total: polanco.sources.denue.total,
      tier_counts: polanco.sources.denue.tier_counts,
      by_macro_category: polanco.sources.denue.by_macro_category,
    });
    const r = computeN01Diversity({
      total: roma.sources.denue.total,
      tier_counts: roma.sources.denue.tier_counts,
      by_macro_category: roma.sources.denue.by_macro_category,
    });
    const i = computeN01Diversity({
      total: izta.sources.denue.total,
      tier_counts: izta.sources.denue.tier_counts,
      by_macro_category: izta.sources.denue.by_macro_category,
    });
    expect(p.value).toBeGreaterThan(60);
    expect(r.value).toBeGreaterThan(60);
    expect(p.value).toBeGreaterThan(i.value);
  });

  it('confidence insufficient si total < 1', () => {
    const res = computeN01Diversity({
      total: 0,
      tier_counts: { high: 0, standard: 0, basic: 0 },
      by_macro_category: {},
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('n01.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n01.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
  });
});
