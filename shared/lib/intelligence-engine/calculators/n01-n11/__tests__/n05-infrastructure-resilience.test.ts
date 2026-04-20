import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n05, {
  computeN05Resilience,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n05-infrastructure-resilience';

describe('N05 Infrastructure Resilience calculator', () => {
  it('declara version, methodology, reasoning + D1 recommendations', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toEqual(
      expect.arrayContaining(['atlas_riesgos', 'sacmex', 'gtfs']),
    );
    expect(reasoning_template).toContain('{score_value}');
    for (const bucket of ['low', 'medium', 'high', 'insufficient_data'] as const) {
      expect(methodology.recommendations[bucket].length).toBeGreaterThan(0);
    }
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.n05.alta_resiliencia');
    expect(getLabelKey(65, 'high')).toBe('ie.score.n05.resiliencia_balanceada');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.n05.resiliencia_moderada');
    expect(getLabelKey(20, 'low')).toBe('ie.score.n05.baja_resiliencia');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.n05.insufficient');
    expect(getRecommendationKeys(85, 'high')).toEqual(methodology.recommendations.high);
  });

  it('Coyoacán Centro (atlas II + pocos cortes + bici) → score ≥75', () => {
    const cy = CDMX_ZONES.find((z) => z.zona_name === 'Coyoacán Centro');
    if (!cy) throw new Error('fixture missing');
    const res = computeN05Resilience({
      zona_geotecnica: cy.sources.atlas.zona_geotecnica,
      dias_sin_agua_anual: cy.sources.sacmex.dias_sin_agua_anual,
      gtfs: cy.sources.gtfs,
    });
    expect(res.value).toBeGreaterThanOrEqual(60);
  });

  it('Iztapalapa Sur (IIIc + 85 días sin agua) → score <35', () => {
    const izta = CDMX_ZONES.find((z) => z.zona_name === 'Iztapalapa Sur');
    if (!izta) throw new Error('fixture missing');
    const res = computeN05Resilience({
      zona_geotecnica: izta.sources.atlas.zona_geotecnica,
      dias_sin_agua_anual: izta.sources.sacmex.dias_sin_agua_anual,
      gtfs: izta.sources.gtfs,
    });
    expect(res.value).toBeLessThan(35);
    expect(res.components.bucket).toBe('low');
  });

  it('16 zonas CDMX — snapshot', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; seismic: number; water: number; transit: number }
    > = {};
    for (const zone of CDMX_ZONES) {
      const res = computeN05Resilience({
        zona_geotecnica: zone.sources.atlas.zona_geotecnica,
        dias_sin_agua_anual: zone.sources.sacmex.dias_sin_agua_anual,
        gtfs: zone.sources.gtfs,
      });
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        seismic: res.components.seismic_score,
        water: res.components.water_score,
        transit: res.components.transit_score,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('n05.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n05.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
  });
});
