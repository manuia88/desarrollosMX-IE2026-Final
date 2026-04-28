'use client';

// F14.F.11 Sprint 10 BIBLIA Tarea 10.4 — Feedback Admin Dashboard.
// Vista admin-only: NPS distribution + sentiment breakdown + qualitative themes.
// Consume trpc.studio.sprint10Feedback.getNpsAggregate (STUB H2 — throws NOT_IMPLEMENTED).
// Catch NOT_IMPLEMENTED → empty state "Esperando primer asesor real" + mock data preview opcional.
// ADR-050 canon: Card elevated + recharts + brand gradient chart colors.

import type { CSSProperties, ReactElement } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { trpc } from '@/shared/lib/trpc/client';
import { Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

const NPS_COLORS = {
  detractor: '#EC4899',
  passive: '#F59E0B',
  promoter: '#14B8A6',
} as const;

const SENTIMENT_COLORS = ['#6366F1', '#A855F7', '#EC4899', '#14B8A6'];

export interface NpsDistributionPoint {
  readonly score: number;
  readonly count: number;
  readonly tier: 'detractor' | 'passive' | 'promoter';
}

export interface SentimentTheme {
  readonly theme: string;
  readonly count: number;
  readonly tone: 'positive' | 'neutral' | 'negative';
}

export interface FeedbackAdminAggregate {
  readonly totalResponses: number;
  readonly npsScore: number;
  readonly distribution: ReadonlyArray<NpsDistributionPoint>;
  readonly themes: ReadonlyArray<SentimentTheme>;
}

export interface FeedbackAdminDashboardPresentationProps {
  readonly aggregate: FeedbackAdminAggregate | null;
  readonly isLoading: boolean;
  readonly stubH2: boolean;
  readonly stubMessage: string | null;
  readonly errorMessage: string | null;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  padding: '24px',
  maxWidth: '1200px',
  margin: '0 auto',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '28px',
  fontWeight: 800,
  color: 'var(--canon-cream)',
  letterSpacing: '-0.015em',
};

const subtitleStyle: CSSProperties = {
  fontSize: '14px',
  color: 'var(--canon-cream-2)',
  lineHeight: 1.55,
};

const kpiGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
};

const kpiCardStyle: CSSProperties = {
  padding: '20px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const kpiLabelStyle: CSSProperties = {
  fontSize: '11px',
  color: 'var(--canon-cream-2)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 600,
};

const kpiValueStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '36px',
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--canon-cream)',
  letterSpacing: '-0.01em',
};

const chartTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '16px',
  color: 'var(--canon-cream)',
  marginBottom: '12px',
};

const emptyStateCardStyle: CSSProperties = {
  padding: '36px 28px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: '14px',
};

const usersIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);

export function FeedbackAdminDashboardPresentation({
  aggregate,
  isLoading,
  stubH2,
  stubMessage,
  errorMessage,
}: FeedbackAdminDashboardPresentationProps): ReactElement {
  if (isLoading) {
    return (
      <div style={containerStyle} data-testid="feedback-admin-loading">
        <p style={subtitleStyle}>Cargando feedback agregado...</p>
      </div>
    );
  }

  if (stubH2 || aggregate === null) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={titleStyle}>Feedback agregado</h1>
            <DisclosurePill tone="amber">BETA — H2</DisclosurePill>
          </div>
          <p style={subtitleStyle}>
            Vista panorámica de cómo perciben DMX Studio los asesores que ya entraron a la beta.
          </p>
        </div>

        <Card
          variant="recessed"
          style={emptyStateCardStyle}
          data-testid="feedback-admin-empty-state"
          data-empty-state="true"
        >
          <IconCircle tone="indigo" size="lg" icon={usersIcon} />
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--canon-cream)',
            }}
          >
            Esperando primer asesor real
          </h2>
          <p style={{ ...subtitleStyle, maxWidth: '420px' }}>
            {stubMessage ??
              'Aún no recolectamos respuestas NPS. Esta vista se llenará cuando los primeros 50 asesores invitados a beta envíen feedback.'}
          </p>
        </Card>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div style={containerStyle} data-testid="feedback-admin-error">
        <p style={{ ...subtitleStyle, color: '#fca5a5' }}>{errorMessage}</p>
      </div>
    );
  }

  return (
    <div style={containerStyle} data-testid="feedback-admin-loaded">
      <div style={headerStyle}>
        <h1 style={titleStyle}>Feedback agregado</h1>
        <p style={subtitleStyle}>
          Visión panorámica del NPS y los temas que aparecen en los comentarios.
        </p>
      </div>

      <div style={kpiGridStyle}>
        <Card variant="elevated" style={kpiCardStyle} data-testid="kpi-total-responses">
          <span style={kpiLabelStyle}>Respuestas totales</span>
          <span style={kpiValueStyle}>{aggregate.totalResponses}</span>
        </Card>
        <Card variant="spotlight" style={kpiCardStyle} data-testid="kpi-nps-score">
          <span style={kpiLabelStyle}>NPS</span>
          <span style={kpiValueStyle}>{aggregate.npsScore.toFixed(0)}</span>
        </Card>
      </div>

      <Card variant="elevated">
        <div style={{ padding: '20px' }}>
          <h2 style={chartTitleStyle}>Distribución de puntajes (0–10)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={aggregate.distribution.map((d) => ({
                score: String(d.score),
                count: d.count,
                tier: d.tier,
              }))}
            >
              <XAxis dataKey="score" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#1F1B2E',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                }}
              />
              <Bar dataKey="count">
                {aggregate.distribution.map((entry) => (
                  <Cell key={`bar-${entry.score}`} fill={NPS_COLORS[entry.tier]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card variant="elevated">
        <div style={{ padding: '20px' }}>
          <h2 style={chartTitleStyle}>Temas cualitativos</h2>
          {aggregate.themes.length === 0 ? (
            <p style={subtitleStyle}>Aún sin temas suficientes para destacar.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={aggregate.themes.map((t) => ({ name: t.theme, value: t.count }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {aggregate.themes.map((entry, idx) => (
                    <Cell
                      key={`pie-${entry.theme}`}
                      fill={SENTIMENT_COLORS[idx % SENTIMENT_COLORS.length] ?? '#6366F1'}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

export function FeedbackAdminDashboard(): ReactElement {
  // STUB ADR-018 — getNpsAggregate tira NOT_IMPLEMENTED H1.
  // Cuando founder activa flag H2 → real data desde studio_feedback aggregation.
  const aggregateQuery = trpc.studio.sprint10Feedback.getNpsAggregate.useQuery(
    { rangeDays: 30 },
    { retry: false },
  );

  const isStub =
    aggregateQuery.error?.data?.code === 'NOT_IMPLEMENTED' ||
    /NOT_IMPLEMENTED/i.test(aggregateQuery.error?.message ?? '');

  const errorMessage =
    aggregateQuery.error && !isStub
      ? 'No pudimos cargar el feedback agregado. Intenta de nuevo.'
      : null;

  return (
    <FeedbackAdminDashboardPresentation
      aggregate={(aggregateQuery.data as FeedbackAdminAggregate | undefined) ?? null}
      isLoading={aggregateQuery.isLoading}
      stubH2={isStub}
      stubMessage={isStub ? (aggregateQuery.error?.message ?? null) : null}
      errorMessage={errorMessage}
    />
  );
}
