'use client';

import { useTranslations } from 'next-intl';
import { trpc } from '@/shared/lib/trpc/client';

interface Props {
  readonly campaignId: string;
}

export function CampaignAnalyticsPanel({ campaignId }: Props) {
  const t = useTranslations('dev.marketing.analytics');
  const q = trpc.devMarketing.getCampaignAnalytics.useQuery(
    { campaignId, rangeDays: 30 },
    { retry: false },
  );

  if (q.isLoading) {
    return (
      <p className="text-xs text-[color:var(--color-text-secondary)]">{t('loadingAnalytics')}</p>
    );
  }
  if (q.error) {
    return <p className="text-xs text-rose-700">{q.error.message}</p>;
  }
  if (!q.data) return null;

  const { totals } = q.data;
  return (
    <dl className="grid grid-cols-3 gap-2 rounded-md border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-3 text-[11px]">
      <Stat label={t('impressions')} value={fmtInt(totals.impressions)} />
      <Stat label={t('clicks')} value={fmtInt(totals.clicks)} />
      <Stat label={t('ctr')} value={fmtPct(totals.ctr)} />
      <Stat label={t('leads')} value={fmtInt(totals.leads)} />
      <Stat label={t('cpl')} value={fmtMxn(totals.cplMxn)} />
      <Stat label={t('cac')} value={fmtMxn(totals.cacMxn)} />
    </dl>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="uppercase tracking-wide text-[color:var(--color-text-tertiary)]">{label}</dt>
      <dd className="font-medium text-[color:var(--color-text-primary)]">{value}</dd>
    </div>
  );
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('es-MX').format(n);
}

function fmtPct(n: number | null): string {
  if (n === null) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function fmtMxn(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
