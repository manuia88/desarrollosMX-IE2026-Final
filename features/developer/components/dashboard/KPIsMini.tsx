'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';

type Metrics = {
  total: number;
  disponible: number;
  apartada: number;
  vendida: number;
  otra: number;
  absorption_30d_pct: number | null;
  precio_promedio_m2_mxn: number | null;
  days_on_market_p50: number | null;
};

export function KPIsMini() {
  const t = useTranslations('dev.dashboard.kpisMini');
  const { data, isLoading } = trpc.developer.inventarioMetrics.useQuery(
    {},
    { staleTime: 60_000, retry: false },
  );
  const m = (data as Metrics | undefined) ?? null;

  const numberStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  };

  const items = [
    {
      key: 'absorption',
      label: t('absorption'),
      value:
        m?.absorption_30d_pct === null || m?.absorption_30d_pct === undefined
          ? '—'
          : `${m.absorption_30d_pct.toFixed(1)}%`,
    },
    {
      key: 'stock',
      label: t('stock'),
      value: m === null ? '—' : String(m.disponible + m.apartada),
    },
    {
      key: 'days_on_market',
      label: t('daysOnMarket'),
      value:
        m === null || m.days_on_market_p50 === null
          ? '—'
          : t('daysValue', { count: m.days_on_market_p50 }),
    },
  ];

  return (
    <Card className="grid grid-cols-3 gap-4 p-6">
      {items.map((it) => (
        <div key={it.key} className="flex flex-col gap-1.5">
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            {it.label}
          </span>
          <span
            className="text-2xl"
            style={{ ...numberStyle, color: 'var(--canon-cream)' }}
            aria-busy={isLoading}
          >
            {it.value}
          </span>
        </div>
      ))}
    </Card>
  );
}
