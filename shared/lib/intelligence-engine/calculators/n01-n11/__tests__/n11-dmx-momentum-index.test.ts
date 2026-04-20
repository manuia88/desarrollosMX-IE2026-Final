import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_MOMENTUM_INPUTS, CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n11, {
  computeN11Momentum,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n11-dmx-momentum-index';

describe('N11 DMX Momentum Index calculator', () => {
  it('declara version, methodology, reasoning_template + D1 recommendations 4 buckets', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('denue');
    expect(methodology.weights.f08).toBeGreaterThan(0);
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
    // D1 recommendations obligatorias por bucket.
    expect(methodology.recommendations.low.length).toBeGreaterThan(0);
    expect(methodology.recommendations.medium.length).toBeGreaterThan(0);
    expect(methodology.recommendations.high.length).toBeGreaterThan(0);
    expect(methodology.recommendations.insufficient_data.length).toBeGreaterThan(0);
    // P1 validity expressed in months.
    expect(methodology.validity.unit).toBe('months');
    expect(methodology.validity.value).toBe(1);
  });

  it('getLabelKey mapea buckets correctamente', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.n11.aceleracion');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.n11.estable');
    expect(getLabelKey(20, 'low')).toBe('ie.score.n11.desaceleracion');
    expect(getLabelKey(85, 'insufficient_data')).toBe('ie.score.n11.insufficient');
  });

  it('getRecommendationKeys retorna set correcto por bucket', () => {
    expect(getRecommendationKeys(85, 'high')).toEqual(methodology.recommendations.high);
    expect(getRecommendationKeys(50, 'medium')).toEqual(methodology.recommendations.medium);
    expect(getRecommendationKeys(20, 'low')).toEqual(methodology.recommendations.low);
    expect(getRecommendationKeys(50, 'insufficient_data')).toEqual(
      methodology.recommendations.insufficient_data,
    );
  });

  it('tier 3 gate bloquea zonas con <50 proyectos o <6 meses data', () => {
    const iztapalapa = CDMX_MOMENTUM_INPUTS['Iztapalapa Sur'];
    if (!iztapalapa) throw new Error('fixture missing');
    const res = computeN11Momentum(iztapalapa);
    expect(res.tier_gated).toBe(true);
    expect(res.tier_gated_reason).toContain('Tier 3 gated');
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.tier_gate_passed).toBe(false);
  });

  it('zona target killer (Roma Norte proxy Narvarte) → score ≥80', () => {
    const roma = CDMX_MOMENTUM_INPUTS['Roma Norte'];
    if (!roma) throw new Error('fixture missing');
    const res = computeN11Momentum(roma);
    expect(res.tier_gated).toBe(false);
    expect(res.value).toBeGreaterThanOrEqual(80);
    expect(res.components.bucket).toBe('high');
    expect(res.confidence).not.toBe('insufficient_data');
  });

  it('zona estable (Cuajimalpa) → medium bucket', () => {
    const cuaji = CDMX_MOMENTUM_INPUTS['Cuajimalpa Centro'];
    if (!cuaji) throw new Error('fixture missing');
    const res = computeN11Momentum(cuaji);
    expect(res.tier_gated).toBe(false);
    expect(res.value).toBeGreaterThan(30);
    expect(res.value).toBeLessThan(60);
    expect(res.components.bucket).toBe('medium');
  });

  it('16 zonas CDMX — snapshot + discriminación + tier gate logic', () => {
    const snapshot: Record<
      string,
      {
        value: number;
        confidence: string;
        bucket: string;
        gated: boolean;
        gated_reason: string | null;
      }
    > = {};
    let gatedCount = 0;
    let ungatedCount = 0;
    for (const zone of CDMX_ZONES) {
      const inputs = CDMX_MOMENTUM_INPUTS[zone.zona_name];
      if (!inputs) throw new Error(`missing momentum inputs for ${zone.zona_name}`);
      const res = computeN11Momentum(inputs);
      if (res.tier_gated) gatedCount += 1;
      else ungatedCount += 1;
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        bucket: res.components.bucket,
        gated: res.tier_gated,
        gated_reason: res.tier_gated_reason,
      };
    }
    expect(snapshot).toMatchSnapshot();
    expect(gatedCount).toBeGreaterThan(0);
    expect(ungatedCount).toBeGreaterThan(0);
  });

  it('z-score se computa vs mean/std CDMX default', () => {
    const res = computeN11Momentum({
      f08_delta_12m: 3.0,
      a12_delta_12m: 2.0,
      search_trends_delta_3m: 5,
      n01_delta_12m: 0.05,
      n03_velocity: 10,
      proyectos_zona: 60,
      meses_data_disponible: 12,
    });
    // default mean 1.0, std 1.5 → (3 - 1) / 1.5 ≈ 1.333
    expect(res.components.z_score).toBeCloseTo(1.333, 2);
  });

  it('n11.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n11.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.n11.insufficient');
  });
});
