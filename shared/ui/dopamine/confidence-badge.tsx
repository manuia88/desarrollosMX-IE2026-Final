'use client';

import { useTranslations } from 'next-intl';
import type { Confidence } from '@/shared/lib/intelligence-engine/calculators/base';
import { cn } from '../primitives/cn';
import { LabelPill, type LabelPillSize, type LabelPillTone } from './label-pill';

export type ConfidenceBadgeSize = LabelPillSize;

export interface ConfidenceBadgeProps {
  confidence: Confidence;
  size?: ConfidenceBadgeSize | undefined;
  verbose?: boolean | undefined;
  onExplain?: (() => void) | undefined;
  className?: string | undefined;
}

const TONE_BY_CONFIDENCE: Record<Exclude<Confidence, 'high'>, LabelPillTone> = {
  medium: 'warm',
  low: 'sunset',
  insufficient_data: 'cool',
};

export function resolveConfidenceTone(confidence: Confidence): LabelPillTone | null {
  if (confidence === 'high') return null;
  return TONE_BY_CONFIDENCE[confidence];
}

const I18N_KEY_BY_CONFIDENCE: Record<Exclude<Confidence, 'high'>, string> = {
  medium: 'ie.confidence.medium',
  low: 'ie.confidence.low',
  insufficient_data: 'ie.confidence.insufficient',
};

export function ConfidenceBadge({
  confidence,
  size = 'md',
  verbose = false,
  onExplain,
  className,
}: ConfidenceBadgeProps) {
  const t = useTranslations();

  if (confidence === 'high') return null;

  const tone = TONE_BY_CONFIDENCE[confidence];
  const labelKey = I18N_KEY_BY_CONFIDENCE[confidence];
  const label = t(labelKey);
  const descKey = `ie.confidence_meta.${confidence}_desc`;
  const description = verbose ? t(descKey) : null;
  const ariaLabel = description ? `${label} — ${description}` : label;

  if (confidence === 'insufficient_data') {
    return (
      <div
        className={cn('inline-flex items-center gap-2', className)}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        <LabelPill tone={tone} size={size}>
          {label}
        </LabelPill>
        {onExplain ? (
          <button
            type="button"
            onClick={onExplain}
            className="text-[var(--text-xs)] font-[var(--font-weight-medium)] text-[var(--color-brand-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-1 rounded-sm"
          >
            {t('ie.confidence_meta.cta_explain')}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <LabelPill
      tone={tone}
      size={size}
      className={className}
      role="status"
      aria-label={ariaLabel}
      title={description ?? undefined}
    >
      {label}
    </LabelPill>
  );
}
