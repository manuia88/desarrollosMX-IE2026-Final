'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';
import { DisclosureBadge } from '../DisclosureBadge';

interface Props {
  readonly proyectoId: string;
}

export function TabAbsorcion({ proyectoId }: Props) {
  const t = useTranslations('dev.analytics.absorcion');
  const [shock, setShock] = useState(0);
  const q = trpc.analyticsDev.getAbsorptionForecast.useQuery(
    { proyectoId, horizonMonths: 24, priceShockPct: shock },
    { retry: false },
  );

  if (q.isLoading)
    return <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>;
  if (q.error) return <Card className="p-4">{q.error.message}</Card>;
  if (!q.data) return null;

  const eta = q.data.etaSoldOut;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t('title')}</h2>
          <DisclosureBadge disclosure={q.data.disclosure} />
        </header>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          <Stat label={t('velocityActual')} value={q.data.velocity.actual.toFixed(2)} unit="u/m" />
          <Stat
            label={t('velocityBenchmark')}
            value={q.data.velocity.benchmark.toFixed(2)}
            unit="u/m"
          />
          <Stat label={t('etaOpt')} value={eta.optimista !== null ? `${eta.optimista}m` : '—'} />
          <Stat label={t('etaBase')} value={eta.base !== null ? `${eta.base}m` : '—'} />
          <Stat label={t('etaPes')} value={eta.pesimista !== null ? `${eta.pesimista}m` : '—'} />
        </div>
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={q.data.monthly} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="optimista"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line type="monotone" dataKey="base" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="pesimista"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('priceShockLabel', { value: shock })}</span>
          <input
            type="range"
            min={-15}
            max={15}
            step={1}
            value={shock}
            onChange={(e) => setShock(Number(e.target.value))}
            aria-label={t('priceShockAria')}
          />
        </label>
        <p className="rounded-[var(--radius-md)] bg-[color:var(--color-surface-raised)] p-3 text-sm text-[color:var(--color-text-primary)]">
          {q.data.narrative}
        </p>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-2">
      <p className="text-[10px] uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums">
        {value}
        {unit ? (
          <span className="ml-1 text-xs text-[color:var(--color-text-secondary)]">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}
