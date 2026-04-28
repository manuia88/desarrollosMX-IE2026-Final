'use client';

// F14.F.6 Sprint 5 BIBLIA LATERAL 6 — Speech analytics dashboard.

import { trpc } from '@/shared/lib/trpc/client';
import { BenchmarkComparison } from './BenchmarkComparison';

export interface SpeechAnalyticsDashboardProps {
  readonly rawVideoId?: string;
}

export function SpeechAnalyticsDashboard({ rawVideoId }: SpeechAnalyticsDashboardProps) {
  const userStatsQuery = trpc.studio.speechAnalytics.getUserStats.useQuery({});
  const benchmarksQuery = trpc.studio.speechAnalytics.getBenchmarks.useQuery(
    rawVideoId ? { rawVideoId } : undefined,
  );

  if (userStatsQuery.isLoading) return <div role="status">Cargando analytics...</div>;
  if (userStatsQuery.error) {
    return (
      <div role="alert" style={{ color: 'var(--canon-red)' }}>
        {userStatsQuery.error.message}
      </div>
    );
  }

  const stats = userStatsQuery.data ?? [];
  const lastStats = stats[0];

  if (stats.length === 0) {
    return (
      <p style={{ color: 'var(--canon-cream-2)', fontSize: '14px' }}>
        Aún no tienes videos analizados. Sube un video crudo para ver speech analytics.
      </p>
    );
  }

  return (
    <section
      aria-label="Speech analytics"
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      <header>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '28px',
            color: 'var(--canon-cream)',
          }}
        >
          Speech analytics
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--canon-cream-2)', marginTop: '8px' }}>
          {stats.length} video(s) analizado(s)
        </p>
      </header>

      {lastStats ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          <KpiCard
            label="WPM"
            value={String(lastStats.words_per_minute ?? '—')}
            suffix="palabras/min"
          />
          <KpiCard
            label="Muletillas"
            value={`${lastStats.filler_ratio_pct ?? '—'}%`}
            suffix={`${lastStats.filler_count} totales`}
          />
          <KpiCard label="Claridad" value={String(lastStats.clarity_score ?? '—')} suffix="/100" />
          <KpiCard label="Sentimiento" value={String(lastStats.sentiment ?? 'neutral')} suffix="" />
        </div>
      ) : null}

      {benchmarksQuery.data?.comparison ? (
        <BenchmarkComparison comparison={benchmarksQuery.data.comparison} />
      ) : null}
    </section>
  );
}

function KpiCard({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 'var(--canon-radius-card)',
        padding: '20px',
      }}
    >
      <p style={{ fontSize: '12px', color: 'var(--canon-cream-2)', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '32px',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--canon-cream)',
          marginTop: '4px',
        }}
      >
        {value}
      </p>
      {suffix ? (
        <p style={{ fontSize: '11px', color: 'var(--canon-cream-2)', marginTop: '4px' }}>
          {suffix}
        </p>
      ) : null}
    </div>
  );
}
