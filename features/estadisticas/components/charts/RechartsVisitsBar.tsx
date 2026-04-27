'use client';

import { useTranslations } from 'next-intl';
import { useId, useMemo } from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface VisitsRow {
  readonly day: string;
  readonly visitas_agendadas: number;
  readonly visitas_completadas: number;
  readonly operaciones_cerradas: number;
}

interface RechartsVisitsBarProps {
  readonly data: ReadonlyArray<VisitsRow>;
  readonly height?: number;
  readonly slaUnavailable?: boolean;
}

export function RechartsVisitsBar({
  data,
  height = 240,
  slaUnavailable = false,
}: RechartsVisitsBarProps) {
  const t = useTranslations('estadisticas.charts.visits');
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
      <div className="flex flex-col gap-2">
        {slaUnavailable ? (
          <div className="text-xs italic text-[color:var(--color-text-muted)]">
            {t('slaUnavailable')}
          </div>
        ) : null}
        <p role="status" className="text-xs text-[color:var(--color-text-muted)]">
          {t('empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {slaUnavailable ? (
        <div className="text-xs italic text-[color:var(--color-text-muted)]">
          {t('slaUnavailable')}
        </div>
      ) : null}
      <figure className="flex flex-col gap-2" aria-label={t('aria')} data-chart-id={chartId}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={rows as VisitsRow[]} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <XAxis dataKey="day" stroke="var(--color-text-muted)" fontSize={11} minTickGap={12} />
            <YAxis
              stroke="var(--color-text-muted)"
              fontSize={11}
              width={36}
              allowDecimals={false}
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
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="visitas_agendadas"
              name={t('agendadas')}
              fill="var(--accent-teal, #14b8a6)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
            />
            <Bar
              dataKey="visitas_completadas"
              name={t('completadas')}
              fill="var(--accent-violet, #8b5cf6)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
            />
            <Bar
              dataKey="operaciones_cerradas"
              name={t('operaciones')}
              fill="var(--accent-gold, #f59e0b)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
            />
          </BarChart>
        </ResponsiveContainer>
        <figcaption className="sr-only">{t('tableCaption')}</figcaption>
        <table className="sr-only">
          <caption>{t('tableCaption')}</caption>
          <thead>
            <tr>
              <th>{t('day')}</th>
              <th>{t('agendadas')}</th>
              <th>{t('completadas')}</th>
              <th>{t('operaciones')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.day}>
                <td>{row.day}</td>
                <td>{row.visitas_agendadas}</td>
                <td>{row.visitas_completadas}</td>
                <td>{row.operaciones_cerradas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </div>
  );
}

export default RechartsVisitsBar;
