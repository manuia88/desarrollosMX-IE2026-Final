'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Button, Card, cn } from '@/shared/ui/primitives/canon';

export type TrustScoreLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TrustScoreCardProps {
  readonly score: number | null;
  readonly level: TrustScoreLevel | null;
  readonly isPlaceholder?: boolean;
  readonly onClickDetail?: () => void;
}

interface LevelStyle {
  readonly background: string;
  readonly color: string;
}

const LEVEL_STYLES: Record<TrustScoreLevel, LevelStyle> = {
  bronze: { background: '#92400e', color: '#fde68a' },
  silver: { background: '#6b7280', color: '#f3f4f6' },
  gold: { background: '#d97706', color: '#fffbeb' },
  platinum: { background: '#7c3aed', color: '#ede9fe' },
};

const PLACEHOLDER_STYLE: LevelStyle = {
  background: 'rgba(148, 163, 184, 0.18)',
  color: 'var(--canon-cream-2)',
};

export function TrustScoreCard({
  score,
  level,
  isPlaceholder = false,
  onClickDetail,
}: TrustScoreCardProps): React.ReactElement {
  const t = useTranslations('dev.trustScore');

  const showPlaceholder = isPlaceholder || score === null || level === null;
  const levelStyle: LevelStyle =
    !showPlaceholder && level ? LEVEL_STYLES[level] : PLACEHOLDER_STYLE;
  const levelLabel = !showPlaceholder && level ? t(`level.${level}`) : t('level.placeholder');
  const ariaLabel = showPlaceholder
    ? t('ariaPlaceholder')
    : t('aria', { score: score ?? 0, level: levelLabel });

  const numberStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
    fontSize: 56,
    lineHeight: 1,
    color: 'var(--canon-cream)',
    margin: 0,
  };

  const numberSuffix: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 18,
    color: 'var(--canon-cream-2)',
    fontVariantNumeric: 'tabular-nums',
    marginLeft: 4,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--canon-cream-2)',
  };

  const pillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 12px',
    borderRadius: 9999,
    fontFamily: 'var(--font-body)',
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: levelStyle.background,
    color: levelStyle.color,
    border: showPlaceholder ? '1px solid var(--canon-border-2)' : 'none',
  };

  const disclosureStyle: CSSProperties = {
    margin: 0,
    fontSize: 11.5,
    color: 'var(--canon-cream-3)',
    fontStyle: 'italic',
  };

  return (
    <Card
      variant="elevated"
      aria-label={ariaLabel}
      className={cn('trust-score-card')}
      style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <h3 style={titleStyle}>{t('cardTitle')}</h3>
        <span role="status" aria-label={levelLabel} style={pillStyle}>
          {levelLabel}
        </span>
      </header>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          marginTop: 4,
        }}
      >
        <p style={numberStyle}>{showPlaceholder ? '—' : (score ?? 0)}</p>
        <span style={numberSuffix}>/100</span>
      </div>

      {showPlaceholder ? <p style={disclosureStyle}>{t('placeholderDisclosure')}</p> : null}

      {!showPlaceholder && onClickDetail ? (
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={onClickDetail}>
            {t('viewDetail')}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
