'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { LabelPill } from '@/shared/ui/dopamine/label-pill';
import { cn } from '@/shared/ui/primitives/cn';
import { usePulseScore } from '../hooks/usePulseScore';
import type { PulseConfidence, PulseScopeType } from '../types';

export interface VitalSignsProps {
  readonly scopeType: PulseScopeType;
  readonly scopeId: string;
  readonly country?: string;
  readonly className?: string;
  readonly defaultOpen?: boolean;
}

const PULSE_KEYFRAMES = `
@keyframes dmx-pulse-beat {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  20% { transform: scale(1.18); opacity: 1; }
  40% { transform: scale(0.96); opacity: 0.9; }
  60% { transform: scale(1.08); opacity: 1; }
}
@keyframes dmx-breath-wave {
  0%, 100% { opacity: 0.35; transform: translateY(0); }
  50% { opacity: 0.9; transform: translateY(-2px); }
}
@keyframes dmx-temp-rise {
  0% { height: 0%; }
  100% { height: var(--temp-pct, 50%); }
}
@media (prefers-reduced-motion: reduce) {
  .dmx-pulse-beat,
  .dmx-breath-wave,
  .dmx-temp-rise {
    animation: none !important;
  }
}
`;

interface VitalValues {
  readonly economicNet: number;
  readonly economicTone: 'positive' | 'neutral' | 'negative';
  readonly breathRatio: number | null;
  readonly tempPct: number | null;
}

function deriveVitals(
  birthsNum: number,
  deathsNum: number,
  dayTraffic: number | null,
  nightTraffic: number | null,
  callsRaw: number | null,
): VitalValues {
  const net = birthsNum - deathsNum;
  const tone: VitalValues['economicTone'] = net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral';

  let ratio: number | null = null;
  if (dayTraffic !== null && nightTraffic !== null && nightTraffic > 0) {
    ratio = dayTraffic / nightTraffic;
  }

  let tempPct: number | null = null;
  if (callsRaw !== null && Number.isFinite(callsRaw)) {
    const clamped = Math.min(Math.max(callsRaw, 0), 100);
    tempPct = 100 - clamped;
  }

  return { economicNet: net, economicTone: tone, breathRatio: ratio, tempPct };
}

function confidenceLabelKey(
  c: PulseConfidence | null,
): 'high' | 'medium' | 'low' | 'insufficient_data' {
  return c ?? 'insufficient_data';
}

function toneToColor(tone: VitalValues['economicTone']): string {
  if (tone === 'positive') return 'var(--color-success, #10b981)';
  if (tone === 'negative') return 'var(--color-danger, #ef4444)';
  return 'var(--color-warning, #f59e0b)';
}

export function VitalSigns({
  scopeType,
  scopeId,
  country,
  className,
  defaultOpen,
}: VitalSignsProps) {
  void defaultOpen;
  const t = useTranslations('Pulse');

  const query = usePulseScore({
    scopeType,
    scopeId,
    ...(country !== undefined ? { country } : {}),
  });

  const data = query.data ?? null;

  const vitals = useMemo<VitalValues | null>(() => {
    if (!data) return null;
    const signals = data.components?.raw_signals;
    if (!signals) {
      return deriveVitals(
        data.business_births,
        data.business_deaths,
        data.foot_traffic_day,
        data.foot_traffic_night,
        data.calls_911_count,
      );
    }
    return deriveVitals(
      signals.business_births,
      signals.business_deaths,
      signals.foot_traffic_day,
      signals.foot_traffic_night,
      signals.calls_911_count,
    );
  }, [data]);

  const cardClass = cn(
    'rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-6',
    className,
  );

  if (query.isLoading) {
    return (
      <Card3D className={cardClass} aria-busy="true" aria-label={t('loading')}>
        <header style={{ marginBottom: 'var(--space-3, 0.75rem)' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-lg, 1.125rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('title')}
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {t('subtitle')}
          </p>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2, 0.5rem)' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 16,
                width: i === 2 ? '60%' : '100%',
                borderRadius: 'var(--radius-sm, 4px)',
                background: 'var(--color-surface-muted, rgba(0,0,0,0.08))',
              }}
            />
          ))}
        </div>
      </Card3D>
    );
  }

  if (query.error) {
    return (
      <Card3D className={cardClass} role="alert" aria-label={t('error')}>
        <header style={{ marginBottom: 'var(--space-3, 0.75rem)' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-lg, 1.125rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('title')}
          </h3>
        </header>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{t('error')}</p>
      </Card3D>
    );
  }

  if (!data || !vitals) {
    return (
      <Card3D className={cardClass} aria-label={t('empty_state')}>
        <header style={{ marginBottom: 'var(--space-3, 0.75rem)' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-lg, 1.125rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('title')}
          </h3>
        </header>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{t('empty_state')}</p>
      </Card3D>
    );
  }

  const pulseScoreValue = data.pulse_score ?? 0;
  const confidenceKey = confidenceLabelKey(data.confidence);
  const pulseColor = toneToColor(vitals.economicTone);
  const tempPct = vitals.tempPct ?? 50;

  return (
    <Card3D className={cardClass}>
      <style>{PULSE_KEYFRAMES}</style>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--space-3, 0.75rem)',
          marginBottom: 'var(--space-4, 1rem)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-lg, 1.125rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('title')}
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {t('subtitle')}
          </p>
        </div>
        <LabelPill tone="cool" size="sm">
          {`${t('confidence_label')}: ${t(`confidence.${confidenceKey}`)}`}
        </LabelPill>
      </header>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-2, 0.5rem)',
          marginBottom: 'var(--space-4, 1rem)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-5xl, 3rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: 'var(--color-text-primary)',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
          title={`${t('score_label')}: ${pulseScoreValue}`}
        >
          {Math.round(pulseScoreValue)}
        </span>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {t('score_label')}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3, 0.75rem)',
        }}
      >
        <section
          style={{
            padding: 'var(--space-3, 0.75rem)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
            background: 'var(--color-surface-sunken, rgba(0,0,0,0.02))',
          }}
          aria-label={`${t('pulse_economic')}: ${vitals.economicNet} ${t('units_bpm')}`}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2, 0.5rem)',
              marginBottom: 'var(--space-2, 0.5rem)',
            }}
          >
            <span
              className="dmx-pulse-beat"
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: pulseColor,
                animation: 'dmx-pulse-beat 1.4s ease-in-out infinite',
              }}
              aria-hidden="true"
            />
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {t('pulse_economic')}
            </span>
          </div>
          <div
            style={{
              fontSize: 'var(--text-2xl, 1.5rem)',
              fontWeight: 'var(--font-weight-bold, 700)',
              color: pulseColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {vitals.economicNet >= 0 ? `+${vitals.economicNet}` : vitals.economicNet}
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted, var(--color-text-secondary))',
            }}
          >
            {t('pulse_economic_tooltip')}
          </div>
        </section>

        <section
          style={{
            padding: 'var(--space-3, 0.75rem)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
            background: 'var(--color-surface-sunken, rgba(0,0,0,0.02))',
          }}
          aria-label={`${t('breath_commercial')}: ${
            vitals.breathRatio !== null ? vitals.breathRatio.toFixed(2) : '—'
          }`}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2, 0.5rem)',
              marginBottom: 'var(--space-2, 0.5rem)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                gap: 2,
                alignItems: 'flex-end',
                height: 14,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="dmx-breath-wave"
                  style={{
                    display: 'inline-block',
                    width: 3,
                    height: `${8 + i * 2}px`,
                    background: 'var(--color-accent-primary, currentColor)',
                    borderRadius: 1,
                    animation: `dmx-breath-wave 2.4s ease-in-out ${i * 0.3}s infinite`,
                  }}
                />
              ))}
            </span>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {t('breath_commercial')}
            </span>
          </div>
          <div
            style={{
              fontSize: 'var(--text-2xl, 1.5rem)',
              fontWeight: 'var(--font-weight-bold, 700)',
              color: 'var(--color-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {vitals.breathRatio !== null ? vitals.breathRatio.toFixed(2) : '—'}
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted, var(--color-text-secondary))',
            }}
          >
            {t('breath_commercial_tooltip')}
          </div>
        </section>

        <section
          style={{
            padding: 'var(--space-3, 0.75rem)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
            background: 'var(--color-surface-sunken, rgba(0,0,0,0.02))',
          }}
          aria-label={`${t('temp_social')}: ${
            vitals.tempPct !== null ? vitals.tempPct.toFixed(0) : '—'
          }`}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2, 0.5rem)',
              marginBottom: 'var(--space-2, 0.5rem)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'relative',
                display: 'inline-block',
                width: 8,
                height: 16,
                borderRadius: 4,
                border: '1px solid var(--color-border-strong, rgba(0,0,0,0.24))',
                overflow: 'hidden',
                background: 'var(--color-surface-raised, white)',
              }}
            >
              <span
                className="dmx-temp-rise"
                style={
                  {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${tempPct}%`,
                    background: 'var(--gradient-warm, linear-gradient(to top, #ef4444, #f59e0b))',
                    animation: 'dmx-temp-rise 900ms ease-out both',
                    ['--temp-pct' as string]: `${tempPct}%`,
                  } as React.CSSProperties
                }
              />
            </span>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {t('temp_social')}
            </span>
          </div>
          <div
            style={{
              fontSize: 'var(--text-2xl, 1.5rem)',
              fontWeight: 'var(--font-weight-bold, 700)',
              color: 'var(--color-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {vitals.tempPct !== null ? Math.round(vitals.tempPct) : '—'}
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted, var(--color-text-secondary))',
            }}
          >
            {t('temp_social_tooltip')}
          </div>
        </section>
      </div>
    </Card3D>
  );
}
