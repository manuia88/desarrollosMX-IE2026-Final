'use client';

// FASE 14.F.3 Sprint 2 BIBLIA — Cross-function M01 widget (F.3.6).
// Conditional render: si user tiene >0 videos Studio. Si 0, hidden (NO clutter).

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export interface StudioVideosWidgetProps {
  readonly locale: string;
}

interface VideoOutputShape {
  readonly id: string;
  readonly project_id: string;
  readonly thumbnail_url: string | null;
  readonly format: '9x16' | '1x1' | '16x9';
  readonly created_at: string;
  readonly studio_video_projects: {
    readonly title: string;
    readonly project_type: string;
  } | null;
}

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: '20px 24px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 10,
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '17px',
  lineHeight: 1.25,
  letterSpacing: '-0.01em',
  color: 'var(--canon-white-pure)',
  margin: 0,
};

const counterStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '13px',
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--canon-cream-2)',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12,
};

const thumbStyle: CSSProperties = {
  position: 'relative',
  aspectRatio: '9 / 16',
  borderRadius: 'var(--canon-radius-card)',
  overflow: 'hidden',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-card-border-default)',
};

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 38,
  padding: '0 18px',
  borderRadius: 'var(--canon-radius-pill)',
  backgroundImage: 'linear-gradient(90deg, #6366F1, #EC4899)',
  color: '#ffffff',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  fontWeight: 600,
  textDecoration: 'none',
  alignSelf: 'flex-start',
};

export function StudioVideosWidget({ locale }: StudioVideosWidgetProps) {
  const t = useTranslations('AsesorDashboard.studioVideosWidget');
  const countQuery = trpc.studio.library.countByUser.useQuery();
  const listQuery = trpc.studio.library.list.useQuery(
    { limit: 3, dateRange: 'all' },
    { enabled: (countQuery.data?.count ?? 0) > 0 },
  );

  if (countQuery.isLoading) return null;
  if (!countQuery.data || countQuery.data.count === 0) return null;

  const videos = (listQuery.data ?? []) as ReadonlyArray<VideoOutputShape>;
  const total = countQuery.data.count;

  return (
    <FadeUp delay={0.1}>
      <Card variant="elevated" data-testid="studio-videos-widget" style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <DisclosurePill tone="violet">{t('badge')}</DisclosurePill>
            <h2 style={titleStyle}>{t('title')}</h2>
          </div>
          <span style={counterStyle}>{t('totalLabel', { count: total })}</span>
        </div>
        {videos.length > 0 ? (
          <div style={gridStyle}>
            {videos.map((video) => (
              <Link
                key={video.id}
                href={`/${locale}/studio-app/projects/${video.project_id}`}
                aria-label={t('thumbAria', { title: video.studio_video_projects?.title ?? '' })}
                style={thumbStyle}
              >
                {video.thumbnail_url ? (
                  <span
                    role="img"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${video.thumbnail_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                      opacity: 0.35,
                    }}
                  />
                )}
              </Link>
            ))}
          </div>
        ) : null}
        <Link
          href={`/${locale}/studio-app/library`}
          aria-label={t('ctaAria')}
          data-testid="studio-videos-widget-cta"
          style={ctaStyle}
        >
          {t('cta')}
        </Link>
      </Card>
    </FadeUp>
  );
}
