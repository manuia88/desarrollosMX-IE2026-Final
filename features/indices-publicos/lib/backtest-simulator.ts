// Pure backtest simulator — no external deps.
//
// Recibe un array de puntos raw (scope_id, period_date ISO, value) tal como
// los devuelve el router indicesPublic.getBacktest y produce por cada scope
// una serie indexada (base 100 por default), retorno total, volatilidad
// (desviación estándar de los pct_change periodo-a-periodo) y max drawdown.
//
// Contrato:
//   - NaN / Infinity / valores inválidos se filtran.
//   - Series con menos de 2 puntos válidos devuelven métricas en 0.
//   - División por cero (primer valor = 0) devuelve métricas en 0.
//   - Orden de salida: scopes en el orden de primera aparición en `series`.

export interface RawSeriesPoint {
  readonly scope_id: string;
  readonly period_date: string;
  readonly value: number;
}

export interface BacktestOptions {
  readonly baseValue?: number;
}

export interface BacktestPoint {
  readonly period_date: string;
  readonly indexed_value: number;
  readonly pct_change: number;
}

export interface BacktestScopeResult {
  readonly scope_id: string;
  readonly points: ReadonlyArray<BacktestPoint>;
  readonly total_return_pct: number;
  readonly volatility_pct: number;
  readonly max_drawdown_pct: number;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function groupByScope(
  series: ReadonlyArray<RawSeriesPoint>,
): ReadonlyMap<string, ReadonlyArray<RawSeriesPoint>> {
  const map = new Map<string, RawSeriesPoint[]>();
  const order: string[] = [];
  for (const point of series) {
    if (!isFiniteNumber(point.value)) continue;
    const bucket = map.get(point.scope_id);
    if (bucket) {
      bucket.push(point);
    } else {
      map.set(point.scope_id, [point]);
      order.push(point.scope_id);
    }
  }
  const ordered = new Map<string, ReadonlyArray<RawSeriesPoint>>();
  for (const scope of order) {
    const bucket = map.get(scope);
    if (!bucket) continue;
    const sorted = [...bucket].sort((a, b) => (a.period_date < b.period_date ? -1 : 1));
    ordered.set(scope, sorted);
  }
  return ordered;
}

function emptyResult(scope_id: string): BacktestScopeResult {
  return {
    scope_id,
    points: [],
    total_return_pct: 0,
    volatility_pct: 0,
    max_drawdown_pct: 0,
  };
}

function computeScope(
  scope_id: string,
  points: ReadonlyArray<RawSeriesPoint>,
  baseValue: number,
): BacktestScopeResult {
  if (points.length < 2) return emptyResult(scope_id);
  const first = points[0];
  if (!first || !isFiniteNumber(first.value) || first.value === 0) {
    return emptyResult(scope_id);
  }

  const indexed: BacktestPoint[] = [];
  const pctChanges: number[] = [];
  let prevIndexed = baseValue;
  let peak = baseValue;
  let maxDrawdownPct = 0;

  for (let i = 0; i < points.length; i += 1) {
    const pt = points[i];
    if (!pt || !isFiniteNumber(pt.value)) continue;
    const indexed_value = (pt.value / first.value) * baseValue;
    if (!isFiniteNumber(indexed_value)) continue;
    const pct_change = i === 0 ? 0 : ((indexed_value - prevIndexed) / prevIndexed) * 100;
    const safe_pct = isFiniteNumber(pct_change) ? pct_change : 0;
    indexed.push({
      period_date: pt.period_date,
      indexed_value,
      pct_change: safe_pct,
    });
    if (i > 0) pctChanges.push(safe_pct);
    if (indexed_value > peak) peak = indexed_value;
    const drawdown = peak === 0 ? 0 : ((indexed_value - peak) / peak) * 100;
    if (drawdown < maxDrawdownPct) maxDrawdownPct = drawdown;
    prevIndexed = indexed_value;
  }

  if (indexed.length < 2) return emptyResult(scope_id);

  const last = indexed[indexed.length - 1];
  const total_return_pct = last ? ((last.indexed_value - baseValue) / baseValue) * 100 : 0;

  const mean =
    pctChanges.length === 0 ? 0 : pctChanges.reduce((acc, v) => acc + v, 0) / pctChanges.length;
  const variance =
    pctChanges.length === 0
      ? 0
      : pctChanges.reduce((acc, v) => acc + (v - mean) ** 2, 0) / pctChanges.length;
  const volatility_pct = Math.sqrt(variance);

  return {
    scope_id,
    points: indexed,
    total_return_pct: isFiniteNumber(total_return_pct) ? total_return_pct : 0,
    volatility_pct: isFiniteNumber(volatility_pct) ? volatility_pct : 0,
    max_drawdown_pct: isFiniteNumber(maxDrawdownPct) ? maxDrawdownPct : 0,
  };
}

export function computeBacktestReturns(
  series: ReadonlyArray<RawSeriesPoint>,
  options?: BacktestOptions,
): ReadonlyArray<BacktestScopeResult> {
  const baseValue = options?.baseValue ?? 100;
  if (!isFiniteNumber(baseValue) || baseValue <= 0) return [];
  const grouped = groupByScope(series);
  const result: BacktestScopeResult[] = [];
  for (const [scope_id, points] of grouped) {
    result.push(computeScope(scope_id, points, baseValue));
  }
  return result;
}
