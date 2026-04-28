'use client';

import { useTranslations } from 'next-intl';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';
import { cn } from '@/shared/ui/primitives/cn';
import { DisclosureBadge } from '../DisclosureBadge';

interface Props {
  readonly proyectoId: string;
}

const ALERT_TONE: Record<string, string> = {
  normal: 'bg-emerald-100 text-emerald-900',
  warning: 'bg-amber-100 text-amber-900',
  critical: 'bg-rose-100 text-rose-900',
};

export function TabCostos({ proyectoId }: Props) {
  const t = useTranslations('dev.analytics.costos');
  const q = trpc.analyticsDev.getCostTracker.useQuery({ proyectoId }, { retry: false });

  if (q.isLoading)
    return <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>;
  if (q.error) return <Card className="p-4">{q.error.message}</Card>;
  if (!q.data) return null;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t('title')}</h2>
          <DisclosureBadge disclosure={q.data.disclosure} />
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
              ALERT_TONE[q.data.alertLevel] ?? 'bg-slate-100 text-slate-900',
            )}
          >
            {t(`alerts.${q.data.alertLevel}`)}
          </span>
          <span className="text-xs text-[color:var(--color-text-secondary)]">
            {t('weightedDelta', { value: q.data.weightedDelta.toFixed(2) })}
          </span>
          <span className="text-xs text-[color:var(--color-text-secondary)]">
            {t('score', { value: q.data.score })}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat
            label={t('breakdown.inpp')}
            value={`${q.data.breakdown.inpp_construccion.toFixed(2)}%`}
          />
          <Stat
            label={t('breakdown.materiales')}
            value={`${q.data.breakdown.materiales.toFixed(2)}%`}
          />
          <Stat
            label={t('breakdown.manoObra')}
            value={`${q.data.breakdown.mano_obra.toFixed(2)}%`}
          />
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={q.data.serie.map((s) => ({ ...s }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="inpp"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="rounded-[var(--radius-md)] bg-[color:var(--color-surface-raised)] p-3 text-sm">
          {q.data.narrative}
        </p>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-2">
      <p className="text-[10px] uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
