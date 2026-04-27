'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { AmbientBackground } from '@/shared/ui/motion/ambient-background';
import { BlurText } from '@/shared/ui/motion/blur-text';
import { FadeUp } from '@/shared/ui/motion/fade-up';
import { HeroCanvas } from '@/shared/ui/motion/hero-canvas';
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
  high: 'linear-gradient(90deg, #22c55e, #10b981)',
  neutral: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
  low: 'linear-gradient(90deg, #f59e0b, #f97316)',
  mixed: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
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
    overflow: 'hidden',
    isolation: 'isolate',
  };

  const headlineStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 'clamp(28px, 4vw, 48px)',
    lineHeight: 1.05,
    letterSpacing: '-0.01em',
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--canon-cream)',
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
      <AmbientBackground intensity="subtle" />
      <HeroCanvas density={14} />
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        {isSyntheticData ? (
          <DisclosurePill tone="violet">{t('disclosure.synthetic')}</DisclosurePill>
        ) : null}
      </div>
      <div className="relative z-10 flex shrink-0 items-center justify-center">
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
      </div>
      <div className="relative z-10 flex flex-1 flex-col gap-4">
        <FadeUp delay={0} durationMs={550} distance={16} blur={3}>
          <span
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
          >
            {t('greeting', { name: asesorName })}
          </span>
        </FadeUp>
        <BlurText
          as="h1"
          style={headlineStyle}
          delay={0.05}
          staggerMs={70}
          gradientAll
          gradientItalic={false}
          gradient={GRADIENT_BY_MOOD[mood]}
        >
          {headlineText}
        </BlurText>
        <FadeUp delay={0.2} durationMs={650} distance={20}>
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
              style={{
                boxShadow: '0 12px 32px rgba(99,102,241,0.35)',
              }}
            >
              {t('chip.closeDeal')}
            </Button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
