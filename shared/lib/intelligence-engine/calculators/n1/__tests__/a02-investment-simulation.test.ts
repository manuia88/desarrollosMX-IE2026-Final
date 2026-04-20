import { describe, expect, it } from 'vitest';
import {
  ASSUMPTIONS,
  computeA02InvestmentSimulation,
  computeIRR,
  getLabelKey,
  MACRO_BASELINE_TASA,
  methodology,
  monthlyPayment,
  remainingLoanBalance,
  version,
} from '../a02-investment-simulation';

describe('A02 Investment Simulation — helpers financieros', () => {
  it('declara methodology + assumptions', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('macro_series');
    expect(ASSUMPTIONS.IVA_pct).toBe(0.16);
    expect(ASSUMPTIONS.ISR_utilidad_pct).toBe(0.25);
    expect(ASSUMPTIONS.comision_venta_pct).toBe(0.05);
    expect(ASSUMPTIONS.plusvalia_exento_primera_venta).toBe(true);
  });

  it('monthlyPayment: $2.4M @ 12% 20y ≈ $26,430 MXN/mes', () => {
    // loan $2.4M (property 3M DP 20%), r=0.12, n=240
    const pmt = monthlyPayment(2_400_000, 0.12, 20);
    expect(pmt).toBeGreaterThan(26_000);
    expect(pmt).toBeLessThan(27_000);
  });

  it('monthlyPayment: rate 0 → linear amortización', () => {
    const pmt = monthlyPayment(1_200_000, 0, 10);
    expect(pmt).toBeCloseTo(10_000, 0); // 1.2M / 120 meses
  });

  it('remainingLoanBalance: después de pagar todos los meses → 0', () => {
    const bal = remainingLoanBalance(1_000_000, 0.1, 10, 120);
    expect(bal).toBeLessThan(1); // tolerancia de redondeo
  });

  it('remainingLoanBalance: saldo a mitad de camino > 50% del loan (intereses front-loaded)', () => {
    const bal = remainingLoanBalance(1_000_000, 0.12, 20, 120);
    // A 10/20 años con tasa 12% el saldo típicamente es >60% por amortización francesa
    expect(bal).toBeGreaterThan(600_000);
    expect(bal).toBeLessThan(800_000);
  });

  it('computeIRR: flujos simples 10% → IRR ≈ 0.1', () => {
    // Inversión $1000, recibe $100/año 10y, devolución $1000 al año 10
    const flows = [-1000, 100, 100, 100, 100, 100, 100, 100, 100, 100, 1100];
    const irr = computeIRR(flows);
    expect(irr).toBeCloseTo(0.1, 2);
  });

  it('computeIRR: todos los flujos positivos después del inicial neg → IRR positivo', () => {
    const flows = [-1000, 500, 500, 500];
    const irr = computeIRR(flows);
    expect(irr).toBeGreaterThan(0.2);
  });
});

describe('A02 Investment Simulation — escenarios', () => {
  const PROP_3M = {
    propertyValue: 3_000_000,
    downPayment: 600_000, // 20%
    loanYears: 20,
    macro: { tasa_hipotecaria_avg: 0.12, tiie28: 0.11 },
    momentum: { p10: 0.0, p25: 0.03, p50: 0.05, p75: 0.08 },
  };

  it('criterio plan: Depto $3M DP 20% 20y → stress IRR <0%, optimista IRR ≥8%', () => {
    const res = computeA02InvestmentSimulation(PROP_3M);
    expect(res.components.escenarios.stress.irr_10y_pct).toBeLessThan(0);
    expect(res.components.escenarios.optimista.irr_10y_pct).toBeGreaterThanOrEqual(8);
  });

  it('valor_apreciado_10y base = propertyValue · (1+p50)^10 ≈ 4.88M @ 5%', () => {
    const res = computeA02InvestmentSimulation(PROP_3M);
    const expected = 3_000_000 * 1.05 ** 10;
    expect(res.components.escenarios.base.valor_apreciado_10y_mxn).toBeCloseTo(expected, -3);
  });

  it('cashflow_mensual base: renta 15K − mensualidad ~26.4K → ~−11.4K', () => {
    const res = computeA02InvestmentSimulation(PROP_3M);
    // 3M · 0.005 = 15000 renta. Mensualidad ~26,430 a 12% 20y.
    expect(res.components.escenarios.base.renta_mensual_estimada_mxn).toBe(15_000);
    expect(res.components.escenarios.base.cashflow_mensual_mxn).toBeLessThan(-10_000);
    expect(res.components.escenarios.base.cashflow_mensual_mxn).toBeGreaterThan(-13_000);
  });

  it('4 escenarios presentes con tasas diferenciadas', () => {
    const res = computeA02InvestmentSimulation(PROP_3M);
    const e = res.components.escenarios;
    expect(e.optimista.tasa_hipotecaria_pct).toBeLessThan(e.base.tasa_hipotecaria_pct);
    expect(e.conservador.tasa_hipotecaria_pct).toBeGreaterThan(e.base.tasa_hipotecaria_pct);
    expect(e.stress.tasa_hipotecaria_pct).toBeGreaterThan(e.conservador.tasa_hipotecaria_pct);
  });

  it('assumptions viene en components con los 4 valores', () => {
    const res = computeA02InvestmentSimulation(PROP_3M);
    expect(res.components.assumptions.IVA_pct).toBe(0.16);
    expect(res.components.assumptions.ISR_utilidad_pct).toBe(0.25);
    expect(res.components.assumptions.comision_venta_pct).toBe(0.05);
    expect(res.components.assumptions.plusvalia_exento_primera_venta).toBe(true);
  });

  it('D9 fallback: sin macro + sin momentum → confidence=low + missing_dimensions', () => {
    const res = computeA02InvestmentSimulation({
      propertyValue: 3_000_000,
      downPayment: 600_000,
      loanYears: 20,
    });
    expect(res.confidence).toBe('low');
    expect(res.components.missing_dimensions).toContain('N11_momentum');
    expect(res.components.missing_dimensions).toContain('macro_series');
    // Aún devuelve escenarios con defaults
    expect(res.components.escenarios.base).toBeDefined();
  });

  it('D9 fallback: solo macro (sin momentum) → confidence=medium', () => {
    const res = computeA02InvestmentSimulation({
      propertyValue: 3_000_000,
      downPayment: 600_000,
      loanYears: 20,
      macro: { tasa_hipotecaria_avg: 0.12 },
    });
    expect(res.confidence).toBe('medium');
    expect(res.components.missing_dimensions).toEqual(['N11_momentum']);
  });

  it('propertyValue inválido → insufficient_data', () => {
    const res = computeA02InvestmentSimulation({
      propertyValue: 0,
      downPayment: 0,
      loanYears: 20,
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('getLabelKey A02 mapea umbrales', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.a02.excelente');
    expect(getLabelKey(70, 'high')).toBe('ie.score.a02.buena');
    expect(getLabelKey(50, 'high')).toBe('ie.score.a02.marginal');
    expect(getLabelKey(20, 'high')).toBe('ie.score.a02.mala');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.a02.insufficient');
  });

  it('MACRO_BASELINE_TASA fallback razonable (10-15%)', () => {
    expect(MACRO_BASELINE_TASA).toBeGreaterThan(0.08);
    expect(MACRO_BASELINE_TASA).toBeLessThan(0.2);
  });

  it('payback_years ∈ [1, 30]', () => {
    const res = computeA02InvestmentSimulation(PROP_3M);
    for (const esc of Object.values(res.components.escenarios)) {
      expect(esc.payback_years).toBeGreaterThanOrEqual(1);
      expect(esc.payback_years).toBeLessThanOrEqual(30);
    }
  });
});
