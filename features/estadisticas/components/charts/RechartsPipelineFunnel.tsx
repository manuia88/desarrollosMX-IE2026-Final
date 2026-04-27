'use client';

import { useTranslations } from 'next-intl';
import { useId, useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface FunnelStage {
  readonly stage: string;
  readonly count: number;
}

interface RechartsPipelineFunnelProps {
  readonly stages: ReadonlyArray<FunnelStage>;
  readonly height?: number;
}

export function RechartsPipelineFunnel({ stages, height = 280 }: RechartsPipelineFunnelProps) {
  const t = useTranslations('estadisticas.charts.funnel');
  const chartId = useId();

  const rows = useMemo(() => stages.map((s) => ({ ...s })), [stages]);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  if (rows.length === 0) {
    return (
      <p role="status" className="text-xs text-[color:var(--color-text-muted)]">
        {t('empty')}
      </p>
    );
  }

  return (
    <figure className="flex flex-col gap-2" aria-label={t('aria')} data-chart-id={chartId}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={rows as FunnelStage[]}
          margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis
            type="number"
            stroke="var(--color-text-muted)"
            fontSize={11}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="stage"
            stroke="var(--color-text-muted)"
            fontSize={11}
            width={120}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '8px',
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--color-text-secondary)' }}
            formatter={(value) => {
              if (typeof value === 'number' && Number.isFinite(value)) {
                return value.toString();
              }
              return value == null ? '—' : String(value);
            }}
          />
          <Bar
            dataKey="count"
            fill="var(--accent-violet, #8b5cf6)"
            radius={[0, 6, 6, 0]}
            isAnimationActive={!prefersReducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">{t('tableCaption')}</figcaption>
      <table className="sr-only">
        <caption>{t('tableCaption')}</caption>
        <thead>
          <tr>
            <th>{t('stage')}</th>
            <th>{t('count')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.stage}>
              <td>{row.stage}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default RechartsPipelineFunnel;
