'use client';

// FASE 14.F.2 Sprint 1 — DMX Studio Recent videos grid + empty state.
// ADR-050 canon: Card elevated, gradient firma SOLO en cifras hero, motion ≤ 850ms.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';
import { StudioCreateVideoButton } from './StudioCreateVideoButton';

export interface StudioRecentVideoRow {
  readonly id: string;
  readonly title: string | null;
  readonly status: string;
  readonly projectType: string;
  readonly renderedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StudioRecentVideosGridProps {
  readonly locale: string;
  readonly videos: ReadonlyArray<StudioRecentVideoRow>;
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '20px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const itemTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '14.5px',
  color: '#FFFFFF',
  lineHeight: 1.3,
};

const STATUS_TONE: Record<string, 'indigo' | 'violet' | 'amber' | 'rose'> = {
  draft: 'amber',
  scripting: 'amber',
  rendering: 'indigo',
  rendered: 'violet',
  published: 'violet',
  failed: 'rose',
};

function statusTone(status: string): 'indigo' | 'violet' | 'amber' | 'rose' {
  return STATUS_TONE[status] ?? 'indigo';
}

export function StudioRecentVideosGrid({ locale, videos }: StudioRecentVideosGridProps) {
  const t = useTranslations('Studio.dashboard');

  if (videos.length === 0) {
    return (
      <section aria-label={t('recentVideosTitle')} className="flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <h2 style={titleStyle}>{t('recentVideosTitle')}</h2>
          <DisclosurePill tone="violet" aria-label={t('wrappedComingSoon')}>
            {t('wrappedComingSoon')}
          </DisclosurePill>
        </header>
        <Card
          variant="elevated"
          className="flex flex-col items-center gap-4 px-8 py-12 text-center"
          data-testid="studio-empty-state"
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '18px',
              color: '#FFFFFF',
            }}
          >
            {t('emptyStateTitle')}
          </p>
          <StudioCreateVideoButton
            locale={locale}
            variant="ghost"
            size="md"
            labelKey="emptyStateCta"
            testId="studio-empty-state-cta"
          />
        </Card>
      </section>
    );
  }

  return (
    <section aria-label={t('recentVideosTitle')} className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h2 style={titleStyle}>{t('recentVideosTitle')}</h2>
        <DisclosurePill tone="violet" aria-label={t('wrappedComingSoon')}>
          {t('wrappedComingSoon')}
        </DisclosurePill>
      </header>
      <ul
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        style={{ listStyle: 'none', padding: 0, margin: 0 }}
      >
        {videos.map((video) => (
          <li key={video.id}>
            <Card variant="elevated" hoverable className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <DisclosurePill tone={statusTone(video.status)}>{video.status}</DisclosurePill>
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--canon-cream-2)', letterSpacing: '0.04em' }}
                >
                  {video.projectType}
                </span>
              </div>
              <p style={itemTitleStyle}>{video.title ?? video.id.slice(0, 8)}</p>
              <span
                className="text-[12px]"
                style={{ color: 'var(--canon-cream-2)', fontVariantNumeric: 'tabular-nums' }}
              >
                {new Date(video.updatedAt).toLocaleDateString(locale, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
