import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { type QualityLevel, qualityScoreLabel } from '../lib/quality-score';

const LEVEL_GRADIENT: Record<QualityLevel, string> = {
  competitivo: 'var(--gradient-score-excellent)',
  moderado: 'var(--gradient-score-good)',
  fueraMercado: 'var(--gradient-score-critical)',
  sinACM: 'var(--canon-border-2)',
};

const LEVEL_FG: Record<QualityLevel, string> = {
  competitivo: '#86efac',
  moderado: 'var(--canon-indigo-2)',
  fueraMercado: '#fda4af',
  sinACM: 'var(--canon-cream-3)',
};

export interface QualityScoreBadgeProps {
  score: number | null | undefined;
}

export function QualityScoreBadge({ score }: QualityScoreBadgeProps) {
  const t = useTranslations('AsesorDesarrollos.qualityScore');
  const level = qualityScoreLabel(score);
  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid',
    borderColor: 'var(--canon-border-2)',
    backgroundImage: LEVEL_GRADIENT[level],
    backgroundClip: 'padding-box',
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: LEVEL_FG[level],
    whiteSpace: 'nowrap',
  };
  return (
    <span
      role="status"
      aria-label={t('ariaLabel', { level: t(level) })}
      title={t('title')}
      style={containerStyle}
    >
      {t(level)}
    </span>
  );
}
