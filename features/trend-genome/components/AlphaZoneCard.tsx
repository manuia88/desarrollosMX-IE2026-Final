'use client';

import { useTranslations } from 'next-intl';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { LabelPill, type LabelPillTone } from '@/shared/ui/dopamine/label-pill';
import { cn } from '@/shared/ui/primitives/cn';
import type { AlphaTier, AlphaZonePublicRow } from '../types';
import { AlphaSignalsBadge } from './AlphaSignalsBadge';

export interface AlphaZoneCardProps {
  readonly zone: AlphaZonePublicRow;
  readonly className?: string;
}

const TIER_TONE: Readonly<Record<AlphaTier, LabelPillTone>> = {
  confirmed: 'primary',
  golden_opportunity: 'sunset',
  speculative: 'cool',
  watchlist: 'fresh',
};

const TIER_KEY: Readonly<Record<AlphaTier, string>> = {
  confirmed: 'tier.confirmed',
  speculative: 'tier.speculative',
  golden_opportunity: 'tier.golden_opportunity',
  watchlist: 'tier.watchlist',
};

export function AlphaZoneCard({ zone, className }: AlphaZoneCardProps) {
  const t = useTranslations('TrendGenome');

  const tierTone = TIER_TONE[zone.tier];
  const tierLabel = t(TIER_KEY[zone.tier]);
  const ttm = zone.time_to_mainstream_months;
  const scoreRounded = Math.round(zone.alpha_score);

  return (
    <Card3D
      className={cn(
        'relative flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5 shadow-[var(--shadow-card,0_1px_3px_rgba(0,0,0,0.08))]',
        className,
      )}
      aria-label={t('aria.card', { zoneId: zone.zone_id })}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
            {zone.scope_type}
          </span>
          <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">
            {zone.zone_id}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill tone={tierTone} size="sm">
            {tierLabel}
          </LabelPill>
          {zone.needs_review ? (
            <LabelPill tone="warm" size="sm" aria-label={t('needs_review')}>
              {t('needs_review')}
            </LabelPill>
          ) : null}
        </div>
      </header>

      <div className="flex items-baseline gap-3">
        <span
          className="text-5xl font-bold tabular-nums text-[color:var(--color-text-primary)]"
          title={t('card.alpha_score_label')}
        >
          {scoreRounded}
        </span>
        <span className="text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
          {t('card.alpha_score_label')}
        </span>
      </div>

      {ttm !== null ? (
        <div className="inline-flex items-center gap-1.5 self-start rounded-[var(--radius-pill)] bg-[color:var(--color-surface-sunken)] px-2.5 py-1 text-xs text-[color:var(--color-text-secondary)]">
          <span className="font-medium text-[color:var(--color-text-primary)]">
            {t('card.time_to_mainstream_label')}
          </span>
          <span className="tabular-nums">{`${ttm} ${t('card.months')}`}</span>
        </div>
      ) : null}

      <AlphaSignalsBadge signals={zone.signals_breakdown} />
    </Card3D>
  );
}
