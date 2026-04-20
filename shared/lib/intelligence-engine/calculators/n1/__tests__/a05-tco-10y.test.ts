import { describe, expect, it } from 'vitest';
import {
  computeA05Tco10y,
  getLabelKey,
  methodology,
  TCO_ASSUMPTIONS,
  version,
} from '../a05-tco-10y';

describe('A05 TCO 10y', () => {
  const DEPTO_3M = {
    propertyValue: 3_000_000,
    downPayment: 600_000,
    loanYears: 20,
    predial_anual_2026_mxn: 15_000, // típico CDMX depto $3M
    macro: { tasa: 0.12, inflacion: 0.045 },
    plusvalia_10y_estimada_mxn: 1_900_000, // 5% anual 10y
  };

  it('declara methodology + assumptions', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('macro_series');
    expect(TCO_ASSUMPTIONS.mantenimiento_pct_anual).toBe(0.012);
    expect(TCO_ASSUMPTIONS.seguros_pct_anual).toBe(0.0045);
    expect(TCO_ASSUMPTIONS.comision_venta_pct).toBe(0.05);
    expect(TCO_ASSUMPTIONS.isr_utilidad_pct).toBe(0.25);
  });

  it('criterio plan: Depto $3M DP 20% hipoteca 20y → total_erogado ≈ $7M y TCO neto ≈ $5.1M − plusvalía', () => {
    const res = computeA05Tco10y(DEPTO_3M);
    // total_erogado: precio 3M + mens·120 (~3.17M) + pred·10 (150K) + mant (432K) + seg (135K)
    //                + comision (245K) + isr (340K) ≈ $7.47M
    // Si plusvalia = 1.9M → TCO neto ≈ 5.57M.
    // Plan dice "≈ $5.1M − plusvalía" — nuestra estructura reporta TCO NETO (post-plusvalía).
    expect(res.components.total_erogado_mxn).toBeGreaterThan(6_500_000);
    expect(res.components.total_erogado_mxn).toBeLessThan(8_500_000);
    expect(res.components.tco_neto_10y_mxn).toBeGreaterThan(4_500_000);
    expect(res.components.tco_neto_10y_mxn).toBeLessThan(7_000_000);
  });

  it('breakdown_por_ano tiene 10 entradas con campos completos', () => {
    const res = computeA05Tco10y(DEPTO_3M);
    expect(res.components.breakdown_por_ano).toHaveLength(10);
    for (const row of res.components.breakdown_por_ano) {
      expect(row.year).toBeGreaterThanOrEqual(1);
      expect(row.year).toBeLessThanOrEqual(10);
      expect(row.predial_mxn).toBeGreaterThan(0);
      expect(row.mantenimiento_mxn).toBeGreaterThan(0);
      expect(row.seguros_mxn).toBeGreaterThan(0);
    }
  });

  it('predial_10y = predial_anual · 10', () => {
    const res = computeA05Tco10y(DEPTO_3M);
    expect(res.components.total_predial_10y_mxn).toBe(150_000);
  });

  it('seguros_anual = propertyValue · 0.45% = 13,500', () => {
    const res = computeA05Tco10y(DEPTO_3M);
    expect(res.components.seguros_anual_mxn).toBe(13_500);
  });

  it('mantenimiento_mensual = propertyValue · 1.2% / 12 = 3,000', () => {
    const res = computeA05Tco10y(DEPTO_3M);
    expect(res.components.mantenimiento_mensual_mxn).toBe(3_000);
  });

  it('score 100 cuando plusvalía > total_erogado (TCO negativo)', () => {
    const res = computeA05Tco10y({
      ...DEPTO_3M,
      plusvalia_10y_estimada_mxn: 15_000_000, // absurdo alto
    });
    expect(res.value).toBe(100);
  });

  it('score ≈ 0 cuando TCO ≥ 2× precio (sin plusvalía)', () => {
    const res = computeA05Tco10y({
      ...DEPTO_3M,
      plusvalia_10y_estimada_mxn: 0,
    });
    // total_erogado con plusvalia 0 → sin ISR ni comision alta. TCO neto ~= total_erogado.
    // Depto 3M, TCO_neto ≈ 7M → ratio ~2.3 → score ~0.
    expect(res.value).toBeLessThanOrEqual(15);
  });

  it('D9 fallback: sin macro → confidence=medium', () => {
    const { macro: _unused, ...rest } = DEPTO_3M;
    const res = computeA05Tco10y(rest);
    expect(res.confidence).toBe('medium');
    expect(res.components.missing_dimensions).toContain('macro_series');
  });

  it('propertyValue 0 → insufficient_data', () => {
    const res = computeA05Tco10y({
      ...DEPTO_3M,
      propertyValue: 0,
      plusvalia_10y_estimada_mxn: 0,
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('getLabelKey A05 mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.a05.muy_eficiente');
    expect(getLabelKey(60, 'high')).toBe('ie.score.a05.eficiente');
    expect(getLabelKey(35, 'high')).toBe('ie.score.a05.costoso');
    expect(getLabelKey(10, 'high')).toBe('ie.score.a05.muy_costoso');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.a05.insufficient');
  });

  it('total_recuperado_plusvalia = plusvalia_10y_estimada_mxn', () => {
    const res = computeA05Tco10y(DEPTO_3M);
    expect(res.components.total_recuperado_plusvalia_mxn).toBe(1_900_000);
  });
});
