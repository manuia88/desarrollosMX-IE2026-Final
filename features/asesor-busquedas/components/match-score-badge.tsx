'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import type { MatchScoreBreakdown } from '../lib/matcher-engine';

export interface MatchScoreBadgeProps {
  score: number;
  breakdown: MatchScoreBreakdown;
}

function tierColor(score: number): { bg: string; fg: string } {
  if (score >= 80)
    return { bg: 'var(--gradient-score-excellent, var(--canon-gradient))', fg: '#fff' };
  if (score >= 65) return { bg: 'var(--gradient-score-good, var(--canon-gradient))', fg: '#fff' };
  if (score >= 45) return { bg: 'var(--gradient-score-warning, var(--canon-bg-2))', fg: '#fff' };
  return { bg: 'var(--gradient-score-critical, var(--canon-bg-2))', fg: '#fff' };
}

export function MatchScoreBadge({ score, breakdown }: MatchScoreBadgeProps) {
  const t = useTranslations('AsesorBusquedas.match');
  const [hover, setHover] = useState(false);
  const { bg, fg } = tierColor(score);

  const containerStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
  };

  const pillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 'var(--canon-radius-pill)',
    background: bg,
    color: fg,
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
    border: '1px solid var(--canon-border-2)',
    cursor: 'help',
  };

  const tooltipStyle: CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    minWidth: 220,
    padding: 12,
    borderRadius: 'var(--canon-radius-card)',
    background: 'var(--surface-elevated, var(--canon-bg-2))',
    border: '1px solid var(--canon-border-2)',
    boxShadow: 'var(--shadow-canon-spotlight)',
    zIndex: 30,
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: 'var(--canon-cream)',
    pointerEvents: 'none',
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    padding: '2px 0',
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <span
      style={containerStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      role="img"
      aria-label={t('ariaScore', { value: score })}
    >
      <span style={pillStyle}>
        <span aria-hidden="true">★</span>
        <span>{score}</span>
      </span>
      {hover ? (
        <span style={tooltipStyle} role="tooltip">
          <span style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
            {t('breakdownTitle')}
          </span>
          <span style={rowStyle}>
            <span>{t('priceFit')}</span>
            <span>{Math.round(breakdown.priceFit * 100)}%</span>
          </span>
          <span style={rowStyle}>
            <span>{t('zoneIE')}</span>
            <span>{Math.round(breakdown.zoneIE * 100)}%</span>
          </span>
          <span style={rowStyle}>
            <span>{t('amenitiesMatch')}</span>
            <span>{Math.round(breakdown.amenitiesMatch * 100)}%</span>
          </span>
          <span style={rowStyle}>
            <span>{t('familyFit')}</span>
            <span>{Math.round(breakdown.familyFit * 100)}%</span>
          </span>
          <span style={rowStyle}>
            <span>{t('discZone')}</span>
            <span>{Math.round(breakdown.discZone * 100)}%</span>
          </span>
        </span>
      ) : null}
    </span>
  );
}
