'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { DevKpiCard } from './DevKpiCard';

export interface DevKpiGridProps {
  readonly kpis: {
    readonly proyectos_activos: number;
    readonly unidades_vendidas: number;
    readonly revenue_mxn: number;
    readonly conversion_pct: number | null;
    readonly tickets_open: number;
  };
  readonly rangeFrom: string;
  readonly rangeTo: string;
}

const MXN_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const INTEGER_FORMATTER = new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 0,
});

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}

export function DevKpiGrid({ kpis, rangeFrom, rangeTo }: DevKpiGridProps) {
  const t = useTranslations('dev.kpis');

  const formatted = useMemo(
    () => ({
      proyectosActivos: INTEGER_FORMATTER.format(kpis.proyectos_activos),
      unidadesVendidas: INTEGER_FORMATTER.format(kpis.unidades_vendidas),
      revenueMxn: MXN_FORMATTER.format(kpis.revenue_mxn),
      conversionPct: formatPct(kpis.conversion_pct),
      ticketsOpen: INTEGER_FORMATTER.format(kpis.tickets_open),
    }),
    [kpis],
  );

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[color:var(--canon-cream)]">
        {t('sectionTitle', { rangeFrom, rangeTo })}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DevKpiCard label={t('proyectosActivos')} value={formatted.proyectosActivos} />
        <DevKpiCard label={t('unidadesVendidas')} value={formatted.unidadesVendidas} />
        <DevKpiCard label={t('revenueMxn')} value={formatted.revenueMxn} />
        <DevKpiCard label={t('conversionPct')} value={formatted.conversionPct} />
        <DevKpiCard label={t('ticketsOpen')} value={formatted.ticketsOpen} />
      </div>
    </section>
  );
}

export default DevKpiGrid;
