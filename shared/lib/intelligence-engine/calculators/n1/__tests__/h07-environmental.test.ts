import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import h07, {
  computeH07Environmental,
  DEFAULT_WEIGHTS,
  getLabelKey,
  type H07RawInput,
  methodology,
  reasoning_template,
  version,
} from '../h07-environmental';

describe('H07 Environmental (N1) calculator', () => {
  it('declara version/methodology/reasoning_template shape', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toMatch(/F04/);
    expect(methodology.dependencies).toEqual([
      { score_id: 'F04', weight: 1.0, role: 'air_quality' },
    ]);
    expect(methodology.validity.unit).toBe('days');
    expect(methodology.validity.value).toBe(30);
    expect(methodology.h2_roadmap).toContain('sedema_parques_oficial');
    expect(methodology.h2_roadmap).toContain('paot_denuncias');
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
    expect(DEFAULT_WEIGHTS.F04).toBe(1.0);
  });

  it('getLabelKey mapea umbrales correctamente', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.h07.excelente');
    expect(getLabelKey(60, 'high')).toBe('ie.score.h07.buena');
    expect(getLabelKey(40, 'medium')).toBe('ie.score.h07.moderada');
    expect(getLabelKey(20, 'low')).toBe('ie.score.h07.contaminada');
    expect(getLabelKey(80, 'insufficient_data')).toBe('ie.score.h07.insufficient');
  });

  it('H1 passthrough: solo F04 → score=F04', () => {
    const res = computeH07Environmental({ F04: 85 });
    expect(res.value).toBe(85);
    expect(res.components.blend_mode).toBe('f04_only');
    expect(res.components.f04_value).toBe(85);
    expect(res.components.parques_densidad).toBeNull();
  });

  it('blend: F04 + parques_densidad → 0.8·F04 + 0.2·parques', () => {
    // F04=80, parques=90 → 0.8·80 + 0.2·90 = 64 + 18 = 82.
    const res = computeH07Environmental({ F04: 80, parques_densidad: 90 });
    expect(res.value).toBe(82);
    expect(res.components.blend_mode).toBe('f04_plus_parques');
    expect(res.components.parques_densidad).toBe(90);
  });

  it('criterio done: Chapultepec → score >=75 (F04=85 + parques saturados=100)', () => {
    // F04=85 + parques_densidad=100 → 0.8·85 + 0.2·100 = 68 + 20 = 88.
    const res = computeH07Environmental({ F04: 85, parques_densidad: 100 });
    expect(res.value).toBeGreaterThanOrEqual(75);
    expect(res.confidence).not.toBe('insufficient_data');
    expect(res.components.blend_mode).toBe('f04_plus_parques');
  });

  it('F04 missing → insufficient_data + value=0', () => {
    const res = computeH07Environmental({ F04: null });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.missing_dimensions).toContain('F04');
    expect(res.components.dims_usadas).toBe(0);
    expect(res.components.dims_total).toBe(1);
  });

  it('F04 missing aunque parques disponibles → H1 insufficient (parques no basta solo)', () => {
    const res = computeH07Environmental({ F04: null, parques_densidad: 80 });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
  });

  it('confidence derivado de F04 (composeConfidence)', () => {
    const high = computeH07Environmental({ F04: 70, confidences: { F04: 'high' } });
    expect(high.confidence).toBe('high');
    const low = computeH07Environmental({ F04: 70, confidences: { F04: 'low' } });
    expect(low.confidence).toBe('low');
    const med = computeH07Environmental({ F04: 70, confidences: { F04: 'medium' } });
    expect(med.confidence).toBe('medium');
  });

  it('clamp 0-100: F04=120 o -5 → clamp', () => {
    const hi = computeH07Environmental({ F04: 120 });
    expect(hi.value).toBeLessThanOrEqual(100);
    const lo = computeH07Environmental({ F04: -5 });
    expect(lo.value).toBeGreaterThanOrEqual(0);
  });

  it('weightsOverride aplica sin romper passthrough', () => {
    // Override con F04 peso diferente: H1 sigue passthrough F04 (override no cambia fórmula).
    const res = computeH07Environmental({ F04: 60 }, { weightsOverride: { F04: 1.0 } });
    expect(res.value).toBe(60);
  });

  it('snapshot: escenarios múltiples zonales', () => {
    const scenarios: Record<string, H07RawInput> = {
      chapultepec_excelente: { F04: 85, parques_densidad: 100 },
      polanco_buena: { F04: 75, parques_densidad: 65 },
      del_valle_media: { F04: 55 },
      iztapalapa_contaminada: { F04: 25 },
      xochimilco_parques_air_regular: { F04: 50, parques_densidad: 90 },
      f04_missing: { F04: null },
    };
    const snapshot: Record<
      string,
      { value: number; confidence: string; label: string; blend: string }
    > = {};
    for (const [name, input] of Object.entries(scenarios)) {
      const res = computeH07Environmental(input);
      snapshot[name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
        blend: res.components.blend_mode,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('h07.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const out = await h07.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.h07.insufficient');
  });
});
