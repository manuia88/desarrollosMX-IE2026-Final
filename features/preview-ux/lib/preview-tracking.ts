'use client';

import type { PersonaType } from '../types';

type TrackPayload = Readonly<Record<string, string | number | boolean>>;

function safeCapture(event: string, properties: TrackPayload): void {
  if (typeof window === 'undefined') return;
  const posthog = (window as { posthog?: { capture?: (e: string, p: TrackPayload) => void } })
    .posthog;
  if (posthog?.capture) {
    try {
      posthog.capture(event, properties);
    } catch {
      // Analytics failures MUST never break UI.
    }
  }
}

export function trackPreviewViewed(persona: PersonaType, locale: string): void {
  safeCapture('preview.viewed', { persona, locale });
}

export function trackPreviewCtaClicked(persona: PersonaType, ctaId: string, locale: string): void {
  safeCapture('preview.cta_clicked', { persona, ctaId, locale });
}
