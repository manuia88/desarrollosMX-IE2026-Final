'use client';

import { useTranslations } from 'next-intl';
import type { Confidence } from '@/shared/lib/intelligence-engine/calculators/base';
import { cn } from '../primitives/cn';

export type RecommendationBucket = 'low' | 'medium' | 'high' | 'insufficient_data';

export interface ScoreRecommendationsMap {
  readonly low: readonly string[];
  readonly medium: readonly string[];
  readonly high: readonly string[];
  readonly insufficient_data: readonly string[];
}

export interface ScoreRecommendationsCardProps {
  scoreId: string;
  scoreValue: number;
  confidence: Confidence;
  recommendations: ScoreRecommendationsMap;
  onAction?: (actionKey: string) => void;
  className?: string;
}

export function resolveRecommendationBucket(
  value: number,
  confidence: Confidence,
): RecommendationBucket {
  if (confidence === 'insufficient_data') return 'insufficient_data';
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

export function ScoreRecommendationsCard({
  scoreId,
  scoreValue,
  confidence,
  recommendations,
  onAction,
  className,
}: ScoreRecommendationsCardProps) {
  const t = useTranslations();
  const bucket = resolveRecommendationBucket(scoreValue, confidence);
  const keys = recommendations[bucket];

  return (
    <section
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4',
        className,
      )}
      aria-labelledby={`recs-${scoreId}`}
    >
      <h3
        id={`recs-${scoreId}`}
        className="text-[var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] mb-2"
      >
        {t('ie.recommendations.heading')}
      </h3>
      {keys.length === 0 ? (
        <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
          {t('ie.recommendations.empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {keys.map((key) => (
            <li
              key={key}
              className="flex gap-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]"
            >
              <span
                aria-hidden="true"
                className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[var(--color-brand-primary)] shrink-0"
              />
              {onAction ? (
                <button
                  type="button"
                  onClick={() => onAction(key)}
                  className="text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-sm"
                >
                  {t(key)}
                </button>
              ) : (
                <span>{t(key)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
