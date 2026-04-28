'use client';

// F14.F.9 Sprint 8 BIBLIA Upgrade 11 vía ADR-056 — M10 Dashboard Dev widget Serie activa.
// Cross-feature read via shared/lib/dashboard-dev-cross-feature.

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { ActiveSeriesWidgetData } from '@/shared/lib/dashboard-dev-cross-feature';

export interface StudioSerieActivaWidgetProps {
  readonly locale: string;
  readonly data: ActiveSeriesWidgetData | null;
}

const wrapperStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  padding: 20,
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 18,
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: 13,
  marginTop: 4,
};

const ctaStyle: CSSProperties = {
  marginTop: 16,
  display: 'inline-block',
  background: 'linear-gradient(90deg, #6366F1, #EC4899)',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 9999,
  padding: '8px 16px',
  fontWeight: 600,
  fontSize: 13,
  textDecoration: 'none',
  cursor: 'pointer',
};

const progressBarBg: CSSProperties = {
  height: 6,
  background: 'var(--surface-recessed)',
  borderRadius: 9999,
  marginTop: 12,
  overflow: 'hidden',
};

export function StudioSerieActivaWidget({ locale, data }: StudioSerieActivaWidgetProps) {
  if (!data) return null;

  const pct = data.totalEpisodes > 0 ? (data.publishedEpisodes / data.totalEpisodes) * 100 : 0;

  return (
    <section style={wrapperStyle} aria-label="Widget serie activa">
      <h3 style={titleStyle}>Serie activa</h3>
      <div style={subtitleStyle}>{data.title}</div>
      {data.desarrolloNombre ? (
        <div style={subtitleStyle}>Proyecto: {data.desarrolloNombre}</div>
      ) : null}
      <div
        style={{
          marginTop: 12,
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 26,
          color: '#FFFFFF',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {data.publishedEpisodes}/{data.totalEpisodes}
      </div>
      <div style={subtitleStyle}>capitulos publicados</div>
      <div style={progressBarBg}>
        <div
          style={{
            width: `${Math.min(100, pct)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #6366F1, #EC4899)',
          }}
        />
      </div>
      {data.nextEpisodeNumber ? (
        <div style={{ ...subtitleStyle, marginTop: 8 }}>
          Próximo: Cap {data.nextEpisodeNumber} — {data.nextEpisodeTitle ?? 'sin título'}
        </div>
      ) : null}
      <Link href={`/${locale}/studio-app/series/${data.seriesId}`} style={ctaStyle}>
        Ver detalles
      </Link>
    </section>
  );
}
