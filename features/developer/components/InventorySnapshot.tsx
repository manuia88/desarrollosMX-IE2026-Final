'use client';

import { useTranslations } from 'next-intl';
import { useId, useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ProyectoSnapshot {
  readonly proyecto_id: string;
  readonly nombre: string;
  readonly units_total: number;
  readonly disponible: number;
  readonly apartada: number;
  readonly vendida: number;
  readonly otra: number;
}

export interface InventorySnapshotProps {
  readonly proyectos: ReadonlyArray<ProyectoSnapshot>;
  readonly height?: number;
}

const COLOR_DISPONIBLE = '#10b981';
const COLOR_APARTADA = '#f59e0b';
const COLOR_VENDIDA = '#3b82f6';
const COLOR_OTRA = '#6b7280';

const INTEGER_FORMATTER = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

interface TooltipPayloadEntry {
  readonly dataKey?: string | number;
  readonly value?: number;
  readonly color?: string;
  readonly name?: string;
}

interface CustomTooltipProps {
  readonly active?: boolean | undefined;
  readonly payload?: ReadonlyArray<TooltipPayloadEntry> | undefined;
  readonly label?: string | undefined;
  readonly labels: {
    readonly disponible: string;
    readonly apartada: string;
    readonly vendida: string;
    readonly otra: string;
    readonly total: string;
  };
}

function CustomTooltip({ active, payload, label, labels }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const total = payload.reduce(
    (sum, entry) => sum + (typeof entry.value === 'number' ? entry.value : 0),
    0,
  );
  const labelMap: Record<string, string> = {
    disponible: labels.disponible,
    apartada: labels.apartada,
    vendida: labels.vendida,
    otra: labels.otra,
  };
  return (
    <div
      style={{
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <div style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map((entry) => {
        const key = typeof entry.dataKey === 'string' ? entry.dataKey : '';
        const display = labelMap[key] ?? key;
        return (
          <div key={key} style={{ color: entry.color, display: 'flex', gap: 8 }}>
            <span>{display}:</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {INTEGER_FORMATTER.format(typeof entry.value === 'number' ? entry.value : 0)}
            </span>
          </div>
        );
      })}
      <div
        style={{
          color: 'var(--canon-cream)',
          marginTop: 4,
          borderTop: '1px solid var(--color-border-subtle)',
          paddingTop: 4,
          display: 'flex',
          gap: 8,
        }}
      >
        <span>{labels.total}:</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {INTEGER_FORMATTER.format(total)}
        </span>
      </div>
    </div>
  );
}

export function InventorySnapshot({ proyectos, height = 320 }: InventorySnapshotProps) {
  const t = useTranslations('dev.inventory');
  const chartId = useId();

  const rows = useMemo(() => proyectos.map((p) => ({ ...p })), [proyectos]);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const tooltipLabels = {
    disponible: t('disponible'),
    apartada: t('apartada'),
    vendida: t('vendida'),
    otra: t('otra'),
    total: t('total'),
  };

  if (rows.length === 0) {
    return (
      <p role="status" className="text-sm text-[color:var(--color-text-muted)]">
        {t('empty')}
      </p>
    );
  }

  return (
    <figure className="flex flex-col gap-2" aria-label={t('aria')} data-chart-id={chartId}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={rows as ProyectoSnapshot[]}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 4, left: 16 }}
        >
          <XAxis type="number" stroke="var(--color-text-muted)" fontSize={11} />
          <YAxis
            type="category"
            dataKey="nombre"
            stroke="var(--color-text-muted)"
            fontSize={11}
            width={120}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={props.payload as ReadonlyArray<TooltipPayloadEntry> | undefined}
                label={typeof props.label === 'string' ? props.label : undefined}
                labels={tooltipLabels}
              />
            )}
            cursor={{ fill: 'var(--color-surface-raised)', opacity: 0.4 }}
          />
          <Bar
            dataKey="disponible"
            stackId="inv"
            fill={COLOR_DISPONIBLE}
            isAnimationActive={!prefersReducedMotion}
          />
          <Bar
            dataKey="apartada"
            stackId="inv"
            fill={COLOR_APARTADA}
            isAnimationActive={!prefersReducedMotion}
          />
          <Bar
            dataKey="vendida"
            stackId="inv"
            fill={COLOR_VENDIDA}
            isAnimationActive={!prefersReducedMotion}
          />
          <Bar
            dataKey="otra"
            stackId="inv"
            fill={COLOR_OTRA}
            isAnimationActive={!prefersReducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">{t('tableCaption')}</figcaption>
      <table className="sr-only">
        <caption>{t('tableCaption')}</caption>
        <thead>
          <tr>
            <th>{t('proyecto')}</th>
            <th>{t('disponible')}</th>
            <th>{t('apartada')}</th>
            <th>{t('vendida')}</th>
            <th>{t('otra')}</th>
            <th>{t('total')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.proyecto_id}>
              <td>{row.nombre}</td>
              <td>{INTEGER_FORMATTER.format(row.disponible)}</td>
              <td>{INTEGER_FORMATTER.format(row.apartada)}</td>
              <td>{INTEGER_FORMATTER.format(row.vendida)}</td>
              <td>{INTEGER_FORMATTER.format(row.otra)}</td>
              <td>{INTEGER_FORMATTER.format(row.units_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default InventorySnapshot;
