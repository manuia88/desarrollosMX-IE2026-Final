'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
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

interface CampaignOption {
  readonly id: string;
  readonly nombre: string;
}

interface AnalyticsRow {
  readonly date: string;
  readonly channel: string;
  readonly impressions: number;
  readonly clicks: number;
  readonly leads: number;
  readonly spend_mxn: number;
}

export function TabAnalytics() {
  const t = useTranslations('dev.marketing.analyticsTab');
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const campaignsQ = trpc.devMarketing.listCampaigns.useQuery({ limit: 50 }, { retry: false });
  const campaigns = (campaignsQ.data ?? []) as CampaignOption[];

  useEffect(() => {
    if (!campaignId && campaigns.length > 0) setCampaignId(campaigns[0]?.id ?? null);
  }, [campaigns, campaignId]);

  const analyticsQ = trpc.devMarketing.getCampaignAnalytics.useQuery(
    campaignId
      ? { campaignId, rangeDays: 30 }
      : { campaignId: '00000000-0000-0000-0000-000000000000', rangeDays: 30 },
    { retry: false, enabled: Boolean(campaignId) },
  );

  const daily = (analyticsQ.data?.daily ?? []) as AnalyticsRow[];
  const aggregated = aggregateByDate(daily);

  return (
    <Card className="space-y-3 p-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <label className="flex items-center gap-2 text-xs">
          <span className="text-[color:var(--color-text-secondary)]">{t('campaignSelect')}</span>
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
      </header>

      {!campaignId ? (
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('selectFirst')}</p>
      ) : analyticsQ.isLoading ? (
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>
      ) : analyticsQ.error ? (
        <p className="text-sm text-rose-700">{analyticsQ.error.message}</p>
      ) : aggregated.length === 0 ? (
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('empty')}</p>
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={aggregated} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="impressions"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
              <Line type="monotone" dataKey="clicks" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="leads" stroke="#ec4899" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="rounded-md border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-2 text-[11px] text-[color:var(--color-text-secondary)]">
        {t('funnelHint')}
      </p>
    </Card>
  );
}

interface AggregatedRow {
  readonly date: string;
  readonly impressions: number;
  readonly clicks: number;
  readonly leads: number;
  readonly spend: number;
}

function aggregateByDate(rows: readonly AnalyticsRow[]): readonly AggregatedRow[] {
  const map = new Map<string, AggregatedRow>();
  for (const r of rows) {
    const prev = map.get(r.date) ?? {
      date: r.date,
      impressions: 0,
      clicks: 0,
      leads: 0,
      spend: 0,
    };
    map.set(r.date, {
      date: r.date,
      impressions: prev.impressions + (r.impressions ?? 0),
      clicks: prev.clicks + (r.clicks ?? 0),
      leads: prev.leads + (r.leads ?? 0),
      spend: prev.spend + Number(r.spend_mxn ?? 0),
    });
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
