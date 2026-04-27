'use client';

// F14.F.5 Sprint 4 UPGRADE 3 — DMX Studio streak widget for dashboard.
// ADR-050 canon: Card elevated, Outfit 800 + tabular-nums, gradient AI for big
// number, indigo→pink gradient for next-badge progress bar. Zero emojis.

import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';
import type { BadgeKey } from '../../lib/streaks/badges';

export interface StreakWidgetProps {
  readonly currentStreakDays: number;
  readonly longestStreakDays: number;
  readonly badgesUnlocked: ReadonlyArray<BadgeKey>;
  readonly nextBadge: {
    readonly key: BadgeKey;
    readonly days: number;
    readonly daysRemaining: number;
  } | null;
}

const BADGE_LABEL: Record<BadgeKey, string> = {
  streak_7: 'Una semana',
  streak_30: 'Un mes',
  streak_100: '100 dias',
  streak_365: 'Un ano',
};

const numberStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '56px',
  lineHeight: 1,
  letterSpacing: '-0.02em',
  fontVariantNumeric: 'tabular-nums',
  background: 'var(--gradient-ai)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
};

const longestStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '20px',
  lineHeight: 1.1,
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--canon-cream)',
};

export function StreakWidget({
  currentStreakDays,
  longestStreakDays,
  badgesUnlocked,
  nextBadge,
}: StreakWidgetProps) {
  const progressPct = nextBadge
    ? Math.min(100, Math.max(0, Math.round((currentStreakDays / nextBadge.days) * 100)))
    : 100;

  return (
    <Card
      variant="elevated"
      className="flex flex-col gap-5 p-6"
      role="group"
      aria-label="Streak DMX Studio"
      data-testid="streak-widget"
    >
      <div className="flex flex-col gap-1">
        <span
          className="text-[12px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--canon-cream-2)', letterSpacing: '0.05em' }}
        >
          Streak actual
        </span>
        <div className="flex items-baseline gap-3">
          <span style={numberStyle} data-testid="current-streak-value">
            {currentStreakDays}
          </span>
          <span className="text-[13px]" style={{ color: 'var(--canon-cream-2)' }}>
            dias seguidos
          </span>
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-3 border-t pt-3"
        style={{ borderColor: 'var(--canon-border)' }}
      >
        <span className="text-[12px]" style={{ color: 'var(--canon-cream-2)' }}>
          Tu mejor racha
        </span>
        <span style={longestStyle} data-testid="longest-streak-value">
          {longestStreakDays}
        </span>
      </div>

      {nextBadge ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span style={{ color: 'var(--canon-cream-2)' }}>
              Proximo logro: {BADGE_LABEL[nextBadge.key]}
            </span>
            <span style={{ color: 'var(--canon-cream)', fontVariantNumeric: 'tabular-nums' }}>
              {nextBadge.daysRemaining} dias
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso al proximo logro"
            style={{
              height: '6px',
              borderRadius: '9999px',
              background: 'var(--canon-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366F1, #EC4899)',
                borderRadius: '9999px',
                transition: 'width var(--canon-duration-normal) var(--canon-ease-out)',
              }}
            />
          </div>
        </div>
      ) : null}

      {badgesUnlocked.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--canon-cream-2)', letterSpacing: '0.05em' }}
          >
            Logros desbloqueados
          </span>
          <ul className="flex flex-wrap gap-2">
            {badgesUnlocked.map((b) => (
              <li
                key={b}
                title={BADGE_LABEL[b]}
                className="rounded-full px-3 py-1 text-[12px] font-semibold"
                style={{
                  background: 'var(--surface-recessed)',
                  color: 'var(--canon-cream)',
                  border: '1px solid var(--canon-border)',
                }}
              >
                {BADGE_LABEL[b]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
