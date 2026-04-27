'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.2 — BeatSyncIndicator badge.
// Render-only component: muestra DisclosurePill violet cuando hasBeatSync=true.
// Otherwise null. ARIA-labelled for screen readers.

import { useTranslations } from 'next-intl';
import { DisclosurePill } from '@/shared/ui/primitives/canon';

export interface BeatSyncIndicatorProps {
  readonly hasBeatSync: boolean;
}

export function BeatSyncIndicator({ hasBeatSync }: BeatSyncIndicatorProps) {
  const t = useTranslations('Studio.multiFormat');
  if (!hasBeatSync) return null;
  return (
    <DisclosurePill tone="violet" aria-label={t('beatSyncBadge')}>
      {t('beatSyncBadge')}
    </DisclosurePill>
  );
}
