'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export type TrustScoreHeroProps = {
  readonly score: number | null;
  readonly delta: number | null;
  readonly isPlaceholder: boolean;
  readonly onClickDetail?: () => void;
};

type Tier = 'excellent' | 'warning' | 'critical' | 'unknown';

function tierFor(score: number | null): Tier {
  if (score === null) return 'unknown';
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'warning';
  return 'critical';
}

const TIER_GRADIENTS: Record<Tier, string> = {
  excellent: 'var(--gradient-score-excellent, linear-gradient(135deg, #10b981, #34d399))',
  warning: 'var(--gradient-score-warning, linear-gradient(135deg, #f59e0b, #fbbf24))',
  critical: 'var(--gradient-score-critical, linear-gradient(135deg, #ef4444, #f87171))',
  unknown:
    'var(--gradient-score-good, linear-gradient(135deg, rgba(148,163,184,0.4), rgba(99,102,241,0.4)))',
};

export function TrustScoreHero({
  score,
  delta,
  isPlaceholder,
  onClickDetail,
}: TrustScoreHeroProps) {
  const t = useTranslations('dev.dashboard.trustScore');
  const tier = tierFor(score);
  const numberStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  };

  const deltaText = delta === null ? null : delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  const deltaColor = delta === null ? '#94a3b8' : delta >= 0 ? '#34d399' : '#f87171';

  return (
    <Card className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            {t('eyebrow')}
          </span>
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
          >
            {t('title')}
          </h2>
        </div>
        <span
          role="img"
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ background: TIER_GRADIENTS[tier] }}
          aria-label={t(`tierAria.${tier}`)}
        >
          {t(`tier.${tier}`)}
        </span>
      </header>

      <div className="flex items-end gap-4">
        <span
          className="text-6xl leading-none"
          style={{ ...numberStyle, color: 'var(--canon-cream)' }}
        >
          {score === null || isPlaceholder ? '—' : score}
        </span>
        {deltaText !== null ? (
          <span
            role="status"
            className="mb-2 text-sm font-semibold"
            style={{ color: deltaColor, fontVariantNumeric: 'tabular-nums' }}
            aria-label={t('deltaAria', { value: deltaText })}
          >
            {deltaText}
          </span>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--canon-cream-2)' }}>
        {isPlaceholder ? t('placeholder') : t('description')}
      </p>

      <div className="mt-auto flex justify-end">
        <button
          type="button"
          onClick={onClickDetail}
          disabled={!onClickDetail}
          className="rounded-full px-3 py-1.5 text-xs font-medium"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--canon-cream)',
            cursor: onClickDetail ? 'pointer' : 'not-allowed',
            opacity: onClickDetail ? 1 : 0.5,
          }}
        >
          {t('cta')}
        </button>
      </div>
    </Card>
  );
}
