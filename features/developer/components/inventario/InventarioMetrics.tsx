'use client';

import { useTranslations } from 'next-intl';
import type { InventarioMetricsResult } from '@/features/developer/schemas';

interface InventarioMetricsProps {
  metrics: InventarioMetricsResult | null | undefined;
  isLoading: boolean;
  locale: string;
}

export function InventarioMetrics({ metrics, isLoading, locale }: InventarioMetricsProps) {
  const t = useTranslations('dev.inventario.metrics');
  const fmt = (n: number | null) =>
    n == null ? t('noData') : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
  const fmtPct = (n: number | null) =>
    n == null ? t('noData') : `${(Math.round(n * 10) / 10).toFixed(1)}%`;
  const fmtMxn = (n: number | null) =>
    n == null
      ? t('noData')
      : new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'MXN',
          maximumFractionDigits: 0,
        }).format(n);

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7" aria-busy="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list, fixed length
            key={i}
            className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"
          />
        ))}
      </div>
    );
  }

  const items: Array<{ key: string; label: string; value: string; tone?: string }> = [
    { key: 'total', label: t('total'), value: fmt(metrics.total) },
    { key: 'disponible', label: t('disponible'), value: fmt(metrics.disponible), tone: 'emerald' },
    { key: 'apartada', label: t('apartada'), value: fmt(metrics.apartada), tone: 'amber' },
    { key: 'vendida', label: t('vendida'), value: fmt(metrics.vendida), tone: 'blue' },
    {
      key: 'absorption',
      label: t('absorption30dShort'),
      value: fmtPct(metrics.absorption_30d_pct),
    },
    {
      key: 'precioM2',
      label: t('precioPromedioM2'),
      value: fmtMxn(metrics.precio_promedio_m2_mxn),
    },
    {
      key: 'days',
      label: t('daysOnMarketP50'),
      value: metrics.days_on_market_p50 == null ? t('noData') : `${metrics.days_on_market_p50}d`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      {items.map((it) => (
        <div
          key={it.key}
          className="rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.06]"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/50">{it.label}</div>
          <div
            className={`mt-1 font-display text-xl font-bold tabular-nums ${
              it.tone === 'emerald'
                ? 'text-emerald-300'
                : it.tone === 'amber'
                  ? 'text-amber-300'
                  : it.tone === 'blue'
                    ? 'text-blue-300'
                    : 'text-white'
            }`}
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
