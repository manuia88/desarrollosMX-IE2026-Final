'use client';

import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ForwardCurve } from '../types';

export interface ForwardCurveChartProps {
  readonly curves: ReadonlyArray<ForwardCurve>;
  readonly height?: number;
  readonly ariaLabel?: string;
}

const PALETTE: readonly string[] = [
  'oklch(0.67 0.19 285)',
  'oklch(0.78 0.17 50)',
  'oklch(0.78 0.12 180)',
  'oklch(0.85 0.12 145)',
];
const FALLBACK = 'oklch(0.67 0.19 285)';
function colorAt(idx: number): string {
  return PALETTE[idx % PALETTE.length] ?? FALLBACK;
}

interface ChartRow {
  horizon: number;
  [scopeKey: string]: number;
}

export function ForwardCurveChart({ curves, height = 320, ariaLabel }: ForwardCurveChartProps) {
  const { rows, curveMeta } = useMemo(() => {
    const meta: Array<{ key: string; label: string; color: string }> = [];
    const horizonsSet = new Set<number>();
    for (const c of curves) {
      for (const p of c.points) horizonsSet.add(p.horizon_m);
    }
    const horizons = Array.from(horizonsSet).sort((a, b) => a - b);
    const chartRows: ChartRow[] = horizons.map((h) => ({ horizon: h }) as ChartRow);
    curves.forEach((curve, idx) => {
      const key = `${curve.index_code}_${curve.scope_id.slice(0, 6)}`;
      meta.push({
        key,
        label: `${curve.index_code} · ${curve.scope_id.slice(0, 6)}`,
        color: colorAt(idx),
      });
      for (const p of curve.points) {
        const row = chartRows.find((r) => r.horizon === p.horizon_m);
        if (!row) continue;
        if (typeof p.value === 'number') row[key] = p.value;
        if (typeof p.lower === 'number' && typeof p.upper === 'number') {
          row[`${key}_band`] = p.upper - p.lower;
          row[`${key}_lower`] = p.lower;
        }
      }
    });
    return { rows: chartRows, curveMeta: meta };
  }, [curves]);

  if (curves.length === 0 || rows.length === 0) {
    return null;
  }

  return (
    <div
      aria-label={ariaLabel}
      role="img"
      style={{ width: '100%', height }}
      className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-4"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
          <XAxis
            dataKey="horizon"
            type="number"
            domain={[0, 'dataMax']}
            tickFormatter={(v: number) => `${v}m`}
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          />
          <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface-base)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {curveMeta.map((m) => (
            <Area
              key={`${m.key}_band`}
              type="monotone"
              dataKey={`${m.key}_band`}
              stackId={`${m.key}_stack`}
              stroke="none"
              fill={m.color}
              fillOpacity={0.15}
              name={`${m.label} CI`}
            />
          ))}
          {curveMeta.map((m) => (
            <Line
              key={m.key}
              type="monotone"
              dataKey={m.key}
              stroke={m.color}
              strokeWidth={2.5}
              dot={{ r: 4 }}
              name={m.label}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
