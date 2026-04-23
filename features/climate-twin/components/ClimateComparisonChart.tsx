'use client';

// BLOQUE 11.P.3.3 — Chart dual-axis temperatura + lluvia 15y.

import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ClimateChartPoint {
  readonly year_month: string;
  readonly temp_avg: number | null;
  readonly rainfall_mm: number | null;
}

interface ClimateComparisonChartProps {
  readonly series: readonly ClimateChartPoint[];
  readonly height?: number;
  readonly ariaLabel?: string;
  readonly tempLabel: string;
  readonly rainfallLabel: string;
}

interface ChartRow {
  readonly year_month: string;
  readonly temp_avg: number;
  readonly rainfall_mm: number;
}

export function ClimateComparisonChart({
  series,
  height = 320,
  ariaLabel,
  tempLabel,
  rainfallLabel,
}: ClimateComparisonChartProps) {
  const rows = useMemo<ChartRow[]>(() => {
    return series
      .map((p) => ({
        year_month: p.year_month.slice(0, 7),
        temp_avg: typeof p.temp_avg === 'number' ? p.temp_avg : 0,
        rainfall_mm: typeof p.rainfall_mm === 'number' ? p.rainfall_mm : 0,
      }))
      .sort((a, b) => a.year_month.localeCompare(b.year_month));
  }, [series]);

  if (rows.length === 0) return null;

  return (
    <figure aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 0.3)" />
          <XAxis
            dataKey="year_month"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            yAxisId="temp"
            orientation="left"
            tick={{ fontSize: 10 }}
            label={{ value: tempLabel, angle: -90, position: 'insideLeft', fontSize: 10 }}
          />
          <YAxis
            yAxisId="rain"
            orientation="right"
            tick={{ fontSize: 10 }}
            label={{ value: rainfallLabel, angle: 90, position: 'insideRight', fontSize: 10 }}
          />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            yAxisId="rain"
            dataKey="rainfall_mm"
            name={rainfallLabel}
            fill="oklch(0.78 0.12 230)"
            opacity={0.7}
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temp_avg"
            name={tempLabel}
            stroke="oklch(0.67 0.19 30)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  );
}

export default ClimateComparisonChart;
