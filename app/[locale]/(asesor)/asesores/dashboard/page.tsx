import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  ActivityFeed,
  BadgesRow,
  deriveAllKpis,
  deriveMood,
  deriveStreak,
  HeroPulse,
  KpiStrip,
  loadDashboardSummary,
  MorningBriefing,
  PipelineCarousel,
  pipelineDaysProjection,
  SmartRecommendations,
  StreakWidget,
  TodayAgenda,
  XpProgressBar,
} from '@/features/asesor-dashboard';
import type { ActivityItem } from '@/features/asesor-dashboard/components/daily-standup/ActivityFeed';
import type { AgendaEvent } from '@/features/asesor-dashboard/components/daily-standup/TodayAgenda';
import type { BadgeItem } from '@/features/asesor-dashboard/components/performance-today/BadgesRow';
import type { Recommendation } from '@/features/asesor-dashboard/components/performance-today/SmartRecommendations';
import { MarketingTodayWidget } from '@/features/marketing/components/MarketingTodayWidget';
import { TareasTodayWidget } from '@/features/tareas/components/TareasTodayWidget';
import { createClient } from '@/shared/lib/supabase/server';

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

function formatRelativeMinutes(iso: string, now: Date): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export default async function AsesorDashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name')
    .eq('id', user.id)
    .maybeSingle();

  const asesorName = profile?.first_name ?? '';
  const summary = await loadDashboardSummary(user.id);
  const kpis = deriveAllKpis(summary);
  const mood = deriveMood(summary);
  const streak = deriveStreak(summary.operaciones);
  const projectionDays = pipelineDaysProjection(summary.deals);
  const t = await getTranslations('AsesorDashboard');

  const now = new Date();
  const activity: ActivityItem[] = summary.operaciones.slice(0, 8).map((op) => ({
    id: op.id,
    label: t('activity.operacionLabel', {
      ref: op.id.slice(0, 8),
      status: op.fiscal_status ?? '—',
    }),
    relativeTime: op.closed_at ? formatRelativeMinutes(op.closed_at, now) : '—',
    isNew: false,
  }));

  const todayAgenda: AgendaEvent[] = [];
  const briefingBullets: string[] =
    summary.hasAnyData && kpis.pipelineMxn !== null
      ? [
          t('briefing.bulletPipeline', {
            count: summary.deals.filter((d) => d.closed_at === null).length,
          }),
          t('briefing.bulletLeads', { count: kpis.leadsLast7d }),
          t('briefing.bulletVisits', { count: kpis.visitsLast7dCount }),
        ]
      : [];

  const badges: BadgeItem[] = [
    {
      id: 'first-deal',
      label: t('badges.firstDeal'),
      unlocked: summary.deals.length > 0,
      tone: 'indigo',
      isNew: summary.deals.length === 1,
    },
    {
      id: 'first-close',
      label: t('badges.firstClose'),
      unlocked: summary.operaciones.some((o) => o.closed_at !== null),
      tone: 'gold',
    },
    {
      id: 'streak-3',
      label: t('badges.streak3'),
      unlocked: streak.days >= 3,
      tone: 'teal',
    },
    {
      id: 'streak-7',
      label: t('badges.streak7'),
      unlocked: streak.days >= 7,
      tone: 'rose',
    },
    {
      id: 'pipeline-1m',
      label: t('badges.pipeline1m'),
      unlocked: (kpis.pipelineMxn ?? 0) >= 1_000_000,
      tone: 'violet',
    },
    {
      id: 'leads-10',
      label: t('badges.leads10'),
      unlocked: kpis.leadsCount >= 10,
      tone: 'indigo',
    },
  ];

  const recommendations: Recommendation[] = summary.hasAnyData
    ? [
        {
          id: 'next-action',
          title: t('recommendations.nextAction.title'),
          body: t('recommendations.nextAction.body'),
          confidence: 0.72,
          ctaLabel: t('recommendations.nextAction.cta'),
        },
        {
          id: 'cold-deals',
          title: t('recommendations.coldDeals.title'),
          body: t('recommendations.coldDeals.body', {
            count: summary.deals.filter((d) => d.closed_at === null).length,
          }),
          confidence: 0.65,
          ctaLabel: t('recommendations.coldDeals.cta'),
        },
        {
          id: 'top-leads',
          title: t('recommendations.topLeads.title'),
          body: t('recommendations.topLeads.body'),
          confidence: 0.58,
          ctaLabel: t('recommendations.topLeads.cta'),
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <HeroPulse
        asesorName={asesorName}
        pipelineMxn={kpis.pipelineMxn}
        pipelineDaysProjection={projectionDays}
        mood={mood}
        isSyntheticData={!summary.hasAnyData}
      />
      <KpiStrip
        pipelineMxn={kpis.pipelineMxn}
        leadsCount={kpis.leadsCount}
        leadsLast7d={kpis.leadsLast7d}
        visitsLast7dCount={kpis.visitsLast7dCount}
        visitsLast7dSeries={kpis.visitsLast7dSeries}
        avgCloseDays={kpis.avgCloseDays}
        xpLevel={kpis.xpLevel}
        xpCurrent={kpis.xpCurrent}
        xpNextThreshold={kpis.xpNextThreshold}
      />
      <TareasTodayWidget locale={locale} />
      <MarketingTodayWidget locale={locale} />
      <PipelineCarousel deals={summary.deals} />
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MorningBriefing bullets={briefingBullets} />
        <TodayAgenda events={todayAgenda} />
      </section>
      <ActivityFeed items={activity} />
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StreakWidget days={streak.days} bars={streak.bars} />
        <XpProgressBar level={kpis.xpLevel} current={kpis.xpCurrent} next={kpis.xpNextThreshold} />
      </section>
      <BadgesRow badges={badges} />
      <SmartRecommendations items={recommendations} />
    </div>
  );
}
