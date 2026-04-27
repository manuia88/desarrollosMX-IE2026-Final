'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { LandingCard } from './LandingCard';
import { LandingWizard } from './LandingWizard';

export interface LandingsSectionProps {
  locale: string;
}

export function LandingsSection({ locale }: LandingsSectionProps) {
  const t = useTranslations('Marketing');
  const [wizardOpen, setWizardOpen] = useState(false);
  const list = trpc.marketing.landings.list.useQuery({ limit: 50 });
  const utils = trpc.useUtils();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--canon-white-pure)]">
          {t('landings.heading', { count: list.data?.length ?? 0 })}
        </h2>
        <Button type="button" variant="primary" size="sm" onClick={() => setWizardOpen(true)}>
          {t('landings.actions.new')}
        </Button>
      </div>

      {list.isLoading ? (
        <Card className="p-6 text-sm text-[color:rgba(255,255,255,0.65)]">
          {t('common.loading')}
        </Card>
      ) : !list.data || list.data.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-[color:rgba(255,255,255,0.70)]">{t('landings.empty.body')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.data.map((row) => (
            <LandingCard key={row.id} landing={row} locale={locale} />
          ))}
        </div>
      )}

      {wizardOpen ? (
        <LandingWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setWizardOpen(false);
            utils.marketing.landings.list.invalidate();
          }}
        />
      ) : null}
    </div>
  );
}
