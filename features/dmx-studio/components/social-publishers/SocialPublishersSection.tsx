'use client';

// F14.F.12 mini-cleanup — Social publishers grouped section.
// Render 3 platforms (Instagram + TikTok + Facebook) STUB ADR-018 H2.
// Inyectado en ResultPage.tsx después de FeedbackForm.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { getSupportedPlatforms } from '@/features/dmx-studio/lib/social-publishers';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';
import { PublishingPlatformCard } from './PublishingPlatformCard';

export interface SocialPublishersSectionProps {
  readonly videoUrl: string;
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '20px',
  color: 'var(--canon-cream)',
  letterSpacing: '-0.01em',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '13px',
  lineHeight: 1.55,
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
};

export function SocialPublishersSection({ videoUrl }: SocialPublishersSectionProps) {
  const t = useTranslations('Studio.socialPublishers');
  const platforms = getSupportedPlatforms();

  return (
    <Card
      variant="elevated"
      className="flex flex-col gap-4 p-5"
      data-testid="social-publishers-section"
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 style={headingStyle}>{t('sectionTitle')}</h2>
          <DisclosurePill tone="amber">{t('stubBadge')}</DisclosurePill>
        </div>
        <p style={subtitleStyle}>{t('sectionDescription')}</p>
      </header>
      <div style={gridStyle}>
        {platforms.map((platform) => (
          <PublishingPlatformCard key={platform} platform={platform} videoUrl={videoUrl} />
        ))}
      </div>
    </Card>
  );
}
