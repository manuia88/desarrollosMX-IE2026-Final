'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.5 — Usage stats card.
// Renderiza usage del current period con progress bar gradient firma + amber/red tinting
// cuando usedPct >= 0.8 / >= 1. Banners warningThreshold80 + warningThreshold100.
// ADR-050 canon: Card elevated, big numbers Outfit 800 + tabular-nums, motion ≤ 850ms.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--canon-cream-2)',
};

const bigNumberStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '40px',
  lineHeight: 1.05,
  letterSpacing: '-0.015em',
  fontVariantNumeric: 'tabular-nums',
  color: '#FFFFFF',
};

const subtleStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: 'var(--canon-cream-2)',
};

const errorStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: '#fca5a5',
};

const skeletonStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: '180px',
};

export interface UsageStatsCardProps {
  readonly testId?: string;
}

export function UsageStatsCard({ testId }: UsageStatsCardProps) {
  const t = useTranslations('Studio.usage');
  const query = trpc.studio.usage.getCurrent.useQuery();

  if (query.isLoading) {
    return (
      <div
        aria-hidden="true"
        style={skeletonStyle}
        data-testid={`${testId ?? 'usage-stats'}-skeleton`}
      />
    );
  }

  if (query.error || !query.data) {
    return (
      <Card variant="elevated" className="p-6" role="alert" data-testid={testId}>
        <p style={errorStyle}>{t('errorLoading')}</p>
      </Card>
    );
  }

  const { used, limit, remaining, usedPct, thresholdReached80, thresholdReached100, period } =
    query.data;

  const clampedPct = Math.max(0, Math.min(usedPct, 1));
  const progressPctStr = `${Math.round(clampedPct * 100)}%`;

  let progressBackground = 'linear-gradient(90deg, #6366F1, #EC4899)';
  if (thresholdReached100) {
    progressBackground = 'linear-gradient(90deg, #ef4444, #f87171)';
  } else if (thresholdReached80) {
    progressBackground = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  }

  const progressTrackStyle: CSSProperties = {
    width: '100%',
    height: '10px',
    borderRadius: '9999px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid var(--canon-border)',
    overflow: 'hidden',
  };

  const progressFillStyle: CSSProperties = {
    width: progressPctStr,
    height: '100%',
    background: progressBackground,
    borderRadius: '9999px',
    transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <Card variant="elevated" className="flex flex-col gap-5 p-6" data-testid={testId}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span style={labelStyle}>{t('currentPeriodLabel')}</span>
          <span style={{ ...subtleStyle, fontVariantNumeric: 'tabular-nums' }}>{period}</span>
        </div>
        <DisclosurePill tone="indigo" aria-label={t('videosUsedLabel')}>
          {t('videosUsedLabel')}
        </DisclosurePill>
      </header>

      <div className="flex flex-col gap-2">
        <span style={bigNumberStyle} data-testid="usage-of-limit">
          {t('videosOfLimit', { used, limit })}
        </span>
        <span style={subtleStyle}>
          {t('videosRemainingLabel')}:{' '}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{remaining}</span>
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-label={t('videosUsedLabel')}
        style={progressTrackStyle}
        data-testid="usage-progress"
        data-warning={thresholdReached80 ? 'true' : 'false'}
        data-blocker={thresholdReached100 ? 'true' : 'false'}
      >
        <div style={progressFillStyle} aria-hidden="true" />
      </div>

      {thresholdReached100 ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] p-4"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.32)',
          }}
          data-testid="usage-blocker-banner"
        >
          <p style={{ ...subtleStyle, color: '#fca5a5' }}>{t('warningThreshold100')}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.assign('/studio#pricing');
            }}
          >
            {t('upgradePlanCta')}
          </Button>
        </div>
      ) : thresholdReached80 ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] p-4"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.32)',
          }}
          data-testid="usage-warning-banner"
        >
          <p style={{ ...subtleStyle, color: '#fcd34d' }}>{t('warningThreshold80')}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.assign('/studio#pricing');
            }}
          >
            {t('upgradePlanCta')}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
