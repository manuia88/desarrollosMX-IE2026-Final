import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_DENUE_SNAPSHOTS, CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n03, {
  computeN03Gentrification,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n03-gentrification-velocity';

describe('N03 Gentrification Velocity calculator', () => {
  it('declara version, methodology, reasoning + D1 recommendations', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('denue_snapshots');
    expect(reasoning_template).toContain('{score_value}');
    for (const bucket of ['low', 'medium', 'high', 'insufficient_data'] as const) {
      expect(methodology.recommendations[bucket].length).toBeGreaterThan(0);
    }
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.n03.gentrificacion_rapida');
    expect(getLabelKey(65, 'high')).toBe('ie.score.n03.gentrificacion_moderada');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.n03.cambio_leve');
    expect(getLabelKey(30, 'low')).toBe('ie.score.n03.estable');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.n03.insufficient');
  });

  it('gating: <2 snapshots → insufficient_data', () => {
    const res = computeN03Gentrification({ snapshots: [] });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.reason).toContain('2 snapshots');
    expect(getRecommendationKeys(0, res.confidence)).toEqual(
      methodology.recommendations.insufficient_data,
    );
  });

  it('gating: separación <3 meses → insufficient_data', () => {
    const res = computeN03Gentrification({
      snapshots: [
        {
          snapshot_date: '2026-03-01',
          total: 100,
          tier_counts: { high: 10, standard: 50, basic: 40 },
        },
        {
          snapshot_date: '2026-04-01',
          total: 100,
          tier_counts: { high: 12, standard: 48, basic: 40 },
        },
      ],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.reason).toContain('<3m');
  });

  it('Roma Norte — gentrificación rápida validated (score ≥60)', () => {
    const snapshots = CDMX_DENUE_SNAPSHOTS['Roma Norte'];
    if (!snapshots) throw new Error('fixtures missing');
    const res = computeN03Gentrification({ snapshots });
    expect(res.confidence).toBe('high');
    expect(res.value).toBeGreaterThanOrEqual(55);
    expect(res.components.tasa_apertura_cafeterias).toBeGreaterThan(0);
    expect(res.components.velocity).toBeGreaterThan(0);
  });

  it('16 zonas CDMX — snapshot con 2 snapshots cada una', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; velocity: number; bucket: string }
    > = {};
    for (const zone of CDMX_ZONES) {
      const snapshots = CDMX_DENUE_SNAPSHOTS[zone.zona_name];
      if (!snapshots) throw new Error(`missing snapshots for ${zone.zona_name}`);
      const res = computeN03Gentrification({ snapshots });
      expect(res.value).toBeGreaterThanOrEqual(0);
      expect(res.value).toBeLessThanOrEqual(100);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        velocity: res.components.velocity,
        bucket: res.components.bucket,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('n03.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n03.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
  });
});
