'use client';

import { useMemo } from 'react';
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BacktestScopeResult } from '../lib/backtest-simulator';

export interface BacktestChartProps {
  readonly results: ReadonlyArray<BacktestScopeResult>;
  readonly height?: number;
  readonly ariaLabel?: string;
  readonly downsampleThreshold?: number;
}

const PALETTE: readonly string[] = [
  'oklch(0.67 0.19 285)',
  'oklch(0.78 0.17 50)',
  'oklch(0.78 0.12 180)',
  'oklch(0.85 0.12 145)',
];
const FALLBACK_COLOR = 'oklch(0.67 0.19 285)';
function colorAt(idx: number): string {
  return PALETTE[idx % PALETTE.length] ?? FALLBACK_COLOR;
}

interface ChartRow {
  readonly period_date: string;
  readonly [scope: string]: string | number;
}

function mergeByDate(results: ReadonlyArray<BacktestScopeResult>): {
  rows: ChartRow[];
  scopes: readonly string[];
} {
  const scopes = results.map((r) => r.scope_id);
  const byDate = new Map<string, Record<string, number>>();
  for (const scope of results) {
    for (const point of scope.points) {
      const existing = byDate.get(point.period_date) ?? {};
      existing[scope.scope_id] = point.indexed_value;
      byDate.set(point.period_date, existing);
    }
  }
  const sorted = Array.from(byDate.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  const rows: ChartRow[] = sorted.map(([period_date, values]) => ({ period_date, ...values }));
  return { rows, scopes };
}

function lttbDownsample(rows: ReadonlyArray<ChartRow>, threshold: number): ChartRow[] {
  if (threshold <= 2 || rows.length <= threshold) return [...rows];
  const sampled: ChartRow[] = [];
  const bucketSize = (rows.length - 2) / (threshold - 2);

  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first || !last) return [...rows];

  sampled.push(first);
  let aIndex = 0;

  for (let i = 0; i < threshold - 2; i += 1) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, rows.length);
    const avgRangeStart = Math.floor(i * bucketSize) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, rows.length);

    let avgX = 0;
    let avgY = 0;
    let avgCount = 0;
    for (let j = avgRangeStart; j < avgRangeEnd; j += 1) {
      const row = rows[j];
      if (!row) continue;
      avgX += j;
      avgY += toNumeric(row);
      avgCount += 1;
    }
    if (avgCount === 0) continue;
    avgX /= avgCount;
    avgY /= avgCount;

    const aRow = rows[aIndex];
    if (!aRow) break;
    const aX = aIndex;
    const aY = toNumeric(aRow);

    let maxArea = -1;
    let chosen = rangeStart;
    for (let j = rangeStart; j < rangeEnd; j += 1) {
      const row = rows[j];
      if (!row) continue;
      const area = Math.abs((aX - avgX) * (toNumeric(row) - aY) - (aX - j) * (avgY - aY)) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        chosen = j;
      }
    }
    const chosenRow = rows[chosen];
    if (chosenRow) {
      sampled.push(chosenRow);
      aIndex = chosen;
    }
  }

  sampled.push(last);
  return sampled;
}

function toNumeric(row: ChartRow): number {
  for (const value of Object.values(row)) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

export function BacktestChart({
  results,
  height = 360,
  ariaLabel,
  downsampleThreshold = 250,
}: BacktestChartProps) {
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const { rows, scopes } = useMemo(() => mergeByDate(results), [results]);
  const data = useMemo(
    () => lttbDownsample(rows, downsampleThreshold),
    [rows, downsampleThreshold],
  );

  if (results.length === 0 || data.length === 0) {
    return (
      <div
        role="img"
        aria-label={ariaLabel ?? 'backtest chart empty'}
        className="flex items-center justify-center rounded-[var(--radius-md)] border text-xs"
        style={{
          height,
          borderColor: 'var(--color-border-subtle)',
          color: 'var(--color-text-muted)',
          background: 'var(--color-surface-sunken)',
        }}
      >
        —
      </div>
    );
  }

  return (
    <figure className="flex flex-col gap-2" aria-label={ariaLabel ?? 'backtest chart'}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
          <defs>
            {scopes.map((scope, idx) => (
              <linearGradient
                key={`grad-${scope}`}
                id={`grad-${scope}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={colorAt(idx)} stopOpacity={0.28} />
                <stop offset="100%" stopColor={colorAt(idx)} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="var(--color-border-subtle)"
            vertical={false}
          />
          <XAxis
            dataKey="period_date"
            tickFormatter={(v: string) => v.slice(0, 7)}
            stroke="var(--color-text-muted)"
            fontSize={10}
            minTickGap={24}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            fontSize={10}
            tickFormatter={(v: number) => v.toFixed(1)}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--color-text-secondary)' }}
            formatter={(value) => {
              if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(2);
              return value == null ? '—' : String(value);
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Brush
            dataKey="period_date"
            height={24}
            stroke="var(--color-border-strong)"
            tickFormatter={(v: string) => v.slice(0, 7)}
          />
          {scopes.map((scope) => (
            <Area
              key={`area-${scope}`}
              type="monotone"
              dataKey={scope}
              stroke="none"
              fill={`url(#grad-${scope})`}
              isAnimationActive={!prefersReducedMotion}
            />
          ))}
          {scopes.map((scope, idx) => (
            <Line
              key={`line-${scope}`}
              type="monotone"
              dataKey={scope}
              stroke={colorAt(idx)}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={!prefersReducedMotion}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  );
}
