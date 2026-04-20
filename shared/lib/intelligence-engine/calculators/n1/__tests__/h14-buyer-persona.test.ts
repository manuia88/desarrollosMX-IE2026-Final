import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import h14, {
  computeH14BuyerPersona,
  getLabelKey,
  MIN_SIGNALS_TIER_3,
  methodology,
  PERSONA_CENTROIDS,
  PERSONA_IDS,
  reasoning_template,
  version,
} from '../h14-buyer-persona';

describe('H14 Buyer Persona calculator', () => {
  it('declara version, methodology, reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('wishlist');
    expect(methodology.sources).toContain('search_logs');
    expect(methodology.triggers_cascade).toContain('search_behavior');
    expect(methodology.tier_gate.min_signals).toBe(MIN_SIGNALS_TIER_3);
    expect(PERSONA_IDS.length).toBe(6);
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('getLabelKey mapea buckets confidence', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.h14.perfil_claro');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.h14.perfil_mixto');
    expect(getLabelKey(20, 'low')).toBe('ie.score.h14.perfil_difuso');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.h14.insufficient');
  });

  it('6 perfiles retornados + match_pct suma 100 (redondeo conservado)', () => {
    // Generar 20 señales de un user family-like
    const wishlist = Array.from({ length: 10 }, (_, i) => ({
      project_id: `p${i}`,
      recamaras: 3,
      precio: 4_500_000,
      amenidades: ['schools', 'parks', 'seguridad'],
    }));
    const searches = Array.from({ length: 10 }, (_, i) => ({
      filter_data: {
        recamaras: 3,
        precio_max: 5_000_000,
        amenidades: ['schools', 'parks'],
      },
      timestamp: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
    }));
    const res = computeH14BuyerPersona({
      user_id: 'user-family',
      wishlist_projects: wishlist,
      search_logs_last_90d: searches,
    });
    expect(res.components.perfiles.length).toBe(6);
    const total = res.components.perfiles.reduce((s, p) => s + p.match_pct, 0);
    expect(Number(total.toFixed(1))).toBeCloseTo(100, 1);
    // family debe ser el perfil dominante
    expect(res.components.perfil_dominante).toBe('family');
  });

  it('gating Tier 3 — <20 señales → insufficient_data', () => {
    const res = computeH14BuyerPersona({
      user_id: 'user-new',
      wishlist_projects: [{ project_id: 'p1', recamaras: 2, precio: 3_000_000 }],
      search_logs_last_90d: [{ filter_data: { recamaras: 2, precio_max: 3_000_000 } }],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.gated).toBe(true);
    expect(res.value).toBe(0);
    // aún así retorna los 6 perfiles preview
    expect(res.components.perfiles.length).toBe(6);
  });

  it('Polanco fixture — mezcla inversor + downsizer + second_home reproduce catálogo', () => {
    // Polanco: fuerte inversor (2 rec, precio alto, ROI) + downsizer (1-2 rec, mantenimiento_bajo)
    // + second_home (2-3 rec, lifestyle premium).
    // Generamos 25 señales representativas.
    const wishlist = [
      ...Array.from({ length: 8 }, (_, i) => ({
        project_id: `pol-inv-${i}`,
        recamaras: 2,
        precio: 7_000_000,
        amenidades: ['roi_high', 'rental_yield', 'lifestyle'],
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        project_id: `pol-ds-${i}`,
        recamaras: 2,
        precio: 8_500_000,
        amenidades: ['mantenimiento_bajo', 'seguridad', 'lifestyle'],
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        project_id: `pol-sh-${i}`,
        recamaras: 3,
        precio: 9_500_000,
        amenidades: ['lifestyle', 'amenities_premium'],
      })),
    ];
    const searches = Array.from({ length: 10 }, () => ({
      filter_data: {
        recamaras: 2,
        precio_max: 8_000_000,
        amenidades: ['lifestyle'],
      },
    }));
    const res = computeH14BuyerPersona({
      user_id: 'zone-polanco',
      wishlist_projects: wishlist,
      search_logs_last_90d: searches,
    });
    expect(res.components.gated).toBe(false);
    // Los 3 perfiles esperados deben estar en el top 4
    const top4 = res.components.perfiles.slice(0, 4).map((p) => p.id);
    expect(top4).toContain('inversor');
    const inversorMatch = res.components.perfiles.find((p) => p.id === 'inversor');
    const downsizerMatch = res.components.perfiles.find((p) => p.id === 'downsizer');
    const secondHomeMatch = res.components.perfiles.find((p) => p.id === 'second_home');
    expect(inversorMatch?.match_pct).toBeGreaterThan(5);
    expect(downsizerMatch?.match_pct).toBeGreaterThan(5);
    expect(secondHomeMatch?.match_pct).toBeGreaterThan(5);
    // Y perfiles obvios-no-aplicables están bajos
    const familyMatch = res.components.perfiles.find((p) => p.id === 'family');
    expect(familyMatch?.match_pct).toBeLessThan(inversorMatch?.match_pct ?? 0);
  });

  it('perfil claro — signals coherentes de un solo cluster → confidence_perfil alto', () => {
    const wishlist = Array.from({ length: 15 }, (_, i) => ({
      project_id: `dn-${i}`,
      recamaras: 1,
      precio: 3_500_000,
      amenidades: ['coworking', 'internet', 'ubicacion_central'],
    }));
    const searches = Array.from({ length: 10 }, () => ({
      filter_data: {
        recamaras: 1,
        precio_max: 4_000_000,
        amenidades: ['coworking', 'internet'],
      },
    }));
    const res = computeH14BuyerPersona({
      user_id: 'user-nomad',
      wishlist_projects: wishlist,
      search_logs_last_90d: searches,
    });
    expect(res.components.perfil_dominante).toBe('digital_nomad');
    expect(res.components.confidence_perfil).toBeGreaterThanOrEqual(70);
  });

  it('perfil difuso — signals mixtas → confidence_perfil bajo', () => {
    // Mezcla de signals contradictorias (family + inversor + digital_nomad).
    const wishlist = [
      { project_id: 'f1', recamaras: 3, precio: 4_500_000, amenidades: ['schools'] },
      { project_id: 'i1', recamaras: 2, precio: 4_000_000, amenidades: ['roi_high'] },
      { project_id: 'n1', recamaras: 1, precio: 3_500_000, amenidades: ['coworking'] },
      { project_id: 'f2', recamaras: 3, precio: 5_000_000, amenidades: ['parks'] },
      { project_id: 'i2', recamaras: 2, precio: 3_800_000, amenidades: ['rental_yield'] },
      { project_id: 'n2', recamaras: 1, precio: 4_200_000, amenidades: ['internet'] },
    ];
    const searches: Array<{ filter_data: { recamaras: number; precio_max: number } }> = Array.from(
      { length: 16 },
      (_, i) => ({
        filter_data: { recamaras: (i % 3) + 1, precio_max: 4_000_000 },
      }),
    );
    const res = computeH14BuyerPersona({
      user_id: 'user-mixto',
      wishlist_projects: wishlist,
      search_logs_last_90d: searches,
    });
    expect(res.components.gated).toBe(false);
    // margen relativamente pequeño → confidence_perfil medio-bajo
    expect(res.components.margin_top1_top2).toBeLessThan(0.4);
  });

  it('behavior_signals cuentan hacia signals_count (gate)', () => {
    const res = computeH14BuyerPersona({
      user_id: 'user-behavior',
      wishlist_projects: Array.from({ length: 5 }, (_, i) => ({
        project_id: `p${i}`,
        recamaras: 2,
        precio: 4_000_000,
      })),
      search_logs_last_90d: Array.from({ length: 5 }, () => ({
        filter_data: { recamaras: 2, precio_max: 4_000_000 },
      })),
      behavior_signals: {
        dwell_time_avg: 120,
        revisit_rate: 0.4,
        share_count: 15, // suma 15 + 2 = 17 extra
      },
    });
    expect(res.components.signals_count).toBeGreaterThanOrEqual(MIN_SIGNALS_TIER_3);
    expect(res.components.gated).toBe(false);
  });

  it('centroides — cada perfil tiene amenidad_vector que suma ~1.0', () => {
    for (const p of PERSONA_IDS) {
      const c = PERSONA_CENTROIDS[p];
      const sum = Object.values(c.amenidad_vector).reduce((s, v) => s + v, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    }
  });

  it('h14.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await h14.run(
      { userId: 'user-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.h14.insufficient');
  });
});
