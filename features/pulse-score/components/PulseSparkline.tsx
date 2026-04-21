'use client';

import { useTranslations } from 'next-intl';
import { useId, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/shared/ui/primitives/cn';

export interface PulseSparklinePoint {
  readonly period_date: string;
  readonly pulse_score: number | null;
}

export interface PulseSparklineProps {
  readonly data: ReadonlyArray<PulseSparklinePoint>;
  readonly className?: string;
  readonly height?: number;
}

interface ChartRow {
  readonly period_date: string;
  readonly pulse: number | null;
}

export function PulseSparkline({ data, className, height = 120 }: PulseSparklineProps) {
  const t = useTranslations('Pulse');
  const gradientId = useId();

  const rows = useMemo<ChartRow[]>(
    () =>
      data.map((d) => ({
        period_date: d.period_date,
        pulse: d.pulse_score,
      })),
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
      <div
        role="img"
        aria-label={t('aria_pulse_chart')}
        className={cn('flex items-center justify-center text-xs', className)}
        style={{
          height,
          color: 'var(--color-text-muted)',
          background: 'var(--color-surface-sunken)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        —
      </div>
    );
  }

  return (
    <figure className={cn('flex flex-col gap-2', className)} aria-label={t('aria_pulse_chart')}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-accent-primary, oklch(0.67 0.19 285))"
                stopOpacity={0.45}
              />
              <stop
                offset="100%"
                stopColor="var(--color-accent-primary, oklch(0.67 0.19 285))"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="period_date"
            tickFormatter={(v: string) => v.slice(0, 7)}
            stroke="var(--color-text-muted)"
            fontSize={10}
            minTickGap={24}
            hide
          />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--color-text-secondary)' }}
            formatter={(value) => {
              if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(1);
              return value == null ? '—' : String(value);
            }}
          />
          <Area
            type="monotone"
            dataKey="pulse"
            stroke="var(--color-accent-primary, oklch(0.67 0.19 285))"
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            connectNulls={false}
            isAnimationActive={!prefersReducedMotion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}
