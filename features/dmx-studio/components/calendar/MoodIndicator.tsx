'use client';

// F14.F.5 Sprint 4 — UPGRADE 1 DIRECTO: AI mood indicator badge.
// Color tints canon ADR-050: low=indigo, neutral=cream, high=green, celebratory=gradient amber+rose.

import type { CSSProperties } from 'react';
import type { Mood } from '@/features/dmx-studio/lib/calendar/types';

export interface MoodIndicatorProps {
  readonly mood: Mood;
  readonly toneHint?: string | null;
  readonly testId?: string;
}

const MOOD_LABEL: Record<Mood, string> = {
  low: 'Mood: en construccion',
  neutral: 'Mood: consistente',
  high: 'Mood: en racha',
  celebratory: 'Mood: top performer',
};

const MOOD_STYLES: Record<Mood, CSSProperties> = {
  low: {
    background: 'rgba(99, 102, 241, 0.10)',
    color: 'var(--canon-indigo-2)',
    border: '1px solid rgba(99, 102, 241, 0.30)',
  },
  neutral: {
    background: 'rgba(240, 235, 224, 0.06)',
    color: 'var(--canon-cream)',
    border: '1px solid var(--canon-border-2)',
  },
  high: {
    background: 'rgba(34, 197, 94, 0.10)',
    color: 'var(--canon-green)',
    border: '1px solid rgba(34, 197, 94, 0.30)',
  },
  celebratory: {
    background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(236, 72, 153, 0.18))',
    color: 'var(--canon-cream)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
  },
};

export function MoodIndicator({ mood, toneHint, testId }: MoodIndicatorProps) {
  const style: CSSProperties = {
    ...MOOD_STYLES[mood],
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: 'var(--canon-radius-pill)',
    fontFamily: 'var(--font-body)',
    fontSize: '12.5px',
    fontWeight: 600,
    letterSpacing: '0.01em',
    transition: 'transform var(--canon-duration-fast) var(--canon-ease-out)',
  };

  return (
    <span
      role="status"
      aria-label={MOOD_LABEL[mood]}
      data-mood={mood}
      data-testid={testId ?? 'studio-calendar-mood-indicator'}
      style={style}
      title={toneHint ?? undefined}
    >
      <span
        aria-hidden="true"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '9999px',
          background: 'currentColor',
        }}
      />
      {MOOD_LABEL[mood]}
    </span>
  );
}
