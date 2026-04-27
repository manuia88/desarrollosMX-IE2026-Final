'use client';

import { useTranslations } from 'next-intl';
import { useId, useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RevenueRow {
  readonly month: string;
  readonly revenue_mxn: number;
  readonly operaciones_cerradas: number;
}

interface RechartsRevenueLineProps {
  readonly data: ReadonlyArray<RevenueRow>;
  readonly height?: number;
}

const MXN_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export function RechartsRevenueLine({ data, height = 240 }: RechartsRevenueLineProps) {
  const t = useTranslations('estadisticas.charts.revenue');
  const chartId = useId();

  const rows = useMemo(() => data.map((d) => ({ ...d })), [data]);

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
        <LineChart data={rows as RevenueRow[]} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={11} minTickGap={16} />
          <YAxis
            stroke="var(--color-text-muted)"
            fontSize={11}
            width={56}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat('es-MX', {
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(v)
            }
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
                return MXN_FORMATTER.format(value);
              }
              return value == null ? '—' : String(value);
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue_mxn"
            stroke="var(--accent-teal, #14b8a6)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!prefersReducedMotion}
          />
        </LineChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">{t('tableCaption')}</figcaption>
      <table className="sr-only">
        <caption>{t('tableCaption')}</caption>
        <thead>
          <tr>
            <th>{t('month')}</th>
            <th>{t('amount')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <td>{row.month}</td>
              <td>{MXN_FORMATTER.format(row.revenue_mxn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default RechartsRevenueLine;
