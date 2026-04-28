'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ATTRIBUTION_MODELS, type AttributionModel } from '@/features/dev-marketing/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { cn } from '@/shared/ui/primitives/cn';

interface CampaignOption {
  readonly id: string;
  readonly nombre: string;
}

interface RecommendationRow {
  readonly campaignId: string;
  readonly nombre: string;
  readonly action: 'continue' | 'pause' | 'scale' | 'optimize';
  readonly cplMxn: number | null;
  readonly cplRatio: number | null;
  readonly roi: number | null;
  readonly ctr: number | null;
  readonly reasoning: string;
}

const CHANNEL_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6'];

export function TabAttribution() {
  const t = useTranslations('dev.marketing.attribution');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [model, setModel] = useState<AttributionModel>('linear');

  const campaignsQ = trpc.devMarketing.listCampaigns.useQuery({ limit: 50 }, { retry: false });
  const campaigns = (campaignsQ.data ?? []) as CampaignOption[];

  useEffect(() => {
    if (!campaignId && campaigns.length > 0) setCampaignId(campaigns[0]?.id ?? null);
  }, [campaigns, campaignId]);

  const reportQ = trpc.devMarketing.getAttributionReport.useQuery(
    campaignId
      ? { campaignId, model }
      : { campaignId: '00000000-0000-0000-0000-000000000000', model },
    { retry: false, enabled: Boolean(campaignId) },
  );
  const recsQ = trpc.devMarketing.getOptimizerRecommendations.useQuery(
    { rangeDays: 7, limit: 20 },
    { retry: false },
  );
  const utils = trpc.useUtils();
  const apply = trpc.devMarketing.applyOptimizerAction.useMutation({
    onSuccess: () => {
      utils.devMarketing.getOptimizerRecommendations.invalidate();
      utils.devMarketing.listCampaigns.invalidate();
    },
  });

  const waterfall = useMemo(() => {
    if (!reportQ.data) return [];
    return reportQ.data.waterfall.map((b, i) => ({
      channel: b.channel,
      share: Number((b.share * 100).toFixed(1)),
      weight: Number(b.weight.toFixed(2)),
      touches: b.touches,
      fill: CHANNEL_COLORS[i % CHANNEL_COLORS.length] ?? '#6366f1',
    }));
  }, [reportQ.data]);

  const recommendations = (recsQ.data?.recommendations ?? []) as RecommendationRow[];

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold">{t('title')}</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-2">
              <span className="text-[color:var(--color-text-secondary)]">
                {t('campaignSelect')}
              </span>
              <select
                value={campaignId ?? ''}
                onChange={(e) => setCampaignId(e.target.value || null)}
                className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] px-3 py-1 text-xs"
              >
                <option value="">{t('campaignPlaceholder')}</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-1">
              {ATTRIBUTION_MODELS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={model === m}
                  onClick={() => setModel(m)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5',
                    model === m
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-[color:var(--color-border-subtle)] text-[color:var(--color-text-secondary)]',
                  )}
                >
                  {t(`models.${m}`)}
                </button>
              ))}
            </div>
          </div>
        </header>

        {!campaignId ? (
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('selectFirst')}</p>
        ) : reportQ.isLoading ? (
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>
        ) : reportQ.error ? (
          <p className="text-sm text-rose-700">{reportQ.error.message}</p>
        ) : (
          <>
            <p className="text-xs text-[color:var(--color-text-secondary)]">
              {t('summaryLine', {
                leads: reportQ.data?.leadsCount ?? 0,
                events: reportQ.data?.eventsCount ?? 0,
              })}
            </p>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfall} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="channel" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="share" name={t('shareTooltip')}>
                    {waterfall.map((row) => (
                      <Cell key={row.channel} fill={row.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t('recommendationsTitle')}</h2>
          {recsQ.isLoading ? (
            <span className="text-xs text-[color:var(--color-text-secondary)]">{t('loading')}</span>
          ) : null}
        </header>
        {recsQ.error ? <p className="text-xs text-rose-700">{recsQ.error.message}</p> : null}
        {recommendations.length === 0 && !recsQ.isLoading ? (
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('noRecs')}</p>
        ) : (
          <ul className="space-y-2">
            {recommendations.map((r) => (
              <li
                key={r.campaignId}
                className="flex flex-col gap-2 rounded-md border border-[color:var(--color-border-subtle)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium text-[color:var(--color-text-primary)]">{r.nombre}</p>
                  <p className="text-[11px] text-[color:var(--color-text-secondary)]">
                    {t('cpl')}: {fmtMxn(r.cplMxn)} · ROI: {fmtNum(r.roi)}x · CTR: {fmtPct(r.ctr)}
                  </p>
                  <p className="text-[11px] text-[color:var(--color-text-secondary)]">
                    {t('aiReasoning')}: {r.reasoning}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase',
                      r.action === 'pause' && 'bg-rose-100 text-rose-800',
                      r.action === 'scale' && 'bg-emerald-100 text-emerald-800',
                      r.action === 'optimize' && 'bg-amber-100 text-amber-800',
                      r.action === 'continue' && 'bg-slate-100 text-slate-700',
                    )}
                  >
                    {t(`recommendations.${r.action}`)}
                  </span>
                  {r.action !== 'continue' ? (
                    <Button
                      variant="ghost-solid"
                      size="sm"
                      onClick={() => apply.mutate({ campaignId: r.campaignId, action: r.action })}
                      disabled={apply.isPending}
                    >
                      {t('applyAction')}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function fmtMxn(n: number | null): string {
  if (n === null) return '—';
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number | null): string {
  if (n === null) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function fmtNum(n: number | null): string {
  if (n === null) return '—';
  return n.toFixed(2);
}
