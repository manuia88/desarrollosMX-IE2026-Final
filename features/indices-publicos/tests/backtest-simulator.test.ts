import { describe, expect, it } from 'vitest';
import { computeBacktestReturns, type RawSeriesPoint } from '../lib/backtest-simulator';

describe('computeBacktestReturns — happy path', () => {
  it('indexa serie base a baseValue default 100 y computa retorno total', () => {
    const series: RawSeriesPoint[] = [
      { scope_id: 'roma-norte', period_date: '2024-01-01', value: 100 },
      { scope_id: 'roma-norte', period_date: '2024-02-01', value: 110 },
      { scope_id: 'roma-norte', period_date: '2024-03-01', value: 121 },
    ];
    const [result] = computeBacktestReturns(series);
    expect(result).toBeDefined();
    if (!result) return;
    expect(result.scope_id).toBe('roma-norte');
    expect(result.points.length).toBe(3);
    expect(result.points[0]?.indexed_value).toBeCloseTo(100, 5);
    expect(result.points[2]?.indexed_value).toBeCloseTo(121, 5);
    expect(result.total_return_pct).toBeCloseTo(21, 5);
  });

  it('soporta múltiples scopes en paralelo respetando orden de aparición', () => {
    const series: RawSeriesPoint[] = [
      { scope_id: 'a', period_date: '2024-01-01', value: 100 },
      { scope_id: 'b', period_date: '2024-01-01', value: 50 },
      { scope_id: 'a', period_date: '2024-02-01', value: 120 },
      { scope_id: 'b', period_date: '2024-02-01', value: 55 },
    ];
    const results = computeBacktestReturns(series);
    expect(results.map((r) => r.scope_id)).toEqual(['a', 'b']);
    expect(results[0]?.total_return_pct).toBeCloseTo(20, 5);
    expect(results[1]?.total_return_pct).toBeCloseTo(10, 5);
  });

  it('respeta baseValue override', () => {
    const series: RawSeriesPoint[] = [
      { scope_id: 'x', period_date: '2024-01-01', value: 50 },
      { scope_id: 'x', period_date: '2024-02-01', value: 60 },
    ];
    const [result] = computeBacktestReturns(series, { baseValue: 1000 });
    expect(result?.points[0]?.indexed_value).toBeCloseTo(1000, 5);
    expect(result?.points[1]?.indexed_value).toBeCloseTo(1200, 5);
    expect(result?.total_return_pct).toBeCloseTo(20, 5);
  });

  it('calcula volatilidad (std dev) correctamente', () => {
    // pct changes: +10%, +10%, +10% → std = 0
    const flat: RawSeriesPoint[] = [
      { scope_id: 's', period_date: '2024-01-01', value: 100 },
      { scope_id: 's', period_date: '2024-02-01', value: 110 },
      { scope_id: 's', period_date: '2024-03-01', value: 121 },
      { scope_id: 's', period_date: '2024-04-01', value: 133.1 },
    ];
    const [flatResult] = computeBacktestReturns(flat);
    expect(flatResult?.volatility_pct).toBeCloseTo(0, 4);

    // pct changes alternadas: +10%, -10%, +10% → std > 0
    const swing: RawSeriesPoint[] = [
      { scope_id: 's', period_date: '2024-01-01', value: 100 },
      { scope_id: 's', period_date: '2024-02-01', value: 110 },
      { scope_id: 's', period_date: '2024-03-01', value: 99 },
      { scope_id: 's', period_date: '2024-04-01', value: 108.9 },
    ];
    const [swingResult] = computeBacktestReturns(swing);
    expect(swingResult?.volatility_pct).toBeGreaterThan(5);
  });

  it('computa max_drawdown_pct negativo desde peak', () => {
    const series: RawSeriesPoint[] = [
      { scope_id: 'dd', period_date: '2024-01-01', value: 100 },
      { scope_id: 'dd', period_date: '2024-02-01', value: 120 },
      { scope_id: 'dd', period_date: '2024-03-01', value: 90 },
      { scope_id: 'dd', period_date: '2024-04-01', value: 95 },
    ];
    const [result] = computeBacktestReturns(series);
    // Peak @120, trough @90 → drawdown = (90-120)/120 = -25%
    expect(result?.max_drawdown_pct).toBeCloseTo(-25, 4);
  });
});

describe('computeBacktestReturns — edge cases', () => {
  it('devuelve array vacío si la serie está vacía', () => {
    expect(computeBacktestReturns([])).toEqual([]);
  });

  it('retorna métricas en 0 cuando solo hay un punto', () => {
    const series: RawSeriesPoint[] = [
      { scope_id: 'single', period_date: '2024-01-01', value: 100 },
    ];
    const [result] = computeBacktestReturns(series);
    expect(result).toBeDefined();
    expect(result?.total_return_pct).toBe(0);
    expect(result?.volatility_pct).toBe(0);
    expect(result?.max_drawdown_pct).toBe(0);
    expect(result?.points.length).toBe(0);
  });

  it('filtra puntos con NaN / Infinity sin romper', () => {
    const series: RawSeriesPoint[] = [
      { scope_id: 'nan', period_date: '2024-01-01', value: 100 },
      { scope_id: 'nan', period_date: '2024-02-01', value: Number.NaN },
      { scope_id: 'nan', period_date: '2024-03-01', value: Number.POSITIVE_INFINITY },
      { scope_id: 'nan', period_date: '2024-04-01', value: 110 },
    ];
    const [result] = computeBacktestReturns(series);
    expect(result).toBeDefined();
    expect(result?.points.length).toBe(2);
    expect(result?.total_return_pct).toBeCloseTo(10, 5);
  });

  it('devuelve métricas en 0 si el primer valor es 0 (división por cero)', () => {
    const series: RawSeriesPoint[] = [
      { scope_id: 'zero', period_date: '2024-01-01', value: 0 },
      { scope_id: 'zero', period_date: '2024-02-01', value: 50 },
    ];
    const [result] = computeBacktestReturns(series);
    expect(result?.total_return_pct).toBe(0);
    expect(result?.volatility_pct).toBe(0);
    expect(result?.max_drawdown_pct).toBe(0);
    expect(result?.points.length).toBe(0);
  });

  it('ordena internamente por period_date aunque el input venga desordenado', () => {
    const series: RawSeriesPoint[] = [
      { scope_id: 's', period_date: '2024-03-01', value: 121 },
      { scope_id: 's', period_date: '2024-01-01', value: 100 },
      { scope_id: 's', period_date: '2024-02-01', value: 110 },
    ];
    const [result] = computeBacktestReturns(series);
    expect(result?.points.map((p) => p.period_date)).toEqual([
      '2024-01-01',
      '2024-02-01',
      '2024-03-01',
    ]);
    expect(result?.total_return_pct).toBeCloseTo(21, 5);
  });

  it('rechaza baseValue inválido devolviendo array vacío', () => {
    const series: RawSeriesPoint[] = [
      { scope_id: 's', period_date: '2024-01-01', value: 100 },
      { scope_id: 's', period_date: '2024-02-01', value: 110 },
    ];
    expect(computeBacktestReturns(series, { baseValue: 0 })).toEqual([]);
    expect(computeBacktestReturns(series, { baseValue: -1 })).toEqual([]);
    expect(computeBacktestReturns(series, { baseValue: Number.NaN })).toEqual([]);
  });
});
