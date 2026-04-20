import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import n09, {
  computeN09Nightlife,
  getLabelKey,
  getRecommendationKeys,
  methodology,
  reasoning_template,
  version,
} from '../n09-nightlife-economy';

describe('N09 Nightlife Economy calculator', () => {
  it('declara version, methodology, reasoning + D1 recommendations', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toEqual(expect.arrayContaining(['denue', 'fgj']));
    expect(reasoning_template).toContain('{score_value}');
    for (const bucket of ['low', 'medium', 'high', 'insufficient_data'] as const) {
      expect(methodology.recommendations[bucket].length).toBeGreaterThan(0);
    }
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.n09.hub_nocturno');
    expect(getLabelKey(65, 'medium')).toBe('ie.score.n09.actividad_alta');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.n09.actividad_balanceada');
    expect(getLabelKey(20, 'low')).toBe('ie.score.n09.zona_dormitorio');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.n09.insufficient');
    expect(getRecommendationKeys(85, 'high')).toEqual(methodology.recommendations.high);
  });

  it('Roma Norte (340 gastro + 95 cultura) → score ≥70 hub nocturno', () => {
    const roma = CDMX_ZONES.find((z) => z.zona_name === 'Roma Norte');
    if (!roma) throw new Error('fixture missing');
    const res = computeN09Nightlife({
      by_macro_category: roma.sources.denue.by_macro_category,
      total_denue: roma.sources.denue.total,
      violentos_12m: roma.sources.fgj.by_categoria.violentos,
      count_12m_fgj: roma.sources.fgj.count_12m,
      hora_max_riesgo: roma.sources.fgj.hora_max_riesgo,
    });
    expect(res.value).toBeGreaterThanOrEqual(70);
  });

  it('Milpa Alta (zero nightlife) → score bajo', () => {
    const ma = CDMX_ZONES.find((z) => z.zona_name === 'Milpa Alta Centro');
    const roma = CDMX_ZONES.find((z) => z.zona_name === 'Roma Norte');
    if (!ma || !roma) throw new Error('fixtures missing');
    const resMA = computeN09Nightlife({
      by_macro_category: ma.sources.denue.by_macro_category,
      total_denue: ma.sources.denue.total,
      violentos_12m: ma.sources.fgj.by_categoria.violentos,
      count_12m_fgj: ma.sources.fgj.count_12m,
      hora_max_riesgo: ma.sources.fgj.hora_max_riesgo,
    });
    const resRoma = computeN09Nightlife({
      by_macro_category: roma.sources.denue.by_macro_category,
      total_denue: roma.sources.denue.total,
      violentos_12m: roma.sources.fgj.by_categoria.violentos,
      count_12m_fgj: roma.sources.fgj.count_12m,
      hora_max_riesgo: roma.sources.fgj.hora_max_riesgo,
    });
    expect(resMA.value).toBeLessThan(resRoma.value);
  });

  it('16 zonas CDMX — snapshot', () => {
    const snapshot: Record<
      string,
      {
        value: number;
        confidence: string;
        venues: number;
        density: number;
        safety: number;
      }
    > = {};
    for (const zone of CDMX_ZONES) {
      const res = computeN09Nightlife({
        by_macro_category: zone.sources.denue.by_macro_category,
        total_denue: zone.sources.denue.total,
        violentos_12m: zone.sources.fgj.by_categoria.violentos,
        count_12m_fgj: zone.sources.fgj.count_12m,
        hora_max_riesgo: zone.sources.fgj.hora_max_riesgo,
      });
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        venues: res.components.venues_count,
        density: res.components.density_score,
        safety: res.components.safety_night,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('n09.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await n09.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
  });
});
