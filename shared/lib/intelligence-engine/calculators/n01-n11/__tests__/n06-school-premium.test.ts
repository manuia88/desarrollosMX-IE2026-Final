import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_SCHOOL_PREMIUM, CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n06, {
  computeN06SchoolPremium,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n06-school-premium';

describe('N06 School Premium calculator', () => {
  it('declara version, methodology, reasoning + D1 recommendations', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toEqual(
      expect.arrayContaining(['siged', 'market_prices_secondary']),
    );
    expect(reasoning_template).toContain('{score_value}');
    for (const bucket of ['low', 'medium', 'high', 'insufficient_data'] as const) {
      expect(methodology.recommendations[bucket].length).toBeGreaterThan(0);
    }
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.n06.premium_prime');
    expect(getLabelKey(65, 'high')).toBe('ie.score.n06.premium_alto');
    expect(getLabelKey(35, 'medium')).toBe('ie.score.n06.premium_moderado');
    expect(getLabelKey(15, 'low')).toBe('ie.score.n06.sin_premium');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.n06.insufficient');
    expect(getRecommendationKeys(85, 'high')).toEqual(methodology.recommendations.high);
  });

  it('Polanco (premium 24% + 4 top_20) → score ≥80', () => {
    const polanco = CDMX_SCHOOL_PREMIUM['Polanco'];
    const siged = CDMX_ZONES.find((z) => z.zona_name === 'Polanco')?.sources.siged;
    if (!polanco || !siged) throw new Error('fixtures missing');
    const res = computeN06SchoolPremium({
      premium_pct: polanco.premium_pct,
      baseline_m2_mxn: polanco.baseline_m2_mxn,
      premium_near_top_m2_mxn: polanco.premium_near_top_m2_mxn,
      top_20_count: siged.top_20_count,
    });
    expect(res.value).toBeGreaterThanOrEqual(80);
    expect(res.components.bucket).toBe('high');
  });

  it('Iztapalapa Sur (sin premium) → score bajo', () => {
    const izta = CDMX_SCHOOL_PREMIUM['Iztapalapa Sur'];
    const siged = CDMX_ZONES.find((z) => z.zona_name === 'Iztapalapa Sur')?.sources.siged;
    if (!izta || !siged) throw new Error('fixtures missing');
    const res = computeN06SchoolPremium({
      premium_pct: izta.premium_pct,
      baseline_m2_mxn: izta.baseline_m2_mxn,
      premium_near_top_m2_mxn: izta.premium_near_top_m2_mxn,
      top_20_count: siged.top_20_count,
    });
    expect(res.value).toBeLessThan(25);
  });

  it('16 zonas CDMX — snapshot', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; premium_pct: number; top_20: number }
    > = {};
    for (const zone of CDMX_ZONES) {
      const premium = CDMX_SCHOOL_PREMIUM[zone.zona_name];
      if (!premium) throw new Error(`missing premium for ${zone.zona_name}`);
      const res = computeN06SchoolPremium({
        premium_pct: premium.premium_pct,
        baseline_m2_mxn: premium.baseline_m2_mxn,
        premium_near_top_m2_mxn: premium.premium_near_top_m2_mxn,
        top_20_count: zone.sources.siged.top_20_count,
      });
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        premium_pct: res.components.premium_pct,
        top_20: res.components.top_20_count,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('n06.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n06.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
  });
});
