'use client';

// F14.F.12 mini-cleanup — Per-platform card UI (STUB ADR-018 visible state).
// Canon ADR-050: pill border-radius + surface-elevated + var(--canon-cream).
// SVG inline geométrico simple, NO assets externos.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { SocialPlatform } from '@/features/dmx-studio/lib/social-publishers';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';
import { SocialPublishButton } from './SocialPublishButton';

export interface PublishingPlatformCardProps {
  readonly platform: SocialPlatform;
  readonly videoUrl: string;
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '15px',
  color: 'var(--canon-cream)',
  letterSpacing: '-0.01em',
};

const descriptionStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '12px',
  lineHeight: 1.5,
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const PLATFORM_TITLE_KEY: Record<SocialPlatform, string> = {
  instagram: 'instagramTitle',
  tiktok: 'tiktokTitle',
  facebook: 'facebookTitle',
};

const PLATFORM_DESCRIPTION_KEY: Record<SocialPlatform, string> = {
  instagram: 'instagramDescription',
  tiktok: 'tiktokDescription',
  facebook: 'facebookDescription',
};

function PlatformIcon({ platform }: { readonly platform: SocialPlatform }) {
  // Geometric inline SVG (canon: NO descargar assets externos).
  if (platform === 'instagram') {
    return (
      <svg
        width={28}
        height={28}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x={3} y={3} width={22} height={22} rx={6} stroke="url(#ig-grad)" strokeWidth={2} />
        <circle cx={14} cy={14} r={5} stroke="url(#ig-grad)" strokeWidth={2} />
        <circle cx={20} cy={8} r={1.5} fill="url(#ig-grad)" />
        <defs>
          <linearGradient id="ig-grad" x1={3} y1={3} x2={25} y2={25}>
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
  if (platform === 'tiktok') {
    return (
      <svg
        width={28}
        height={28}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M16 4v13.5a3.5 3.5 0 1 1-3.5-3.5"
          stroke="var(--canon-cream)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="M16 4c.5 2.5 2.5 4.5 5 5"
          stroke="var(--canon-cream)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // facebook
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx={14} cy={14} r={11} stroke="var(--canon-indigo-2)" strokeWidth={2} />
      <path
        d="M16 9h-1.5c-1 0-1.5.5-1.5 1.5V13H11v2h2v6h2v-6h2l.5-2H15v-1.5c0-.5.2-.5.5-.5H16V9z"
        fill="var(--canon-indigo-2)"
      />
    </svg>
  );
}

export function PublishingPlatformCard({ platform, videoUrl }: PublishingPlatformCardProps) {
  const t = useTranslations('Studio.socialPublishers');
  const titleKey = PLATFORM_TITLE_KEY[platform];
  const descriptionKey = PLATFORM_DESCRIPTION_KEY[platform];

  return (
    <Card variant="elevated" className="flex flex-col gap-3 p-4" data-platform={platform}>
      <div style={headerRowStyle}>
        <PlatformIcon platform={platform} />
        <span style={titleStyle}>{t(titleKey)}</span>
        <DisclosurePill tone="amber">{t('comingSoonBadge')}</DisclosurePill>
      </div>
      <p style={descriptionStyle}>{t(descriptionKey)}</p>
      <SocialPublishButton platform={platform} videoUrl={videoUrl} disabled />
    </Card>
  );
}
