'use client';

import { useTranslations } from 'next-intl';
import { IndexBadge } from '@/features/indices-publicos/components/IndexBadge';
import type { IndexCode } from '@/features/indices-publicos/lib/index-registry-helpers';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import type { MockIndexScore } from '../../types';

export interface PitchCardData {
  readonly scopeId: string;
  readonly topScores: readonly MockIndexScore[];
  readonly appreciation12m: number;
  readonly famPercentile: number;
}

export interface PitchBuilderProps {
  readonly cards: readonly PitchCardData[];
}

export function PitchBuilder({ cards }: PitchBuilderProps) {
  const t = useTranslations('PreviewAsesor.flow.pitch');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 'var(--space-5, 1.25rem)',
      }}
    >
      {cards.map((card) => {
        const label = resolveZoneLabelSync({ scopeType: 'colonia', scopeId: card.scopeId });
        return (
          <Card3D
            key={card.scopeId}
            style={{
              padding: 'var(--space-5, 1.25rem)',
              borderRadius: 'var(--radius-lg, 0.75rem)',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border-subtle)',
              boxShadow: 'var(--shadow-soft)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3, 0.75rem)',
            }}
          >
            <div
              aria-label={t('card_hero_placeholder')}
              role="img"
              style={{
                height: 120,
                borderRadius: 'var(--radius-md, 0.5rem)',
                background:
                  'linear-gradient(135deg, var(--color-accent-soft), var(--color-surface-raised))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-xs, 0.75rem)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {t('card_hero_placeholder')}
            </div>

            <h4
              style={{
                margin: 0,
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                color: 'var(--color-text-primary)',
              }}
            >
              {label}
            </h4>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2, 0.5rem)' }}
            >
              <span
                style={{
                  fontSize: 'var(--text-xs, 0.75rem)',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {t('card_scores_heading')}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2, 0.5rem)' }}>
                {card.topScores.slice(0, 3).map((s) => (
                  <span
                    key={s.code}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-1, 0.25rem)',
                    }}
                  >
                    <IndexBadge code={s.code as IndexCode} size="sm" />
                    <span
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-semibold, 600)',
                        color: 'var(--color-text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {s.value}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1, 0.25rem)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-primary)',
              }}
            >
              <li>
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('card_bullet_1')}:</span>{' '}
                <strong>{`+${card.appreciation12m.toFixed(1)}%`}</strong>
              </li>
              <li>
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('card_bullet_2')}:</span>{' '}
                <strong>{card.famPercentile}</strong>
              </li>
            </ul>
          </Card3D>
        );
      })}
    </div>
  );
}
