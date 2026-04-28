'use client';

import { useTranslations } from 'next-intl';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';
import { DisclosureBadge } from '../DisclosureBadge';

interface Props {
  readonly proyectoId: string;
}

export function TabPmf({ proyectoId }: Props) {
  const t = useTranslations('dev.analytics.pmf');
  const q = trpc.analyticsDev.getPmfAnalysis.useQuery({ proyectoId }, { retry: false });

  if (q.isLoading)
    return <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>;
  if (q.error) return <Card className="p-4">{q.error.message}</Card>;
  if (!q.data) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t('title')}</h2>
          <DisclosureBadge disclosure={q.data.disclosure} />
        </header>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label={t('score')} value={String(q.data.score)} />
          <Stat label={t('matchPct')} value={`${q.data.matchPct.toFixed(1)}%`} />
          <Stat label={t('demandTotal')} value={String(q.data.demandaTotal)} />
        </div>
        <h3 className="text-sm font-semibold">{t('gapsTitle')}</h3>
        {q.data.gaps.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('gapsEmpty')}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {q.data.gaps.map((g) => (
              <li
                key={g.criteria}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] p-2"
              >
                <span>{g.criteria}</span>
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-medium text-rose-900">
                  {g.count}
                </span>
              </li>
            ))}
          </ul>
        )}
        {q.data.oportunidades.length > 0 ? (
          <div className="rounded-[var(--radius-md)] bg-[color:var(--color-surface-raised)] p-3 text-sm">
            <p className="mb-1 font-semibold">{t('oportunidadesTitle')}</p>
            <ul className="list-disc pl-4">
              {q.data.oportunidades.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">{t('historicoTitle')}</h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={q.data.historico.map((h) => ({ ...h }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
