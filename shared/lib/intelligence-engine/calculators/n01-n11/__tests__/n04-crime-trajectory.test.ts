import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_FGJ_TRAJECTORY, CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n04, {
  computeN04CrimeTrajectory,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n04-crime-trajectory';

describe('N04 Crime Trajectory calculator', () => {
  it('declara version, methodology, reasoning + D1 recommendations', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('fgj');
    expect(reasoning_template).toContain('{score_value}');
    for (const bucket of ['low', 'medium', 'high', 'insufficient_data'] as const) {
      expect(methodology.recommendations[bucket].length).toBeGreaterThan(0);
    }
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.n04.mejorando_fuerte');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.n04.mejorando');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.n04.estable');
    expect(getLabelKey(20, 'low')).toBe('ie.score.n04.empeorando');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.n04.insufficient');
    expect(getRecommendationKeys(0, 'insufficient_data')).toEqual(
      methodology.recommendations.insufficient_data,
    );
  });

  it('Roma Norte (drop violentos + patrimoniales) → score ≥75', () => {
    const roma = CDMX_FGJ_TRAJECTORY['Roma Norte'];
    if (!roma) throw new Error('fixture missing');
    const res = computeN04CrimeTrajectory(roma);
    expect(res.value).toBeGreaterThanOrEqual(75);
    expect(res.components.delta_violentos_pct).toBeLessThan(0);
  });

  it('Iztapalapa Sur (trajectory empeorando violentos +23%) → score <35', () => {
    const izta = CDMX_FGJ_TRAJECTORY['Iztapalapa Sur'];
    if (!izta) throw new Error('fixture missing');
    const res = computeN04CrimeTrajectory(izta);
    expect(res.value).toBeLessThan(35);
    expect(res.components.delta_violentos_pct).toBeGreaterThan(0);
    expect(res.components.bucket).toBe('low');
  });

  it('16 zonas CDMX — snapshot', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; delta_v: number; delta_p: number }
    > = {};
    for (const zone of CDMX_ZONES) {
      const traj = CDMX_FGJ_TRAJECTORY[zone.zona_name];
      if (!traj) throw new Error(`missing trajectory for ${zone.zona_name}`);
      const res = computeN04CrimeTrajectory(traj);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        delta_v: res.components.delta_violentos_pct,
        delta_p: res.components.delta_patrimoniales_pct,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('n04.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n04.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
  });
});
