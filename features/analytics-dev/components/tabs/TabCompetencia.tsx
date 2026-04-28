'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { cn } from '@/shared/ui/primitives/cn';
import { DisclosureBadge } from '../DisclosureBadge';

interface Props {
  readonly proyectoId: string;
}

const SEVERITY_TONE: Record<string, string> = {
  low: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  medium: 'border-sky-300 bg-sky-50 text-sky-900',
  high: 'border-amber-300 bg-amber-50 text-amber-900',
  critical: 'border-rose-300 bg-rose-50 text-rose-900',
};

export function TabCompetencia({ proyectoId }: Props) {
  const t = useTranslations('dev.analytics.competencia');
  const compQ = trpc.analyticsDev.getCompetitiveIntel.useQuery({ proyectoId }, { retry: false });
  const monitorsQ = trpc.analyticsDev.listMonitors.useQuery({ myProyectoId: proyectoId });
  const alertsQ = trpc.analyticsDev.listAlerts.useQuery(
    { myProyectoId: proyectoId, unreadOnly: false },
    { retry: false },
  );
  const utils = trpc.useUtils();
  const createMonitor = trpc.analyticsDev.createMonitor.useMutation({
    onSuccess: () => {
      utils.analyticsDev.listMonitors.invalidate({ myProyectoId: proyectoId });
      utils.analyticsDev.listAlerts.invalidate({ myProyectoId: proyectoId });
    },
  });
  const deleteMonitor = trpc.analyticsDev.deleteMonitor.useMutation({
    onSuccess: () => {
      utils.analyticsDev.listMonitors.invalidate({ myProyectoId: proyectoId });
    },
  });
  const markRead = trpc.analyticsDev.markAlertRead.useMutation({
    onSuccess: () => {
      utils.analyticsDev.listAlerts.invalidate({ myProyectoId: proyectoId });
    },
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [extName, setExtName] = useState('');
  const [extUrl, setExtUrl] = useState('');

  const radar = useMemo(() => compQ.data?.radar ?? [], [compQ.data]);
  const data = compQ.data;

  if (compQ.isLoading)
    return <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>;
  if (compQ.error) return <Card className="p-4">{compQ.error.message}</Card>;
  if (!data) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extName.trim()) return;
    createMonitor.mutate({
      myProyectoId: proyectoId,
      competitorExternalName: extName.trim(),
      competitorExternalUrl: extUrl.trim().length > 0 ? extUrl.trim() : null,
      metricsTracked: ['price', 'inventory', 'avance', 'ads'],
    });
    setExtName('');
    setExtUrl('');
    setShowAddForm(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card className="space-y-3 p-4">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{t('title')}</h2>
            <p className="text-xs text-[color:var(--color-text-secondary)]">
              {t('score', { score: data.score })}
            </p>
          </div>
          <DisclosureBadge disclosure={data.disclosure} />
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
                <th className="px-2 py-1.5">{t('cols.project')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.precio_m2')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.amenidades')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.absorcion')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.dom')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.quality')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.momentum')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.similarity')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[color:var(--color-surface-raised)] font-semibold">
                <td className="px-2 py-1.5">{data.myProject.nombre}</td>
                {(
                  ['precio_m2', 'amenidades', 'absorcion', 'dom', 'quality', 'momentum'] as const
                ).map((dim) => (
                  <td key={dim} className="px-2 py-1.5 text-right tabular-nums">
                    {Number(data.myProject.metrics[dim] ?? 0).toFixed(2)}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right">—</td>
              </tr>
              {data.competitors.map((c) => (
                <tr key={c.nombre} className="border-t border-[color:var(--color-border-subtle)]">
                  <td className="px-2 py-1.5">{c.nombre}</td>
                  {(
                    ['precio_m2', 'amenidades', 'absorcion', 'dom', 'quality', 'momentum'] as const
                  ).map((dim) => {
                    const mine = Number(data.myProject.metrics[dim] ?? 0);
                    const rival = Number(c.metrics[dim] ?? 0);
                    const better = ['precio_m2', 'dom'].includes(dim) ? rival > mine : mine > rival;
                    return (
                      <td
                        key={dim}
                        className={cn(
                          'px-2 py-1.5 text-right tabular-nums',
                          better
                            ? 'text-emerald-700'
                            : Math.abs(mine - rival) / Math.max(1, mine + rival) < 0.05
                              ? 'text-amber-700'
                              : 'text-rose-700',
                        )}
                      >
                        {rival.toFixed(2)}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {(c.similarity * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar.map((r) => ({ ...r, dim: t(`dims.${r.dim}`) }))}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={45} />
              <Radar dataKey="mine" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
              <Radar dataKey="avgRivals" stroke="#ec4899" fill="#ec4899" fillOpacity={0.15} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="rounded-[var(--radius-md)] bg-[color:var(--color-surface-raised)] p-3 text-sm">
          {data.gapAnalysis}
        </p>
      </Card>

      <Card className="space-y-3 p-4">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('radar.title')}</h3>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? t('radar.cancel') : t('radar.addMonitor')}
          </Button>
        </header>
        {showAddForm ? (
          <form onSubmit={handleSubmit} className="space-y-2 text-sm">
            <input
              type="text"
              value={extName}
              onChange={(e) => setExtName(e.target.value)}
              placeholder={t('radar.namePlaceholder')}
              required
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-2 py-1"
            />
            <input
              type="url"
              value={extUrl}
              onChange={(e) => setExtUrl(e.target.value)}
              placeholder={t('radar.urlPlaceholder')}
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-2 py-1"
            />
            <Button type="submit" size="sm" variant="primary" disabled={createMonitor.isPending}>
              {t('radar.save')}
            </Button>
          </form>
        ) : null}

        <ul className="space-y-1 text-sm">
          {(monitorsQ.data ?? []).map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] p-2"
            >
              <span>{m.competitor_external_name ?? m.competitor_proyecto_id ?? '—'}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => deleteMonitor.mutate({ monitorId: m.id })}
              >
                {t('radar.remove')}
              </Button>
            </li>
          ))}
          {(monitorsQ.data ?? []).length === 0 ? (
            <li className="text-xs text-[color:var(--color-text-secondary)]">{t('radar.empty')}</li>
          ) : null}
        </ul>

        <h4 className="mt-2 text-xs uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
          {t('radar.alertsFeed')}
        </h4>
        <ul className="space-y-2 text-sm">
          {(alertsQ.data ?? []).map((a) => (
            <li
              key={a.id}
              className={cn(
                'rounded-[var(--radius-md)] border p-2',
                SEVERITY_TONE[a.severity] ?? 'border-[color:var(--color-border-subtle)]',
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide">
                {t(`radar.alertTypes.${a.alert_type}`)}
              </p>
              <p className="text-sm">{a.ai_narrative ?? t('radar.alertEmpty')}</p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-[color:var(--color-text-tertiary)]">
                <span>{new Date(a.detected_at).toLocaleDateString()}</span>
                {a.read_at === null ? (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => markRead.mutate({ alertId: a.id })}
                  >
                    {t('radar.markRead')}
                  </button>
                ) : (
                  <span>{t('radar.read')}</span>
                )}
              </div>
            </li>
          ))}
          {(alertsQ.data ?? []).length === 0 ? (
            <li className="text-xs text-[color:var(--color-text-secondary)]">
              {t('radar.alertsEmpty')}
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
