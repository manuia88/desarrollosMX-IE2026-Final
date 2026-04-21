import { describe, expect, it } from 'vitest';
import type { B03UnidadInput } from '../b03-pricing-autopilot';
import {
  CRITICAL_DEPS,
  computeB03PricingAutopilot,
  getLabelKey,
  methodology,
  THRESHOLDS,
  version,
} from '../b03-pricing-autopilot';

function makeUnit(id: string, precio: number, dias: number, absorcion: number): B03UnidadInput {
  return {
    unidadId: id,
    precio_actual: precio,
    dias_en_mercado: dias,
    absorcion_mensual: absorcion,
  };
}

describe('B03 Pricing Autopilot', () => {
  it('declara methodology + sensitivity_analysis + critical deps', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('project_scores:A12');
    expect(methodology.sources).toContain('zone_scores:B08');
    expect(methodology.sensitivity_analysis.length).toBeGreaterThan(0);
    expect(methodology.sensitivity_analysis.map((s) => s.dimension_id)).toContain('A12');
    expect(CRITICAL_DEPS).toContain('A12');
    expect(CRITICAL_DEPS).toContain('B08');
    expect(methodology.dependencies.find((d) => d.score_id === 'A12')?.critical).toBe(true);
  });

  it('stale + low absorption → sugiere bajada en rango [-8%, -3%]', () => {
    const res = computeB03PricingAutopilot({
      projectId: 'p-1',
      unidades: [makeUnit('u1', 5_000_000, 120, 0.5)],
      momentum_zona: 50,
    });
    const s = res.components.unidades[0];
    expect(s).toBeDefined();
    if (!s) return;
    expect(s.accion).toBe('bajar');
    expect(s.delta_pct).toBeLessThanOrEqual(THRESHOLDS.delta_bajada_min_pct);
    expect(s.delta_pct).toBeGreaterThanOrEqual(THRESHOLDS.delta_bajada_max_pct);
    expect(s.precio_sugerido).toBeLessThan(s.precio_actual);
  });

  it('20 unidades con 120d mercado & absorción 0.5 → bajada promedio ≈ −5%', () => {
    const unidades = Array.from({ length: 20 }, (_, i) => makeUnit(`u${i}`, 5_000_000, 120, 0.5));
    const res = computeB03PricingAutopilot({
      projectId: 'p-2',
      unidades,
      momentum_zona: 50,
    });
    expect(res.components.bajadas_count).toBe(20);
    expect(res.components.delta_avg_pct).toBeLessThan(0);
    expect(res.components.delta_avg_pct).toBeGreaterThanOrEqual(-8);
    expect(res.components.delta_avg_pct).toBeLessThanOrEqual(-3);
  });

  it('demanda alta + momentum positivo → sugiere subida +2% a +5%', () => {
    const res = computeB03PricingAutopilot({
      projectId: 'p-3',
      unidades: [makeUnit('u1', 5_000_000, 30, 4)],
      momentum_zona: 75,
      demanda_alta: true,
    });
    const s = res.components.unidades[0];
    expect(s).toBeDefined();
    if (!s) return;
    expect(s.accion).toBe('subir');
    expect(s.delta_pct).toBeGreaterThanOrEqual(THRESHOLDS.delta_subida_min_pct);
    expect(s.delta_pct).toBeLessThanOrEqual(THRESHOLDS.delta_subida_max_pct);
    expect(s.precio_sugerido).toBeGreaterThan(s.precio_actual);
  });

  it('métricas neutras → mantener (delta 0%)', () => {
    const res = computeB03PricingAutopilot({
      projectId: 'p-4',
      unidades: [makeUnit('u1', 5_000_000, 45, 2)],
      momentum_zona: 50,
      demanda_alta: false,
    });
    const s = res.components.unidades[0];
    expect(s).toBeDefined();
    if (!s) return;
    expect(s.accion).toBe('mantener');
    expect(s.delta_pct).toBe(0);
    expect(s.precio_sugerido).toBe(s.precio_actual);
  });

  it('boundary: días=90 exactos NO dispara bajada (strict >)', () => {
    const res = computeB03PricingAutopilot({
      projectId: 'p-5',
      unidades: [makeUnit('u1', 5_000_000, 90, 0.5)],
      momentum_zona: 50,
    });
    expect(res.components.unidades[0]?.accion).toBe('mantener');
  });

  it('insufficient_data si no hay unidades', () => {
    const res = computeB03PricingAutopilot({
      projectId: 'p-0',
      unidades: [],
      momentum_zona: 70,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.cap_reason).toBe('no_unidades');
  });

  it('D13: A12 insufficient propaga insufficient al pricing', () => {
    const res = computeB03PricingAutopilot({
      projectId: 'p-6',
      unidades: [makeUnit('u1', 5_000_000, 30, 2)],
      momentum_zona: 50,
      deps: [
        { scoreId: 'A12', confidence: 'insufficient_data' },
        { scoreId: 'B08', confidence: 'high' },
      ],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('A12');
  });

  it('D13: B08 low cap composite confidence', () => {
    const res = computeB03PricingAutopilot({
      projectId: 'p-7',
      unidades: Array.from({ length: 12 }, (_, i) => makeUnit(`u${i}`, 5_000_000, 30, 2)),
      momentum_zona: 50,
      deps: [
        { scoreId: 'A12', confidence: 'high' },
        { scoreId: 'B08', confidence: 'low' },
      ],
    });
    expect(res.confidence).not.toBe('high');
    expect(res.components.capped_by).toContain('B08');
  });

  it('mix unidades: 5 stale bajan + 3 hot suben + 2 hold', () => {
    const unidades: B03UnidadInput[] = [
      ...Array.from({ length: 5 }, (_, i) => makeUnit(`stale${i}`, 5_000_000, 120, 0.5)),
      ...Array.from({ length: 3 }, (_, i) => makeUnit(`hot${i}`, 5_000_000, 30, 4)),
      ...Array.from({ length: 2 }, (_, i) => makeUnit(`hold${i}`, 5_000_000, 45, 2)),
    ];
    const res = computeB03PricingAutopilot({
      projectId: 'p-8',
      unidades,
      momentum_zona: 75,
      demanda_alta: true,
    });
    expect(res.components.bajadas_count).toBe(5);
    expect(res.components.subidas_count).toBe(3);
    expect(res.components.hold_count).toBe(2);
    expect(res.components.unidades_count).toBe(10);
  });

  it('rationale string incluye métricas del ajuste', () => {
    const res = computeB03PricingAutopilot({
      projectId: 'p-9',
      unidades: [makeUnit('u1', 5_000_000, 150, 0.3)],
      momentum_zona: 50,
    });
    const r = res.components.unidades[0]?.rationale ?? '';
    expect(r).toMatch(/150/);
    expect(r).toMatch(/ajuste/);
  });

  it('getLabelKey B03 mapea umbrales', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.b03.saludable');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.b03.ajustes_menores');
    expect(getLabelKey(30, 'low')).toBe('ie.score.b03.requiere_accion');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.b03.insufficient');
  });
});
