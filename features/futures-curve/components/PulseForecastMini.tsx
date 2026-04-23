'use client';

import { useTranslations } from 'next-intl';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PulseForecastPoint } from '../types';

export interface PulseForecastMiniProps {
  readonly points: ReadonlyArray<PulseForecastPoint>;
  readonly height?: number;
}

interface ChartRow {
  date: string;
  value: number;
  band: number;
  lower: number;
}

export function PulseForecastMini({ points, height = 140 }: PulseForecastMiniProps) {
  const t = useTranslations('FuturesCurve');

  if (points.length === 0) {
    return null;
  }

  const rows: ChartRow[] = points.map((p) => {
    const lower = p.value_lower ?? p.value;
    const upper = p.value_upper ?? p.value;
    return {
      date: p.forecast_date.slice(5), // MM-DD
      value: p.value,
      band: Math.max(0, upper - lower),
      lower,
    };
  });

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-secondary)]">
        {t('pulse_forecast_heading')}
      </h3>
      <div
        role="img"
        aria-label={t('pulse_forecast_a11y')}
        style={{ width: '100%', height }}
        className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
              width={24}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-base)',
                border: '1px solid var(--color-border-subtle)',
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="band"
              stackId="band"
              stroke="none"
              fill="oklch(0.67 0.19 285)"
              fillOpacity={0.15}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="oklch(0.67 0.19 285)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-[color:var(--color-text-muted)]">{t('pulse_disclaimer')}</p>
    </div>
  );
}
