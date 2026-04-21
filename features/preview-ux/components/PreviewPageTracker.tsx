'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import { trackPreviewViewed } from '../lib/preview-tracking';
import type { PersonaType } from '../types';

export interface PreviewPageTrackerProps {
  readonly persona: PersonaType;
}

export function PreviewPageTracker({ persona }: PreviewPageTrackerProps) {
  const locale = useLocale();
  useEffect(() => {
    trackPreviewViewed(persona, locale);
  }, [persona, locale]);
  return null;
}
