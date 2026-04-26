'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Button } from '@/shared/ui/primitives/canon/button';
import { DisclosurePill } from '@/shared/ui/primitives/canon/disclosure-pill';
import { ConfidenceHalo } from '@/shared/ui/primitives/canon-asesor/confidence-halo';

export interface HeroPulseProps {
  asesorName: string;
  pipelineMxn: number | null;
  pipelineDaysProjection: number | null;
  mood: 'high' | 'neutral' | 'low' | 'mixed';
  isSyntheticData?: boolean;
  onAction?: (id: 'next-action-ai' | 'follow-up' | 'close-deal') => void;
}

const GRADIENT_BY_MOOD: Record<HeroPulseProps['mood'], string> = {
  high: 'var(--gradient-score-excellent)',
  neutral: 'var(--gradient-score-good)',
  low: 'var(--gradient-score-warning)',
  mixed: 'var(--gradient-score-good)',
};

function compactCurrencyMxn(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value.toFixed(0)}`;
}

export function HeroPulse({
  asesorName,
  pipelineMxn,
  pipelineDaysProjection,
  mood,
  isSyntheticData = false,
  onAction,
}: HeroPulseProps) {
  const t = useTranslations('AsesorDashboard.hero');

  const containerStyle: CSSProperties = {
    background: 'var(--surface-spotlight)',
    border: '1px solid var(--canon-border-2)',
    borderRadius: 'var(--canon-radius-card)',
    boxShadow: 'var(--shadow-canon-spotlight)',
    minHeight: 220,
  };

  const headlineStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 'clamp(28px, 4vw, 48px)',
    lineHeight: 1.05,
    letterSpacing: '-0.01em',
    fontVariantNumeric: 'tabular-nums',
    backgroundImage: GRADIENT_BY_MOOD[mood],
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const headlineText =
    pipelineMxn !== null
      ? pipelineDaysProjection !== null
        ? t('headline.withPipeline', {
            amount: compactCurrencyMxn(pipelineMxn),
            days: pipelineDaysProjection,
          })
        : t('headline.noProjection', { amount: compactCurrencyMxn(pipelineMxn) })
      : t('headline.empty');

  return (
    <section
      aria-label={t('aria')}
      className="relative flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:px-10"
      style={containerStyle}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2">
        {isSyntheticData ? (
          <DisclosurePill tone="violet">{t('disclosure.synthetic')}</DisclosurePill>
        ) : null}
      </div>
      <ConfidenceHalo confidence={0.78} intensity="strong">
        <div
          aria-hidden="true"
          className="h-20 w-20 rounded-full"
          style={{
            background: 'var(--gradient-ai)',
            boxShadow: '0 0 32px rgba(168,85,247,0.45)',
            animation: 'pulse-glow 2.4s ease-in-out infinite',
          }}
        />
      </ConfidenceHalo>
      <div className="flex flex-1 flex-col gap-4">
        <span
          className="text-[11px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
        >
          {t('greeting', { name: asesorName })}
        </span>
        <h1 style={headlineStyle}>{headlineText}</h1>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="glass"
            size="md"
            onClick={() => onAction?.('next-action-ai')}
            aria-label={t('chip.aiAction')}
          >
            {t('chip.aiAction')}
          </Button>
          <Button
            variant="glass"
            size="md"
            onClick={() => onAction?.('follow-up')}
            aria-label={t('chip.followUp')}
          >
            {t('chip.followUp')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onAction?.('close-deal')}
            aria-label={t('chip.closeDeal')}
          >
            {t('chip.closeDeal')}
          </Button>
        </div>
      </div>
    </section>
  );
}
