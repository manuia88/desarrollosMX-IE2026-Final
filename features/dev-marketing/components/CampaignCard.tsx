'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { CampaignAnalyticsPanel } from './CampaignAnalyticsPanel';

export interface CampaignRowView {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: string;
  readonly status: string;
  readonly presupuesto_mxn: number;
  readonly start_date: string;
  readonly end_date: string;
  readonly proyecto_ids: readonly string[];
}

interface Props {
  readonly campaign: CampaignRowView;
}

export function CampaignCard({ campaign }: Props) {
  const t = useTranslations('dev.marketing.campaigns');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const utils = trpc.useUtils();
  const pause = trpc.devMarketing.pauseCampaign.useMutation({
    onSuccess: () => utils.devMarketing.listCampaigns.invalidate(),
  });

  const dateRange = `${formatDate(campaign.start_date)} → ${formatDate(campaign.end_date)}`;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-[color:var(--color-text-primary)]">{campaign.nombre}</p>
          <p className="text-xs text-[color:var(--color-text-secondary)]">
            {t(`types.${campaign.tipo}` as 'types.launch')}
          </p>
        </div>
        <span
          role="status"
          className="rounded-full bg-[color:var(--color-surface-raised)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[color:var(--color-text-secondary)]"
        >
          {t(`statuses.${campaign.status}` as 'statuses.draft')}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs text-[color:var(--color-text-secondary)]">
        <Stat label={t('budgetLabel')} value={formatBudget(campaign.presupuesto_mxn)} />
        <Stat label={t('dateRangeLabel')} value={dateRange} />
        <Stat label={t('projectsLabel')} value={String(campaign.proyecto_ids.length)} />
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAnalytics((s) => !s)}
          aria-expanded={showAnalytics}
        >
          {showAnalytics ? t('hideAnalytics') : t('showAnalytics')}
        </Button>
        {campaign.status === 'active' ? (
          <Button
            variant="ghost-solid"
            size="sm"
            onClick={() => pause.mutate({ campaignId: campaign.id })}
            disabled={pause.isPending}
          >
            {t('pauseCta')}
          </Button>
        ) : null}
      </div>
      {showAnalytics ? <CampaignAnalyticsPanel campaignId={campaign.id} /> : null}
    </Card>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="uppercase tracking-wide opacity-70">{label}</dt>
      <dd className="font-medium text-[color:var(--color-text-primary)]">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function formatBudget(mxn: number): string {
  if (mxn >= 1_000_000) return `$${(mxn / 1_000_000).toFixed(1)}M MXN`;
  if (mxn >= 1_000) return `$${(mxn / 1_000).toFixed(0)}K MXN`;
  return `$${mxn} MXN`;
}
