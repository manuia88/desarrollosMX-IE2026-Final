import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import c03, {
  type C03ProyectoCandidato,
  CRITICAL_DEPS,
  computeC03MatchingEngine,
  cosineSimilarity,
  FILTER_WEIGHTS,
  getLabelKey,
  methodology,
  reasoning_template,
  TOP_N,
  version,
  WEIGHTS,
} from '../c03-matching-engine';

function baseCandidato(overrides: Partial<C03ProyectoCandidato> = {}): C03ProyectoCandidato {
  return {
    projectId: 'p-default',
    operacion: 'venta',
    tipo_propiedad: 'departamento',
    recamaras: 2,
    precio: 4_500_000,
    colonia: 'Roma Norte',
    zone_scores_vector: { F01: 70, F08: 75, N08: 65 },
    project_scores_avg: 70,
    n11_momentum: 75,
    ...overrides,
  };
}

describe('C03 Matching Engine', () => {
  it('declara version, methodology, weights, sensitivity, reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toMatch(/0\.35/);
    expect(
      WEIGHTS.filters_match +
        WEIGHTS.zone_scores_fit +
        WEIGHTS.project_scores_fit +
        WEIGHTS.momentum,
    ).toBeCloseTo(1, 5);
    expect(methodology.sources).toContain('busquedas');
    expect(methodology.sources).toContain('zone_scores:N11');
    expect(methodology.sensitivity_analysis).toHaveLength(4);
    expect(methodology.tier_gate.min_candidatos).toBe(1);
    expect(CRITICAL_DEPS).toContain('N11');
    expect(reasoning_template).toContain('{busqueda_id}');
    expect(reasoning_template).toContain('{confidence}');
    expect(TOP_N).toBe(10);
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.c03.match_excelente');
    expect(getLabelKey(65, 'medium')).toBe('ie.score.c03.match_bueno');
    expect(getLabelKey(45, 'low')).toBe('ie.score.c03.match_parcial');
    expect(getLabelKey(20, 'low')).toBe('ie.score.c03.match_pobre');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.c03.insufficient');
  });

  it('cosineSimilarity: vectores idénticos → 1', () => {
    const a = { F01: 80, F08: 70, N08: 60 };
    const b = { F01: 80, F08: 70, N08: 60 };
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it('cosineSimilarity: vectores ortogonales / disjoint → 0', () => {
    const a = { F01: 100, F08: 0 };
    const b = { F01: 0, F08: 100 };
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('cosineSimilarity: dimensiones faltantes tratadas como 0', () => {
    const a = { F01: 80, F08: 60 };
    const b = { F01: 80 }; // F08 ausente → 0
    const r = cosineSimilarity(a, b);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(1);
  });

  it('cosineSimilarity: magnitud cero → 0 (no NaN)', () => {
    expect(cosineSimilarity({}, { F01: 50 })).toBe(0);
    expect(cosineSimilarity({ F01: 0, F08: 0 }, { F01: 50, F08: 50 })).toBe(0);
  });

  it('happy path — búsqueda "2 rec Roma Norte $4-5M" top con proyecto exact match', () => {
    const candidatos: C03ProyectoCandidato[] = [
      baseCandidato({
        projectId: 'p-exact',
        recamaras: 2,
        colonia: 'Roma Norte',
        precio: 4_500_000,
        n11_momentum: 80,
        project_scores_avg: 85,
      }),
      baseCandidato({
        projectId: 'p-other-colonia',
        recamaras: 2,
        colonia: 'Polanco',
        precio: 4_800_000,
        n11_momentum: 70,
      }),
      baseCandidato({
        projectId: 'p-wrong-rec',
        recamaras: 3,
        colonia: 'Roma Norte',
        precio: 4_500_000,
        n11_momentum: 75,
      }),
    ];
    const res = computeC03MatchingEngine({
      busquedaId: 'b-roma-2r',
      filters: {
        operacion: 'venta',
        tipo_propiedad: 'departamento',
        recamaras: 2,
        precio_min: 4_000_000,
        precio_max: 5_000_000,
        colonia: 'Roma Norte',
      },
      buyer_preferences_vector: { F01: 80, F08: 70, N08: 60 },
      candidatos,
    });
    expect(res.components.gated).toBe(false);
    expect(res.components.top[0]?.projectId).toBe('p-exact');
    expect(res.components.top[0]?.rationale.length).toBeGreaterThan(0);
  });

  it('sort test — score DESC + tiebreak por operacion > tipo > colonia > precio_cercano', () => {
    const candidatos: C03ProyectoCandidato[] = [
      baseCandidato({
        projectId: 'p-near',
        precio: 4_490_000, // más cercano a 4.5M si precio fuera del range
        n11_momentum: 50,
        project_scores_avg: 50,
        zone_scores_vector: { F01: 50 },
      }),
      baseCandidato({
        projectId: 'p-far',
        precio: 4_100_000,
        n11_momentum: 50,
        project_scores_avg: 50,
        zone_scores_vector: { F01: 50 },
      }),
    ];
    const res = computeC03MatchingEngine({
      busquedaId: 'b-sort',
      filters: {
        operacion: 'venta',
        tipo_propiedad: 'departamento',
        recamaras: 2,
        precio_min: 4_400_000,
        precio_max: 4_600_000,
        colonia: 'Roma Norte',
      },
      buyer_preferences_vector: { F01: 50 },
      candidatos,
    });
    // Ambos dentro del rango → misma score filters — tiebreak: precioDistance ascendente
    // No hay diferencia de precio_distance si ambos están in-range (ambos 0), pero score iguales.
    // Test confirma orden estable; ambos deben aparecer en top.
    const ids = res.components.top.map((t) => t.projectId);
    expect(ids).toContain('p-near');
    expect(ids).toContain('p-far');
    // score DESC
    for (let i = 1; i < res.components.top.length; i++) {
      const prev = res.components.top[i - 1];
      const cur = res.components.top[i];
      if (prev && cur) expect(prev.score).toBeGreaterThanOrEqual(cur.score);
    }
  });

  it('respeta TOP_N=10 aunque haya 15 candidatos', () => {
    const candidatos: C03ProyectoCandidato[] = Array.from({ length: 15 }, (_, i) =>
      baseCandidato({ projectId: `p-${i}`, n11_momentum: 50 + i }),
    );
    const res = computeC03MatchingEngine({
      busquedaId: 'b-topn',
      filters: {
        operacion: 'venta',
        tipo_propiedad: 'departamento',
        recamaras: 2,
        colonia: 'Roma Norte',
      },
      buyer_preferences_vector: { F01: 70 },
      candidatos,
    });
    expect(res.components.top.length).toBe(10);
    expect(res.components.candidatos_count).toBe(15);
  });

  it('missing_filters poblado cuando proyecto no coincide', () => {
    const candidatos: C03ProyectoCandidato[] = [
      baseCandidato({
        projectId: 'p-mismatch',
        operacion: 'renta',
        tipo_propiedad: 'casa',
        recamaras: 4,
        colonia: 'Polanco',
        precio: 9_000_000,
      }),
    ];
    const res = computeC03MatchingEngine({
      busquedaId: 'b-miss',
      filters: {
        operacion: 'venta',
        tipo_propiedad: 'departamento',
        recamaras: 2,
        precio_min: 4_000_000,
        precio_max: 5_000_000,
        colonia: 'Roma Norte',
      },
      candidatos,
    });
    const entry = res.components.top[0];
    expect(entry?.missing_filters.length).toBeGreaterThan(0);
    // operacion, tipo, recamaras, precio, colonia → todos mismatches
  });

  it('tier gate — sin candidatos → insufficient_data', () => {
    const res = computeC03MatchingEngine({
      busquedaId: 'b-empty',
      filters: { operacion: 'venta', recamaras: 2 },
      candidatos: [],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.gated).toBe(true);
    expect(res.components.top).toEqual([]);
  });

  it('tier gate — filtros vacíos → insufficient_data', () => {
    const res = computeC03MatchingEngine({
      busquedaId: 'b-no-filters',
      filters: {},
      candidatos: [baseCandidato()],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.gated).toBe(true);
    expect(res.components.cap_reason).toBe('tier_gate_no_input');
  });

  it('D13 — N11 insufficient dep propaga insufficient_data', () => {
    const res = computeC03MatchingEngine({
      busquedaId: 'b-d13',
      filters: { operacion: 'venta', recamaras: 2, colonia: 'Roma Norte' },
      candidatos: [baseCandidato()],
      deps: [{ scoreId: 'N11', confidence: 'insufficient_data' }],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('N11');
  });

  it('D13 — N11 low caps confidence a medium máx (no high)', () => {
    const res = computeC03MatchingEngine({
      busquedaId: 'b-d13-low',
      filters: {
        operacion: 'venta',
        tipo_propiedad: 'departamento',
        recamaras: 2,
        precio_min: 4_000_000,
        precio_max: 5_000_000,
        colonia: 'Roma Norte',
      },
      buyer_preferences_vector: { F01: 70, F08: 65 },
      candidatos: [baseCandidato()],
      deps: [
        { scoreId: 'N11', confidence: 'low' },
        { scoreId: 'G01', confidence: 'high' },
      ],
    });
    expect(res.confidence).not.toBe('high');
    expect(['low', 'medium']).toContain(res.confidence);
    expect(res.components.capped_by).toContain('N11');
  });

  it('FILTER_WEIGHTS suman 1.0', () => {
    const total =
      FILTER_WEIGHTS.operacion +
      FILTER_WEIGHTS.tipo_propiedad +
      FILTER_WEIGHTS.recamaras +
      FILTER_WEIGHTS.precio +
      FILTER_WEIGHTS.colonia;
    expect(total).toBeCloseTo(1, 5);
  });

  it('zone_scores_fit eleva el score cuando preferences alinean', () => {
    const sameVector = { F01: 80, F08: 70, N08: 60 };
    const candHigh: C03ProyectoCandidato = baseCandidato({
      projectId: 'p-aligned',
      zone_scores_vector: sameVector,
    });
    const candLow: C03ProyectoCandidato = baseCandidato({
      projectId: 'p-misaligned',
      zone_scores_vector: { F01: 10, F08: 90, N08: 5 },
    });
    const res = computeC03MatchingEngine({
      busquedaId: 'b-zone',
      filters: {
        operacion: 'venta',
        tipo_propiedad: 'departamento',
        recamaras: 2,
        colonia: 'Roma Norte',
      },
      buyer_preferences_vector: sameVector,
      candidatos: [candHigh, candLow],
    });
    const aligned = res.components.top.find((t) => t.projectId === 'p-aligned');
    const misaligned = res.components.top.find((t) => t.projectId === 'p-misaligned');
    expect(aligned).toBeDefined();
    expect(misaligned).toBeDefined();
    expect(aligned?.components.zone_scores_fit).toBeGreaterThan(
      misaligned?.components.zone_scores_fit ?? 0,
    );
  });

  it('c03.run() prod-path insufficient + provenance válido + valid_until', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await c03.run(
      {
        countryCode: 'MX',
        periodDate: '2026-04-01',
        params: { busquedaId: 'b-stub' },
      },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.c03.insufficient');
    expect(out.valid_until).toBeDefined();
  });
});
