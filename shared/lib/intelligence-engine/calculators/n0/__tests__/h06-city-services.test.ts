import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { isProvenanceValid } from '../../types';
import h06, { getLabelKey, methodology, reasoning_template, version } from '../h06-city-services';

describe('H06 City Services stub', () => {
  it('declara version semver', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('declara methodology + reasoning_template', () => {
    expect(methodology.sources).toContain('locatel_0311');
    expect(reasoning_template).toContain('{zona_name}');
  });

  it('getLabelKey siempre devuelve ie.score.h06.pending_h2', () => {
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.h06.pending_h2');
  });

  it('16 zonas CDMX — insufficient_data + score 0 + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    for (const zone of CDMX_ZONES) {
      const out = await h06.run(
        { zoneId: zone.zona_id, countryCode: 'MX', periodDate: '2026-04-01' },
        fakeSb,
      );
      expect(out.score_value, zone.zona_name).toBe(0);
      expect(out.confidence, zone.zona_name).toBe('insufficient_data');
      expect(out.score_label, zone.zona_name).toBe('ie.score.h06.pending_h2');
      expect(isProvenanceValid(out.provenance), zone.zona_name).toBe(true);
      expect(out.template_vars).toBeDefined();
    }
  });
});
