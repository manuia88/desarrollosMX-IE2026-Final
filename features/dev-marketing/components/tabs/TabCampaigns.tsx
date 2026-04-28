'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { CampaignCard, type CampaignRowView } from '../CampaignCard';
import { CampaignWizard } from '../CampaignWizard';

export function TabCampaigns() {
  const t = useTranslations('dev.marketing.campaigns');
  const [wizardOpen, setWizardOpen] = useState(false);
  const q = trpc.devMarketing.listCampaigns.useQuery({ limit: 50 }, { retry: false });
  const campaigns = (q.data ?? []) as CampaignRowView[];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[color:var(--color-text-primary)]">
          {t('listTitle')}
        </h2>
        <Button onClick={() => setWizardOpen(true)} variant="primary" size="sm">
          {t('newCta')}
        </Button>
      </header>

      {q.isLoading ? (
        <Card className="p-6 text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</Card>
      ) : q.error ? (
        <Card className="p-4 text-sm text-rose-700">{q.error.message}</Card>
      ) : campaigns.length === 0 ? (
        <Card className="space-y-2 p-6 text-center">
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('empty')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {wizardOpen ? (
        <CampaignWizard onClose={() => setWizardOpen(false)} onCreated={() => q.refetch()} />
      ) : null}
    </div>
  );
}
