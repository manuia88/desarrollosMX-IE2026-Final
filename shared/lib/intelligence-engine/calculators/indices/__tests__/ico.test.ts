import { describe, expect, it } from 'vitest';
import { computeIco, getLabelKey, methodology, version } from '../ico';

const PERIOD = '2026-04-01';

describe('DMX-ICO — Índice Costo Oportunidad', () => {
  it('version + methodology con cetes_series_id', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.cetes_series_id).toBe('cetes_28d');
    expect(methodology.confidence_thresholds.min_listings_per_op).toBe(5);
  });

  it('insufficient_data: falta cetes', () => {
    const res = computeIco({
      renta_mensual_avg: 20000,
      precio_m2_avg: 50000,
      yield_cetes: null,
      n_rentas: 15,
      n_ventas: 15,
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.dmx_ico.insufficient');
  });

  it('insufficient_data: <5 rentas', () => {
    const res = computeIco({
      renta_mensual_avg: 20000,
      precio_m2_avg: 50000,
      yield_cetes: 11.0,
      n_rentas: 2,
      n_ventas: 20,
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('insufficient_data: falta precio_m2', () => {
    const res = computeIco({
      renta_mensual_avg: 20000,
      precio_m2_avg: null,
      yield_cetes: 11.0,
      n_rentas: 10,
      n_ventas: 10,
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('happy path: yield RE > yield CETES → ICO > 50', () => {
    // renta 25000/mes, precio 50000/m² → yield = 25000*12/50000 = 6% — menor que CETES 11%
    // Para yield RE > cetes, necesitamos precio bajo.
    // renta 25000/mes, precio 15000/m² → yield = 25000*12/15000 = 20% > CETES 11%
    const res = computeIco({
      renta_mensual_avg: 25000,
      precio_m2_avg: 15000,
      yield_cetes: 11.0,
      n_rentas: 20,
      n_ventas: 20,
      period_date: PERIOD,
      data_staleness_days: 0,
    });
    expect(res.value).toBeGreaterThan(50);
    expect(res.components.yield_inmobiliario).toBeGreaterThan(11);
    expect(res.components.spread).toBeGreaterThan(0);
  });

  it('yield RE < CETES → ICO < 50', () => {
    // Para yield < 11% con la fórmula renta*12/precio*100: renta/precio < 11/1200.
    // Ej: precio 50000, renta 300 → yield = 300*12/50000*100 = 7.2% < 11.
    const res = computeIco({
      renta_mensual_avg: 300,
      precio_m2_avg: 50000,
      yield_cetes: 11.0,
      n_rentas: 20,
      n_ventas: 20,
      period_date: PERIOD,
    });
    expect(res.value).toBeLessThan(50);
    expect(res.components.yield_inmobiliario).toBeLessThan(11);
  });

  it('yield RE = CETES → ICO = 50', () => {
    // yield = 11% = CETES → spread 0 → ICO = 50
    // renta X/mes, precio Y → X*12/Y = 11 → X = 11*Y/1200
    // Si Y = 12000 → X = 110. Necesitamos números más realistas.
    // renta 2750/mes, precio 30000/m² → 2750*12/30000 = 1.1% → no
    // renta 1100/mes, precio 12000 → 1100*12/12000 = 1.1 → no
    // yield = 11% → renta*12 = 0.11 * precio → renta = precio * 0.11 / 12
    const precio = 20000;
    const renta = (precio * 11) / 1200;
    const res = computeIco({
      renta_mensual_avg: renta,
      precio_m2_avg: precio,
      yield_cetes: 11.0,
      n_rentas: 20,
      n_ventas: 20,
      period_date: PERIOD,
    });
    expect(res.value).toBe(50);
    expect(res.components.spread).toBeCloseTo(0, 1);
  });

  it('edge: yield RE = 0 → ICO = 0 (clamped)', () => {
    const res = computeIco({
      renta_mensual_avg: 0,
      precio_m2_avg: 50000,
      yield_cetes: 11.0,
      n_rentas: 20,
      n_ventas: 20,
      period_date: PERIOD,
    });
    expect(res.value).toBe(0);
  });

  it('edge: yield RE muy alto → ICO = 100 (clamped)', () => {
    // renta 100000/mes, precio 5000/m² → yield = 240% → spread ~229%
    // ICO = 229/11 * 50 + 50 = 1091 → clamp 100
    const res = computeIco({
      renta_mensual_avg: 100000,
      precio_m2_avg: 5000,
      yield_cetes: 11.0,
      n_rentas: 20,
      n_ventas: 20,
      period_date: PERIOD,
    });
    expect(res.value).toBe(100);
  });

  it('circuit breaker: cambio > 20% vs previous', () => {
    const res = computeIco({
      renta_mensual_avg: 25000,
      precio_m2_avg: 15000,
      yield_cetes: 11.0,
      n_rentas: 20,
      n_ventas: 20,
      period_date: PERIOD,
      previous_value: 30, // cambio ~ de 30 a 100 > 20%
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(true);
  });

  it('labels: thresholds', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.index.dmx_ico.excelente');
    expect(getLabelKey(60, 'medium')).toBe('ie.index.dmx_ico.bueno');
    expect(getLabelKey(45, 'medium')).toBe('ie.index.dmx_ico.neutro');
    expect(getLabelKey(20, 'low')).toBe('ie.index.dmx_ico.malo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.dmx_ico.insufficient');
  });

  it('explainability: renta/precio/cetes con citations correctas', () => {
    const res = computeIco({
      renta_mensual_avg: 20000,
      precio_m2_avg: 25000,
      yield_cetes: 11.0,
      n_rentas: 15,
      n_ventas: 15,
      period_date: PERIOD,
    });
    expect(res.components.renta_mensual_avg?.citation_source).toBe('market_prices_secondary:renta');
    expect(res.components.precio_m2_avg?.citation_source).toBe('market_prices_secondary:venta');
    expect(res.components.yield_cetes?.citation_source).toBe('macro_series:cetes_28d');
    expect(res.components.renta_mensual_avg?.sample_count).toBe(15);
  });

  it('confidence_breakdown escala con n_listings', () => {
    const lowN = computeIco({
      renta_mensual_avg: 20000,
      precio_m2_avg: 25000,
      yield_cetes: 11.0,
      n_rentas: 6,
      n_ventas: 6,
      period_date: PERIOD,
    });
    const highN = computeIco({
      renta_mensual_avg: 20000,
      precio_m2_avg: 25000,
      yield_cetes: 11.0,
      n_rentas: 30,
      n_ventas: 30,
      period_date: PERIOD,
    });
    expect(highN.components._meta.confidence_breakdown.sample_size).toBeGreaterThan(
      lowN.components._meta.confidence_breakdown.sample_size,
    );
  });
});
