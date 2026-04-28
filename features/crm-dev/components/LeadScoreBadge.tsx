'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import { ScorePill, type ScoreTier } from '@/shared/ui/primitives/canon';

export interface LeadScoreBadgeProps {
  readonly score: number | null;
  readonly tier?: 'hot' | 'warm' | 'cold' | null;
  readonly factors?: {
    readonly engagement?: number;
    readonly intent?: number;
    readonly demographics?: number;
    readonly recency?: number;
  } | null;
  readonly compact?: boolean;
}

function tierToScoreTier(tier: 'hot' | 'warm' | 'cold' | null | undefined): ScoreTier {
  if (tier === 'hot') return 'excellent';
  if (tier === 'warm') return 'good';
  if (tier === 'cold') return 'critical';
  return 'neutral';
}

export function LeadScoreBadge({ score, tier, factors, compact = false }: LeadScoreBadgeProps) {
  const t = useTranslations('dev.crm.score');
  const [showTooltip, setShowTooltip] = useState(false);

  if (score == null) {
    return (
      <ScorePill tier="neutral" aria-label={t('badge.unscored')}>
        {compact ? '—' : t('badge.unscored')}
      </ScorePill>
    );
  }

  const computedTier = tier ?? (score >= 75 ? 'hot' : score >= 40 ? 'warm' : 'cold');
  const ariaLabel = t('badge.aria', { score, tier: t(`tier.${computedTier}`) });

  const tooltipStyle: CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    background: 'var(--canon-bg-2)',
    border: '1px solid var(--canon-border-2)',
    borderRadius: 'var(--canon-radius-card)',
    padding: '10px 12px',
    minWidth: 200,
    boxShadow: 'var(--shadow-canon-elevated)',
    zIndex: 10,
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: 'var(--canon-cream)',
  };

  const factorRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    padding: '2px 0',
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip wrapper, ScorePill child handles focus/keyboard
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <ScorePill tier={tierToScoreTier(computedTier)} aria-label={ariaLabel} tabIndex={0}>
        {computedTier === 'hot' ? '🔥 ' : ''}
        {compact ? score : `${score} ${t(`tier.${computedTier}`)}`}
      </ScorePill>
      {showTooltip && factors ? (
        <span role="tooltip" style={tooltipStyle}>
          <strong style={{ display: 'block', marginBottom: 6 }}>{t('breakdown.title')}</strong>
          <span style={factorRowStyle}>
            <span>{t('breakdown.engagement')}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{factors.engagement ?? 0}</span>
          </span>
          <span style={factorRowStyle}>
            <span>{t('breakdown.intent')}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{factors.intent ?? 0}</span>
          </span>
          <span style={factorRowStyle}>
            <span>{t('breakdown.demographics')}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{factors.demographics ?? 0}</span>
          </span>
          <span style={factorRowStyle}>
            <span>{t('breakdown.recency')}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{factors.recency ?? 0}</span>
          </span>
        </span>
      ) : null}
    </span>
  );
}
