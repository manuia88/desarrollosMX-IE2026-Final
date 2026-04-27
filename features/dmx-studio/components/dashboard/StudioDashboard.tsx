'use client';

// FASE 14.F.2 Sprint 1 — DMX Studio Dashboard orchestrator (Client Component).
// Consume tRPC studio.dashboard.{getStats, getRecentVideos, getCrossFunctionSuggestions}.
// ADR-050 canon: pill buttons, brand gradient firma, motion ≤ 850ms,
// prefers-reduced-motion respect (vía tokens.css globales).

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { IconCircle } from '@/shared/ui/primitives/canon';
import { StudioCreateVideoButton } from './StudioCreateVideoButton';
import { StudioCrossFunctionBanner } from './StudioCrossFunctionBanner';
import { StudioRecentVideosGrid } from './StudioRecentVideosGrid';
import { StudioStatCard } from './StudioStatCard';

export interface StudioDashboardProps {
  readonly locale: string;
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  letterSpacing: '-0.015em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '14px',
  lineHeight: 1.55,
};

const skeletonStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: '120px',
};

const VIDEOS_REMAINING_LOW_THRESHOLD = 3;

const videoIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="6" width="14" height="12" rx="2" />
    <path d="m17 10 4-2v8l-4-2" />
  </svg>
);

const sparkleIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
  </svg>
);

const buildingIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2" />
  </svg>
);

const starIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m12 3 2.6 5.6 6 .6-4.5 4 1.3 5.9L12 16.9l-5.5 2.2 1.3-5.9-4.5-4 6-.6Z" />
  </svg>
);

export function StudioDashboard({ locale }: StudioDashboardProps) {
  const t = useTranslations('Studio.dashboard');

  const statsQuery = trpc.studio.dashboard.getStats.useQuery();
  const recentVideosQuery = trpc.studio.dashboard.getRecentVideos.useQuery();
  const crossFunctionQuery = trpc.studio.dashboard.getCrossFunctionSuggestions.useQuery();

  const stats = statsQuery.data;
  const videos = recentVideosQuery.data ?? [];
  const crossFunction = crossFunctionQuery.data ?? { developers: [], captaciones: [] };

  const isLoading = statsQuery.isLoading;

  const videosThisMonth = stats?.videosThisMonth ?? 0;
  const videosLimit = stats?.videosLimit ?? 0;
  const videosRemaining = stats?.videosRemaining ?? 0;
  const activeProjects = stats?.activeProjects ?? 0;
  const avgRating = stats?.avgFeedbackRating ?? null;

  const remainingTone = videosRemaining < VIDEOS_REMAINING_LOW_THRESHOLD ? 'ai' : 'default';

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FadeUp delay={0}>
          <div className="flex flex-col gap-2">
            <h1 style={headingStyle}>{t('title')}</h1>
            <p style={subtitleStyle}>{t('subtitle')}</p>
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <StudioCreateVideoButton locale={locale} testId="studio-create-video-button" />
        </FadeUp>
      </header>

      {crossFunctionQuery.data && (
        <FadeUp delay={0.15}>
          <StudioCrossFunctionBanner
            locale={locale}
            developers={crossFunction.developers}
            captaciones={crossFunction.captaciones}
          />
        </FadeUp>
      )}

      <FadeUp delay={0.2}>
        <section
          aria-label={t('statsLabel')}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="studio-stats-grid"
        >
          {isLoading ? (
            <>
              <div aria-hidden="true" style={skeletonStyle} />
              <div aria-hidden="true" style={skeletonStyle} />
              <div aria-hidden="true" style={skeletonStyle} />
              <div aria-hidden="true" style={skeletonStyle} />
            </>
          ) : (
            <>
              <StudioStatCard
                label={t('statVideosThisMonth')}
                value={String(videosThisMonth)}
                hint={t('statVideosThisMonthHint', { limit: videosLimit })}
                icon={<IconCircle tone="indigo" size="sm" icon={videoIcon} />}
                testId="studio-stat-videos-this-month"
              />
              <StudioStatCard
                label={t('statVideosRemaining')}
                value={String(videosRemaining)}
                hint={
                  remainingTone === 'ai' ? t('statVideosRemainingLow') : t('statVideosRemainingOk')
                }
                icon={<IconCircle tone="violet" size="sm" icon={sparkleIcon} />}
                tone={remainingTone}
                testId="studio-stat-videos-remaining"
              />
              <StudioStatCard
                label={t('statActiveProjects')}
                value={String(activeProjects)}
                hint={t('statActiveProjectsHint')}
                icon={<IconCircle tone="teal" size="sm" icon={buildingIcon} />}
                testId="studio-stat-active-projects"
              />
              <StudioStatCard
                label={t('statAvgRating')}
                value={avgRating === null ? '—' : avgRating.toFixed(1)}
                hint={t('statAvgRatingHint')}
                icon={<IconCircle tone="gold" size="sm" icon={starIcon} />}
                testId="studio-stat-avg-rating"
              />
            </>
          )}
        </section>
      </FadeUp>

      <FadeUp delay={0.3}>
        <StudioRecentVideosGrid locale={locale} videos={videos} />
      </FadeUp>
    </>
  );
}
