'use client';

// BLOQUE 11.Q.3.5 (U3) — timeline 12m ghost_score por colonia.
// Mini Recharts Line chart con period_date × ghost_score + tooltip breakdown.

import { useTranslations } from 'next-intl';
import { useId, useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GhostTimelinePoint } from '@/features/ghost-zones/types';

interface GhostTimelineChartProps {
  readonly data: readonly GhostTimelinePoint[];
  readonly height?: number;
}

interface ChartRow {
  readonly period_date: string;
  readonly ghost_score: number;
}

export function GhostTimelineChart({ data, height = 120 }: GhostTimelineChartProps) {
  const t = useTranslations('GhostZones.timeline');
  const chartId = useId();

  const rows = useMemo<ChartRow[]>(
    () => data.map((d) => ({ period_date: d.period_date, ghost_score: d.ghost_score })),
    [data],
  );

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  if (rows.length === 0) {
    return (
      <p
        role="status"
        className="text-xs text-[color:var(--color-text-secondary)]"
        aria-label={t('empty_aria')}
      >
        {t('empty')}
      </p>
    );
  }

  return (
    <figure className="flex flex-col gap-2" aria-label={t('chart_aria')} data-chart-id={chartId}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <XAxis
            dataKey="period_date"
            tickFormatter={(v: string) => v.slice(0, 7)}
            stroke="var(--color-text-muted)"
            fontSize={10}
            minTickGap={24}
          />
          <YAxis domain={[0, 100]} fontSize={10} width={24} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '8px',
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--color-text-secondary)' }}
            formatter={(value) => {
              if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(1);
              return value == null ? '—' : String(value);
            }}
          />
          <Line
            type="monotone"
            dataKey="ghost_score"
            stroke="var(--color-accent)"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={!prefersReducedMotion}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

export default GhostTimelineChart;
