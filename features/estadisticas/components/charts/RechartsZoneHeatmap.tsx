'use client';

import { useTranslations } from 'next-intl';
import { useId, useMemo } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface HeatmapRow {
  readonly colonia: string;
  readonly count: number;
}

interface RechartsZoneHeatmapProps {
  readonly heatmap: ReadonlyArray<HeatmapRow>;
  readonly height?: number;
}

function intensityColor(count: number): string {
  if (count >= 5) return 'var(--accent-teal, #14b8a6)';
  if (count >= 2) return 'var(--accent-gold, #f59e0b)';
  return 'var(--color-text-muted, #64748b)';
}

export function RechartsZoneHeatmap({ heatmap, height = 320 }: RechartsZoneHeatmapProps) {
  const t = useTranslations('estadisticas.charts.zones');
  const chartId = useId();

  const rows = useMemo(() => {
    return [...heatmap]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((row) => ({ ...row }));
  }, [heatmap]);

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
          data={rows as HeatmapRow[]}
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
            dataKey="colonia"
            stroke="var(--color-text-muted)"
            fontSize={11}
            width={140}
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
          <Bar dataKey="count" radius={[0, 6, 6, 0]} isAnimationActive={!prefersReducedMotion}>
            {rows.map((row) => (
              <Cell key={row.colonia} fill={intensityColor(row.count)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">{t('tableCaption')}</figcaption>
      <table className="sr-only">
        <caption>{t('tableCaption')}</caption>
        <thead>
          <tr>
            <th>{t('colonia')}</th>
            <th>{t('count')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.colonia}>
              <td>{row.colonia}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default RechartsZoneHeatmap;
