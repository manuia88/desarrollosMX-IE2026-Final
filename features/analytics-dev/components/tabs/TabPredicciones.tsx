'use client';

import { useTranslations } from 'next-intl';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';
import { DisclosureBadge } from '../DisclosureBadge';

interface Props {
  readonly proyectoId: string;
}

const FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const PHASE_TONE: Record<string, string> = {
  expansion: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  recuperacion: 'border-sky-300 bg-sky-50 text-sky-900',
  pico: 'border-amber-300 bg-amber-50 text-amber-900',
  contraccion: 'border-rose-300 bg-rose-50 text-rose-900',
  insufficient: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function TabPredicciones({ proyectoId }: Props) {
  const t = useTranslations('dev.analytics.predicciones');
  const q = trpc.analyticsDev.getPredictions.useQuery({ proyectoId }, { retry: false });

  if (q.isLoading)
    return <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>;
  if (q.error) return <Card className="p-4">{q.error.message}</Card>;
  if (!q.data) return null;

  const { cycle, launchTiming, cashFlow, masterRecommendation, disclosure } = q.data;

  return (
    <div className="space-y-4">
      <Card className="grid gap-4 p-4 lg:grid-cols-3">
        <section className="space-y-2">
          <header className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t('cycle.title')}</h3>
            <DisclosureBadge disclosure={disclosure} />
          </header>
          <div
            className={`rounded-[var(--radius-md)] border p-3 ${PHASE_TONE[cycle.fase] ?? 'border-slate-200 bg-slate-50'}`}
          >
            <p className="text-xs uppercase tracking-wide">{t('cycle.fase')}</p>
            <p className="text-2xl font-semibold capitalize">{t(`cycle.phases.${cycle.fase}`)}</p>
            <p className="text-xs">{t('cycle.confidence', { pct: cycle.confidence_pct })}</p>
          </div>
          <p className="text-sm text-[color:var(--color-text-secondary)]">{cycle.mensaje}</p>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('launch.title')}</h3>
          <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-3">
            <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
              {t('launch.recommended')}
            </p>
            <p className="text-lg font-semibold capitalize">
              {launchTiming.recommended.mes_nombre} · sem {launchTiming.recommended.semana}
            </p>
            <p className="text-xs">
              {t('launch.score', { score: launchTiming.recommended.score })}
            </p>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={launchTiming.monthlyScores.map((s, i) => ({
                  mes: t(`launch.months.${i}`),
                  score: s,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="score" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('cashFlow.title')}</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat
              label={t('cashFlow.breakeven')}
              value={cashFlow.breakeven_month !== null ? `m${cashFlow.breakeven_month}` : '—'}
            />
            <Stat
              label={t('cashFlow.cumulative')}
              value={FORMATTER.format(cashFlow.cumulative_final)}
            />
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow.monthly.slice(0, 12).map((m) => ({ ...m }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="ingresos" fill="#10b981" />
                <Bar dataKey="egresos" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-semibold">{t('master.title')}</h3>
        <p className="mt-2 rounded-[var(--radius-md)] bg-[color:var(--color-surface-raised)] p-3 text-sm">
          {masterRecommendation}
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
