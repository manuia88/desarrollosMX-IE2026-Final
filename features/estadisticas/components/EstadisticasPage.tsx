'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { RechartsPipelineFunnel } from '@/features/estadisticas/components/charts/RechartsPipelineFunnel';
import { RechartsRevenueLine } from '@/features/estadisticas/components/charts/RechartsRevenueLine';
import { RechartsVisitsBar } from '@/features/estadisticas/components/charts/RechartsVisitsBar';
import { RechartsZoneHeatmap } from '@/features/estadisticas/components/charts/RechartsZoneHeatmap';
import {
  DateRangeSelector,
  getDefaultRange,
} from '@/features/estadisticas/components/DateRangeSelector';
import { KpiGrid } from '@/features/estadisticas/components/KpiGrid';
import { MetricsSlideOver } from '@/features/estadisticas/components/MetricsSlideOver';
import { PedagogyDrawer } from '@/features/estadisticas/components/PedagogyDrawer';
import { TeamComparisonOverlay } from '@/features/estadisticas/components/TeamComparisonOverlay';
import type { KpiKey } from '@/features/estadisticas/lib/thresholds';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';

export interface EstadisticasPageProps {
  readonly rangeFrom: string;
  readonly rangeTo: string;
}

export function EstadisticasPage({ rangeFrom, rangeTo }: EstadisticasPageProps) {
  const t = useTranslations('estadisticas');
  const initialRange = rangeFrom && rangeTo ? { rangeFrom, rangeTo } : getDefaultRange();

  const [pedagogyKey, setPedagogyKey] = useState<KpiKey | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);

  const semaforo = trpc.estadisticas.getMetricsSemaforo.useQuery(initialRange);
  const funnel = trpc.estadisticas.getPipelineFunnel.useQuery(initialRange);
  const revenue = trpc.estadisticas.getRevenueByMonth.useQuery(initialRange);
  const visits = trpc.estadisticas.getVisitsConversion.useQuery(initialRange);
  const zones = trpc.estadisticas.getZonesActivity.useQuery(initialRange);
  const team = trpc.estadisticas.getTeamComparison.useQuery(initialRange, {
    enabled: teamOpen,
    retry: false,
  });

  const handleCardClick = useCallback((key: KpiKey) => {
    setPedagogyKey(key);
  }, []);

  const handleAction = useCallback((_key: KpiKey) => {
    setPedagogyKey(null);
  }, []);

  if (semaforo.isError) {
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        <h1 className="text-2xl font-bold">{t('page.title')}</h1>
        <div
          role="alert"
          className="rounded-md border border-[color:var(--color-border-subtle,#e5e7eb)] p-4 text-sm"
        >
          {t('errors.loadFailed')}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--canon-cream)' }}>
            {t('page.title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--canon-cream-2)' }}>
            {t('page.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeSelector />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setTeamOpen(true)}
            aria-label={t('team.toggle')}
          >
            {t('team.toggle')}
          </Button>
        </div>
      </header>

      {semaforo.isLoading ? (
        <div role="status" className="text-sm" style={{ color: 'var(--canon-cream-2)' }}>
          {t('page.loading')}
        </div>
      ) : semaforo.data ? (
        <KpiGrid kpis={semaforo.data.kpis} onCardClick={handleCardClick} />
      ) : null}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <article className="space-y-2">
          <h3 className="text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
            {t('charts.revenue.title')}
          </h3>
          {revenue.data ? <RechartsRevenueLine data={revenue.data.series} /> : null}
        </article>
        <article className="space-y-2">
          <h3 className="text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
            {t('charts.funnel.title')}
          </h3>
          {funnel.data ? <RechartsPipelineFunnel stages={funnel.data.stages} /> : null}
        </article>
        <article className="space-y-2">
          <h3 className="text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
            {t('charts.visits.title')}
          </h3>
          {visits.data ? (
            <RechartsVisitsBar
              data={visits.data.series}
              slaUnavailable={visits.data.slaUnavailable}
            />
          ) : null}
        </article>
        <article className="space-y-2">
          <h3 className="text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
            {t('charts.zones.title')}
          </h3>
          {zones.data ? <RechartsZoneHeatmap heatmap={zones.data.heatmap} /> : null}
        </article>
      </section>

      {semaforo.data ? <MetricsSlideOver kpis={semaforo.data.kpis} /> : null}

      <PedagogyDrawer
        kpiKey={pedagogyKey}
        open={pedagogyKey !== null}
        onClose={() => setPedagogyKey(null)}
        onAction={handleAction}
      />

      {teamOpen && team.data ? (
        <TeamComparisonOverlay
          self={team.data.self}
          teamAvg={team.data.teamAvg}
          topAnonymous={team.data.topAnonymous}
          teamSize={team.data.teamSize}
          open={teamOpen}
          onClose={() => setTeamOpen(false)}
        />
      ) : null}
    </main>
  );
}
