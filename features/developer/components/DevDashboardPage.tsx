'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { DevCompanyHeader } from '@/features/developer/components/DevCompanyHeader';
import { DevKpiGrid } from '@/features/developer/components/DevKpiGrid';
import { DevQuickActions } from '@/features/developer/components/DevQuickActions';
import { DevProfileWidget } from '@/features/developer/components/dashboard/DevProfileWidget';
import { KPIsMini } from '@/features/developer/components/dashboard/KPIsMini';
import { MarketPulseCard } from '@/features/developer/components/dashboard/MarketPulseCard';
import { TrustScoreHero } from '@/features/developer/components/dashboard/TrustScoreHero';
import { UpcomingActions } from '@/features/developer/components/dashboard/UpcomingActions';
import { WeeklyCarousel } from '@/features/developer/components/dashboard/WeeklyCarousel';
import { WelcomeChecklistBanner } from '@/features/developer/components/dashboard/WelcomeChecklistBanner';
import { InventorySnapshot } from '@/features/developer/components/InventorySnapshot';
import { MorningBriefingDev } from '@/features/developer/components/MorningBriefingDev';
import { PendientesList } from '@/features/developer/components/PendientesList';
import { TrustScoreDrawer } from '@/features/developer/components/trust-score/TrustScoreDrawer';
import { trpc } from '@/shared/lib/trpc/client';
import { Breadcrumbs } from '@/shared/ui/layout/breadcrumbs';

export interface DevDashboardPageProps {
  readonly company: {
    readonly name: string;
    readonly legalName: string | null;
    readonly taxId: string | null;
    readonly logoUrl: string | null;
    readonly yearsOperating: number | null;
    readonly isVerified: boolean;
  };
}

export function DevDashboardPage({ company }: DevDashboardPageProps) {
  const t = useTranslations('dev.dashboard');
  const tBc = useTranslations('dev.layout.breadcrumbs');
  const [trustOpen, setTrustOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const trustScore = trpc.developer.getTrustScore.useQuery(undefined, { retry: false });
  const kpis = trpc.developer.getKpis.useQuery(undefined, { retry: false });
  const inventory = trpc.developer.getInventorySnapshot.useQuery(undefined, { retry: false });
  const pendientes = trpc.developer.getPendientes.useQuery(undefined, { retry: false });

  const briefingMutation = trpc.developer.generateMorningBriefingDev.useMutation();
  const briefing = briefingMutation.data ?? null;
  const handleRegenerate = useCallback(() => {
    briefingMutation.mutate({ forceRegenerate: true });
  }, [briefingMutation]);

  const trustHeaderScore = {
    score: trustScore.data?.score_overall ?? null,
    level: trustScore.data?.level ?? null,
  };

  const projectsActive = kpis.data?.proyectos_activos ?? null;

  const checklistSteps = [
    { key: 'firstProject', done: (projectsActive ?? 0) > 0 },
    { key: 'firstPhotos', done: (inventory.data?.proyectos.length ?? 0) > 0 },
    { key: 'docsValidation', done: company.isVerified },
    { key: 'distributionChannel', done: false },
    { key: 'accountingConnect', done: false },
  ];

  const upcomingItems = [
    { key: 'documents', count: pendientes.data?.documents.count ?? 0 },
    { key: 'landings', count: pendientes.data?.landings.count ?? 0 },
    { key: 'cfdis', count: pendientes.data?.cfdis.count ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs tint="lavender" items={[{ label: tBc('home') }, { label: tBc('dashboard') }]} />

      <DevCompanyHeader
        company={company}
        trustScore={trustHeaderScore}
        onTrustScoreClick={() => setTrustOpen(true)}
      />

      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
      >
        {t('greeting', { companyName: company.name })}
      </h1>

      {!welcomeDismissed ? (
        <WelcomeChecklistBanner
          steps={checklistSteps}
          onDismiss={() => setWelcomeDismissed(true)}
        />
      ) : null}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TrustScoreHero
          score={trustScore.data?.score_overall ?? null}
          delta={null}
          isPlaceholder={trustScore.data?.is_placeholder ?? true}
          onClickDetail={() => setTrustOpen(true)}
        />
        <WeeklyCarousel />
        <UpcomingActions items={upcomingItems} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DevProfileWidget company={company} projectsActive={projectsActive} />
        <MarketPulseCard narrative={null} source={null} isPlaceholder />
      </section>

      <KPIsMini />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MorningBriefingDev
          briefing={briefing}
          isLoading={briefingMutation.isPending}
          onRegenerate={handleRegenerate}
        />
        {kpis.data ? (
          <DevKpiGrid
            kpis={{
              proyectos_activos: kpis.data.proyectos_activos,
              unidades_vendidas: kpis.data.unidades_vendidas,
              revenue_mxn: kpis.data.revenue_mxn,
              conversion_pct: kpis.data.conversion_pct,
              tickets_open: kpis.data.tickets_open,
            }}
            rangeFrom={kpis.data.rangeFrom}
            rangeTo={kpis.data.rangeTo}
          />
        ) : (
          <p role="status" className="text-sm" style={{ color: 'var(--canon-cream-2)' }}>
            {t('loading.kpis')}
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {inventory.data ? (
            <InventorySnapshot proyectos={inventory.data.proyectos} />
          ) : (
            <p role="status" className="text-sm" style={{ color: 'var(--canon-cream-2)' }}>
              {t('loading.inventory')}
            </p>
          )}
        </div>
        {pendientes.data ? <PendientesList pendientes={pendientes.data} /> : null}
      </section>

      <section className="space-y-3">
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('quickActions')}
        </h2>
        <DevQuickActions />
      </section>

      <TrustScoreDrawer
        open={trustOpen}
        onClose={() => setTrustOpen(false)}
        trustScore={
          trustScore.data
            ? {
                score: trustScore.data.score_overall,
                level: trustScore.data.level,
                breakdown: trustScore.data.breakdown,
                improvements: trustScore.data.improvements,
                citations: trustScore.data.citations,
                is_placeholder: trustScore.data.is_placeholder,
              }
            : null
        }
      />
    </div>
  );
}
