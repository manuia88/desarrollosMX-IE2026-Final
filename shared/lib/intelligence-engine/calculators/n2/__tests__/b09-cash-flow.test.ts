import { describe, expect, it } from 'vitest';
import {
  CRITICAL_DEPS,
  computeB09CashFlow,
  getLabelKey,
  HORIZON_MONTHS,
  methodology,
  version,
} from '../b09-cash-flow';

function flatCostos(total: number, months = HORIZON_MONTHS): number[] {
  return Array.from({ length: months }, () => total / months);
}

describe('B09 Cash Flow', () => {
  it('declara methodology + 24m horizon + sensitivity_analysis', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(HORIZON_MONTHS).toBe(24);
    expect(methodology.sources).toContain('project_scores:B08');
    expect(methodology.sources).toContain('project_scores:B12');
    expect(methodology.sensitivity_analysis.length).toBe(4);
    expect(methodology.sensitivity_analysis.map((s) => s.dimension_id)).toContain('B08');
    expect(CRITICAL_DEPS).toEqual(expect.arrayContaining(['B08', 'B12']));
    expect(methodology.dependencies.find((d) => d.score_id === 'B08')?.critical).toBe(true);
  });

  it('happy path: 100 unidades @ 5M MXN, absorción 5/mes, split 20/80 → genera 24 meses', () => {
    const res = computeB09CashFlow({
      projectId: 'p-1',
      unidades_totales: 100,
      precio_promedio: 5_000_000,
      absorcion_mensual: 5,
      payment_split: {
        schedule: [0.2, ...Array(17).fill(0), 0.8, ...Array(5).fill(0)],
      },
      costos_construccion_mensuales: flatCostos(200_000_000),
      amortizacion_terreno_mensual: 500_000,
      gastos_fijos_mensuales: 200_000,
    });
    expect(res.components.flujo_mensual).toHaveLength(24);
    expect(res.components.total_ingresos).toBeGreaterThan(0);
    expect(res.components.total_egresos).toBeGreaterThan(0);
  });

  it('breakeven_month definido cuando cumulative se vuelve positivo', () => {
    // Muchos ingresos mes 1 (split 100% enganche), bajos costos.
    const res = computeB09CashFlow({
      projectId: 'p-2',
      unidades_totales: 20,
      precio_promedio: 5_000_000,
      absorcion_mensual: 10,
      payment_split: { schedule: [1.0, ...Array(23).fill(0)] },
      costos_construccion_mensuales: flatCostos(10_000_000),
      amortizacion_terreno_mensual: 100_000,
      gastos_fijos_mensuales: 50_000,
    });
    expect(res.components.breakeven_month).not.toBeNull();
    expect(res.components.cumulative_final).toBeGreaterThan(0);
    expect(res.value).toBeGreaterThan(0);
  });

  it('proyecto quema caja (cumulative final <=0) → score 0', () => {
    const res = computeB09CashFlow({
      projectId: 'p-3',
      unidades_totales: 5,
      precio_promedio: 1_000_000,
      absorcion_mensual: 0.1,
      payment_split: { schedule: [1.0, ...Array(23).fill(0)] },
      costos_construccion_mensuales: flatCostos(500_000_000),
      amortizacion_terreno_mensual: 10_000_000,
      gastos_fijos_mensuales: 5_000_000,
    });
    expect(res.components.cumulative_final).toBeLessThanOrEqual(0);
    expect(res.value).toBe(0);
  });

  it('peak_negative rastrea punto más bajo del cumulative', () => {
    const res = computeB09CashFlow({
      projectId: 'p-4',
      unidades_totales: 100,
      precio_promedio: 5_000_000,
      absorcion_mensual: 5,
      payment_split: { schedule: Array(24).fill(1 / 24) },
      costos_construccion_mensuales: flatCostos(300_000_000),
      amortizacion_terreno_mensual: 1_000_000,
      gastos_fijos_mensuales: 500_000,
    });
    expect(res.components.peak_negative).toBeLessThanOrEqual(0);
    expect(res.components.peak_negative_month).toBeGreaterThanOrEqual(0);
    expect(res.components.peak_negative_month).toBeLessThan(24);
  });

  it('cumulative es monotónico suma de flujo_neto', () => {
    const res = computeB09CashFlow({
      projectId: 'p-5',
      unidades_totales: 50,
      precio_promedio: 4_000_000,
      absorcion_mensual: 2,
      payment_split: { schedule: [0.3, ...Array(17).fill(0), 0.7, ...Array(5).fill(0)] },
      costos_construccion_mensuales: flatCostos(80_000_000),
      amortizacion_terreno_mensual: 300_000,
      gastos_fijos_mensuales: 150_000,
    });
    let cumAccum = 0;
    for (const f of res.components.flujo_mensual) {
      cumAccum += f.flujo_neto;
      expect(f.cumulative).toBeCloseTo(cumAccum, 0);
    }
  });

  it('insufficient_data si payment_split no suma 1.0 (±5%)', () => {
    const res = computeB09CashFlow({
      projectId: 'p-6',
      unidades_totales: 50,
      precio_promedio: 4_000_000,
      absorcion_mensual: 2,
      payment_split: { schedule: [0.3, 0.3, ...Array(22).fill(0)] },
      costos_construccion_mensuales: flatCostos(80_000_000),
      amortizacion_terreno_mensual: 300_000,
      gastos_fijos_mensuales: 150_000,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.missing_dimensions).toContain('payment_split_invalid_sum');
  });

  it('insufficient si B12 costos vacíos', () => {
    const res = computeB09CashFlow({
      projectId: 'p-7',
      unidades_totales: 50,
      precio_promedio: 4_000_000,
      absorcion_mensual: 2,
      payment_split: { schedule: [1.0, ...Array(23).fill(0)] },
      costos_construccion_mensuales: [],
      amortizacion_terreno_mensual: 300_000,
      gastos_fijos_mensuales: 150_000,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.missing_dimensions).toContain('B12_costos');
  });

  it('D13: B08 insufficient dep → propaga insufficient', () => {
    const res = computeB09CashFlow({
      projectId: 'p-8',
      unidades_totales: 50,
      precio_promedio: 4_000_000,
      absorcion_mensual: 2,
      payment_split: { schedule: [0.2, ...Array(17).fill(0), 0.8, ...Array(5).fill(0)] },
      costos_construccion_mensuales: flatCostos(80_000_000),
      amortizacion_terreno_mensual: 300_000,
      gastos_fijos_mensuales: 150_000,
      deps: [
        { scoreId: 'B08', confidence: 'insufficient_data' },
        { scoreId: 'B12', confidence: 'high' },
      ],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('B08');
  });

  it('D13: B12 low cap composite', () => {
    const res = computeB09CashFlow({
      projectId: 'p-9',
      unidades_totales: 50,
      precio_promedio: 4_000_000,
      absorcion_mensual: 2,
      payment_split: { schedule: [0.2, ...Array(17).fill(0), 0.8, ...Array(5).fill(0)] },
      costos_construccion_mensuales: flatCostos(80_000_000),
      amortizacion_terreno_mensual: 300_000,
      gastos_fijos_mensuales: 150_000,
      deps: [
        { scoreId: 'B08', confidence: 'high' },
        { scoreId: 'B12', confidence: 'low' },
      ],
    });
    expect(res.confidence).not.toBe('high');
    expect(res.components.capped_by).toContain('B12');
  });

  it('getLabelKey B09 mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.b09.breakeven_rapido');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.b09.breakeven_moderado');
    expect(getLabelKey(25, 'low')).toBe('ie.score.b09.breakeven_tardio');
    expect(getLabelKey(0, 'medium')).toBe('ie.score.b09.no_breakeven');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.b09.insufficient');
  });
});
