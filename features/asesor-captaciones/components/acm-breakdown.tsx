'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { DisclosurePill, ScorePill, tierFromScore } from '@/shared/ui/primitives/canon';
import type { AcmSnapshot } from '../lib/captaciones-loader';

export interface AcmBreakdownProps {
  acm: AcmSnapshot | null;
  hasFallbackZone: boolean;
}

const DIM_KEYS = ['priceFit', 'zoneScore', 'amenities', 'sizeFit', 'discZone'] as const;
type DimKey = (typeof DIM_KEYS)[number];

const DIM_WEIGHTS: Record<DimKey, number> = {
  priceFit: 0.3,
  zoneScore: 0.25,
  amenities: 0.2,
  sizeFit: 0.15,
  discZone: 0.1,
};

export function AcmBreakdown({ acm, hasFallbackZone }: AcmBreakdownProps) {
  const t = useTranslations('AsesorCaptaciones.acm');
  const tDisc = useTranslations('AsesorCaptaciones.disclosure');
  const tRationale = useTranslations('AsesorCaptaciones.rationale');

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: 16,
    borderRadius: 'var(--canon-radius-card)',
    background: 'var(--surface-recessed, var(--canon-bg-2))',
    border: '1px solid var(--canon-border-2)',
  };

  if (!acm) {
    return (
      <div style={containerStyle}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--canon-cream-2)',
          }}
        >
          {t('emptyState')}
        </span>
      </div>
    );
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--canon-cream)',
    margin: 0,
  };

  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto',
    gap: 10,
    alignItems: 'center',
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    color: 'var(--canon-cream-2)',
  };

  const barTrack: CSSProperties = {
    width: 80,
    height: 6,
    borderRadius: 3,
    background: 'var(--canon-border-2)',
    overflow: 'hidden',
  };

  const valueStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--canon-cream)',
    minWidth: 38,
    textAlign: 'right',
  };

  return (
    <section style={containerStyle} aria-labelledby="acm-breakdown-title">
      <header style={headerStyle}>
        <h3 id="acm-breakdown-title" style={titleStyle}>
          {t('title')}
        </h3>
        <ScorePill tier={tierFromScore(acm.score)}>{acm.score}</ScorePill>
      </header>

      {hasFallbackZone || acm.hasFallbackZoneScore ? (
        <DisclosurePill tone="amber">{tDisc('zoneFallback')}</DisclosurePill>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DIM_KEYS.map((key) => {
          const value = acm.breakdown[key];
          const pct = Math.round(value * 100);
          return (
            <div key={key} style={rowStyle}>
              <span>
                {t(`dim.${key}`)}{' '}
                <span style={{ color: 'var(--canon-cream-3)', fontSize: 10 }}>
                  ({Math.round(DIM_WEIGHTS[key] * 100)}%)
                </span>
              </span>
              <div style={barTrack} aria-hidden="true">
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: 'var(--mod-captaciones, var(--canon-gradient))',
                  }}
                />
              </div>
              <span style={valueStyle}>{pct}%</span>
            </div>
          );
        })}
      </div>

      {acm.rationale.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {acm.rationale.map((r) => {
            const key = r.replace('rationale.', '');
            return (
              <span
                key={r}
                style={{
                  display: 'inline-flex',
                  padding: '3px 10px',
                  borderRadius: 'var(--canon-radius-pill)',
                  background: 'var(--canon-bg-2)',
                  border: '1px solid var(--canon-border-2)',
                  fontSize: 11,
                  color: 'var(--canon-cream-2)',
                }}
              >
                {tRationale(key)}
              </span>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
