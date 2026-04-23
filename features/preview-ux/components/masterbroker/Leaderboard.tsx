import { useLocale, useTranslations } from 'next-intl';
import { formatNumber } from '@/shared/lib/i18n/formatters';
import { LabelPill, type LabelPillTone } from '@/shared/ui/dopamine/label-pill';
import type { MockAgent } from '../../types';

const BADGE_TONE: Readonly<Record<MockAgent['badges'][number], LabelPillTone>> = {
  top_closer: 'sunset',
  streak_week: 'primary',
  alpha_hunter: 'cool',
  rising_star: 'fresh',
};

export interface LeaderboardProps {
  readonly agents: readonly MockAgent[];
  readonly limit?: number;
}

export function Leaderboard({ agents, limit = 5 }: LeaderboardProps) {
  const tBadges = useTranslations('PreviewMasterBroker.flow.agents.badges');
  const locale = useLocale();

  const sorted = [...agents].sort((a, b) => b.trendPct - a.trendPct).slice(0, limit);

  return (
    <ol
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3, 0.75rem)',
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {sorted.map((a, idx) => {
        const trendUp = a.trendPct >= 0;
        return (
          <li
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4, 1rem)',
              padding: 'var(--space-4, 1rem)',
              borderRadius: 'var(--radius-lg, 0.75rem)',
              border: '1px solid var(--color-border-subtle)',
              background: 'var(--color-surface-elevated)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: 'var(--text-2xl, 1.5rem)',
                fontWeight: 'var(--font-weight-bold, 700)',
                color: 'var(--color-accent-strong)',
                fontVariantNumeric: 'tabular-nums',
                width: 32,
                textAlign: 'center',
              }}
            >
              {idx + 1}
            </span>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--color-accent-soft)',
                color: 'var(--color-accent-strong)',
                fontSize: 'var(--text-sm, 0.875rem)',
                fontWeight: 'var(--font-weight-bold, 700)',
              }}
            >
              {a.initials}
            </span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  color: 'var(--color-text-primary)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                }}
              >
                {a.name}
              </span>
              <span
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {a.zoneLabel}
              </span>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                {a.badges.map((b) => (
                  <LabelPill key={b} tone={BADGE_TONE[b]} size="sm">
                    {tBadges(b)}
                  </LabelPill>
                ))}
              </div>
            </div>
            <span
              style={{
                fontSize: 'var(--text-xl, 1.25rem)',
                fontWeight: 'var(--font-weight-bold, 700)',
                color: trendUp ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span aria-hidden="true">{trendUp ? '▲' : '▼'}</span>{' '}
              {formatNumber(Math.abs(a.trendPct), locale, { maximumFractionDigits: 1 })}%
            </span>
          </li>
        );
      })}
    </ol>
  );
}
