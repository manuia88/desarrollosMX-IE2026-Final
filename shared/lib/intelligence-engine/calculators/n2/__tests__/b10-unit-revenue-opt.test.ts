import { describe, expect, it } from 'vitest';
import type { B10UnidadInput } from '../b10-unit-revenue-opt';
import {
  AMENITY_INCLUSIONS,
  CRITICAL_DEPS,
  computeB10UnitRevenueOpt,
  getLabelKey,
  methodology,
  PAYMENT_SCHEMES,
  PRICE_DELTAS,
  version,
} from '../b10-unit-revenue-opt';

function makeUnit(id: string, precio: number, leadScore: number, pmf = 70): B10UnidadInput {
  return { unidadId: id, precio_actual: precio, lead_score_c01: leadScore, pmf_score_b04: pmf };
}

describe('B10 Unit Revenue Optimization', () => {
  it('declara methodology + sensitivity_analysis + critical deps', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('project_scores:C01');
    expect(methodology.sources).toContain('project_scores:B03');
    expect(methodology.sensitivity_analysis.length).toBe(4);
    expect(methodology.sensitivity_analysis.map((s) => s.dimension_id)).toContain('C01');
    expect(CRITICAL_DEPS).toEqual(expect.arrayContaining(['C01', 'B03']));
    expect(PRICE_DELTAS.length).toBe(3);
    expect(PAYMENT_SCHEMES.length).toBe(3);
    expect(AMENITY_INCLUSIONS.length).toBe(3);
    expect(methodology.dependencies.find((d) => d.score_id === 'C01')?.critical).toBe(true);
  });

  it('happy path: 5 unidades hot lead C01=85 → cada una tiene combo óptimo + lift>0', () => {
    const res = computeB10UnitRevenueOpt({
      projectId: 'p-1',
      unidades: Array.from({ length: 5 }, (_, i) => makeUnit(`u${i}`, 5_000_000, 85)),
    });
    expect(res.components.unidades).toHaveLength(5);
    for (const r of res.components.unidades) {
      expect(r.mejor_combo).toBeDefined();
      expect(r.mejor_combo.ingreso_esperado).toBeGreaterThan(0);
      expect(r.lift_pct).toBeGreaterThanOrEqual(0);
    }
  });

  it('cold lead C01=20 → combo óptimo tiende a bajar precio o incluir amenidades', () => {
    const res = computeB10UnitRevenueOpt({
      projectId: 'p-2',
      unidades: [makeUnit('u1', 5_000_000, 20)],
    });
    const combo = res.components.unidades[0]?.mejor_combo;
    expect(combo).toBeDefined();
    if (!combo) return;
    // Con prob baja, el optimizer tiende a subsidios (amenidad) o bajada de precio.
    const subsidio = combo.amenidades !== 'ninguna' || combo.delta_pct < 0;
    expect(subsidio).toBe(true);
  });

  it('mejor_combo siempre domina baseline (ingreso ≥ baseline)', () => {
    const res = computeB10UnitRevenueOpt({
      projectId: 'p-3',
      unidades: [makeUnit('u1', 5_000_000, 70)],
    });
    const u = res.components.unidades[0];
    expect(u).toBeDefined();
    if (!u) return;
    expect(u.mejor_combo.ingreso_esperado).toBeGreaterThanOrEqual(u.baseline_ingreso_esperado);
    expect(u.lift_pct).toBeGreaterThanOrEqual(0);
  });

  it('top_unidad_id identifica unidad con lift máximo', () => {
    const res = computeB10UnitRevenueOpt({
      projectId: 'p-4',
      unidades: [
        makeUnit('bajo', 5_000_000, 85, 90),
        makeUnit('medio', 5_000_000, 60, 70),
        makeUnit('top', 5_000_000, 30, 40),
      ],
    });
    expect(res.components.top_unidad_id).toBeDefined();
    const top = res.components.unidades.find((u) => u.unidadId === res.components.top_unidad_id);
    for (const other of res.components.unidades) {
      expect(top?.lift_pct).toBeGreaterThanOrEqual(other.lift_pct);
    }
  });

  it('mejor_combo respeta dominios válidos', () => {
    const res = computeB10UnitRevenueOpt({
      projectId: 'p-5',
      unidades: [makeUnit('u1', 5_000_000, 70)],
    });
    const combo = res.components.unidades[0]?.mejor_combo;
    expect(combo).toBeDefined();
    if (!combo) return;
    expect(PRICE_DELTAS).toContain(combo.delta_pct as (typeof PRICE_DELTAS)[number]);
    expect(PAYMENT_SCHEMES).toContain(combo.esquema_pago);
    expect(AMENITY_INCLUSIONS).toContain(combo.amenidades);
    expect(combo.prob_venta).toBeGreaterThanOrEqual(0);
    expect(combo.prob_venta).toBeLessThanOrEqual(1);
  });

  it('insufficient_data si no hay unidades', () => {
    const res = computeB10UnitRevenueOpt({ projectId: 'p-0', unidades: [] });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.cap_reason).toBe('no_unidades');
    expect(res.value).toBe(0);
  });

  it('D13: C01 insufficient → propaga insufficient_data', () => {
    const res = computeB10UnitRevenueOpt({
      projectId: 'p-6',
      unidades: [makeUnit('u1', 5_000_000, 70)],
      deps: [
        { scoreId: 'C01', confidence: 'insufficient_data' },
        { scoreId: 'B03', confidence: 'high' },
      ],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('C01');
  });

  it('D13: B03 low caps composite', () => {
    const res = computeB10UnitRevenueOpt({
      projectId: 'p-7',
      unidades: Array.from({ length: 12 }, (_, i) => makeUnit(`u${i}`, 5_000_000, 70)),
      deps: [
        { scoreId: 'C01', confidence: 'high' },
        { scoreId: 'B03', confidence: 'low' },
      ],
    });
    expect(res.confidence).not.toBe('high');
    expect(res.components.capped_by).toContain('B03');
  });

  it('lift_total_mxn es suma absoluta de lifts por unidad', () => {
    const res = computeB10UnitRevenueOpt({
      projectId: 'p-8',
      unidades: [makeUnit('u1', 5_000_000, 70), makeUnit('u2', 5_000_000, 70)],
    });
    let sum = 0;
    for (const u of res.components.unidades)
      sum += u.mejor_combo.ingreso_esperado - u.baseline_ingreso_esperado;
    expect(res.components.lift_total_mxn).toBeCloseTo(sum, 0);
  });

  it('getLabelKey B10 mapea umbrales', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.b10.lift_alto');
    expect(getLabelKey(40, 'medium')).toBe('ie.score.b10.lift_medio');
    expect(getLabelKey(15, 'low')).toBe('ie.score.b10.lift_bajo');
    expect(getLabelKey(0, 'medium')).toBe('ie.score.b10.sin_lift');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.b10.insufficient');
  });
});
