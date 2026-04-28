'use client';

// F14.F.12 mini-cleanup — Social publish button (STUB ADR-018 H2 disabled state).
//
// 4 señales canon ADR-018:
//   (1) STUB comment + heuristic message
//   (2) onClick = no-op (handler bound, but disabled state prevents activation)
//   (3) UI flag visible: DisclosurePill "STUB H2" + tooltip + aria-disabled="true"
//   (4) L-NEW pointer per platform: L-NEW-STUDIO-{INSTAGRAM,TIKTOK,FACEBOOK}-PUBLISH-ACTIVATE

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { SocialPlatform } from '@/features/dmx-studio/lib/social-publishers';
import { Button, DisclosurePill } from '@/shared/ui/primitives/canon';

export interface SocialPublishButtonProps {
  readonly platform: SocialPlatform;
  readonly videoUrl: string;
  readonly disabled?: boolean;
}

const PLATFORM_LABEL_KEY: Record<SocialPlatform, string> = {
  instagram: 'instagramLabel',
  tiktok: 'tiktokLabel',
  facebook: 'facebookLabel',
};

const PLATFORM_ARIA_KEY: Record<SocialPlatform, string> = {
  instagram: 'instagramAriaLabel',
  tiktok: 'tiktokAriaLabel',
  facebook: 'facebookAriaLabel',
};

const containerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
};

export function SocialPublishButton({
  platform,
  videoUrl: _videoUrl,
  disabled = true,
}: SocialPublishButtonProps) {
  const t = useTranslations('Studio.socialPublishers');
  const labelKey = PLATFORM_LABEL_KEY[platform];
  const ariaKey = PLATFORM_ARIA_KEY[platform];
  // STUB — activar H2 (force disabled hasta feature flag activado)
  const isDisabled = true || disabled;

  return (
    <span style={containerStyle}>
      <Button
        type="button"
        variant="glass"
        size="sm"
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={t(ariaKey)}
        title={t('comingSoonTooltip')}
        data-platform={platform}
        data-stub-h2="true"
      >
        {t(labelKey)}
      </Button>
      <DisclosurePill tone="amber" data-stub-flag="true">
        {t('stubBadge')}
      </DisclosurePill>
    </span>
  );
}
