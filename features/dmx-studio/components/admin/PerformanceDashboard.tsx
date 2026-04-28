'use client';

// F14.F.11 Sprint 10 BIBLIA Tarea 10.2 — Admin-only Performance Dashboard.
// Renderiza 3 gráficos: Lighthouse scores per route + Cost projections vs reality
// + Break-even thresholds. Datos H1: cost projections + break-even son REAL
// (pure functions hardcoded canon prices). Lighthouse scores son SYNTHETIC
// (STUB ADR-018 H2 hasta activar Lighthouse real).
//
// 4 señales canon ADR-018:
//   (1) STUB comment explícito
//   (2) Component muestra DisclosurePill "Datos sintéticos" en card Lighthouse
//   (3) data.synthetic flag visible en UI
//   (4) L-NEW-STUDIO-LIGHTHOUSE-BASELINE-ACTIVATE pointer
//
// ADR-050 12 reglas:
//   - Pill buttons (no se usan buttons aquí — solo cards)
//   - Brand gradient principal solo en KPIs hero (none here)
//   - Cero emoji
//   - translateY-only hover (no rotateY/scale)
//   - Motion duración ≤ 850ms (FadeUp default 600ms)
//   - prefers-reduced-motion respect (vía tokens.css)
//   - Hardcoded colors prohibidos: usamos --canon-* + --accent-* tokens
//   - Numerical respect: tabular-nums en cifras

import type { CSSProperties } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type BreakEvenAnalysis,
  calculateBreakEvenAllPlans,
} from '@/features/dmx-studio/lib/cost-tracking/break-even';
import {
  type CostProjection,
  projectAllCombinations,
} from '@/features/dmx-studio/lib/cost-tracking/projections';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';

// Synthetic Lighthouse baseline (mirrors lighthouse-baseline-mock.test.ts).
// STUB ADR-018: real Lighthouse activación H2.
interface LighthouseRow {
  readonly route: string;
  readonly fcp: number;
  readonly lcp: number;
  readonly tbt: number;
  readonly cls: number;
  readonly score: number;
  readonly synthetic: boolean;
}

const SYNTHETIC_LIGHTHOUSE_BASELINE: ReadonlyArray<LighthouseRow> = [
  { route: '/studio', fcp: 1.2, lcp: 1.8, tbt: 120, cls: 0.02, score: 92, synthetic: true },
  {
    route: '/studio-app/dashboard',
    fcp: 1.4,
    lcp: 2.1,
    tbt: 180,
    cls: 0.03,
    score: 88,
    synthetic: true,
  },
  {
    route: '/studio-app/library',
    fcp: 1.5,
    lcp: 2.4,
    tbt: 210,
    cls: 0.04,
    score: 85,
    synthetic: true,
  },
  {
    route: '/studio-app/projects/new',
    fcp: 1.3,
    lcp: 2.0,
    tbt: 150,
    cls: 0.02,
    score: 90,
    synthetic: true,
  },
];

const PLAN_COLORS: Readonly<Record<string, string>> = {
  pro: '#6366F1', // canon indigo
  foto: '#EC4899', // canon rose (brand gradient endpoint)
  agency: '#22D3EE', // canon cyan
};

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  padding: '24px',
  maxWidth: '1280px',
  margin: '0 auto',
};

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '28px',
  letterSpacing: '-0.015em',
  color: 'var(--canon-cream)',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '14px',
  lineHeight: 1.55,
};

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '16px',
};

const cardTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '16px',
  color: 'var(--canon-cream)',
};

const cardBodyStyle: CSSProperties = {
  padding: '20px',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontVariantNumeric: 'tabular-nums',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '1px solid var(--canon-border)',
  color: 'var(--canon-cream-2)',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--canon-border)',
  color: 'var(--canon-cream)',
  fontSize: '13px',
};

export interface PerformanceDashboardProps {
  /** When true, hides the admin-only top heading + tightens layout for embed contexts. */
  readonly compact?: boolean;
}

export function PerformanceDashboard({ compact = false }: PerformanceDashboardProps) {
  const projections = projectAllCombinations();
  const breakEven = calculateBreakEvenAllPlans();

  const lighthouseChartData = SYNTHETIC_LIGHTHOUSE_BASELINE.map((row) => ({
    route: shortRoute(row.route),
    score: row.score,
    lcp: row.lcp,
  }));

  const costChartData = projections.projections.map((p: CostProjection) => ({
    label: `${p.planKey}/${p.usageProfile}`,
    planKey: p.planKey,
    cost: p.totalCosts,
    price: p.planPriceUsd,
    margin: p.grossMarginUsd,
  }));

  return (
    <section style={containerStyle} data-testid="performance-dashboard">
      {!compact && (
        <header style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1 style={headingStyle}>DMX Studio · Performance + Unit Economics</h1>
          <p style={subtitleStyle}>
            Cost projections (real, pure function), break-even thresholds (real) y Lighthouse scores
            (sintéticos H1, datos reales activación H2).
          </p>
        </header>
      )}

      <Card variant="elevated">
        <div style={cardBodyStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={cardTitleStyle}>Lighthouse scores per route (Studio)</h2>
            <DisclosurePill tone="amber">Datos sintéticos · H2 real</DisclosurePill>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={lighthouseChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="route" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" name="Lighthouse score" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card variant="elevated">
        <div style={cardBodyStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={cardTitleStyle}>Cost projections vs plan price (USD/mes)</h2>
            <DisclosurePill tone="indigo">Real · canon prices</DisclosurePill>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" />
              <Tooltip />
              <Legend />
              <Bar dataKey="cost" name="Costo proyectado">
                {costChartData.map((row) => (
                  <Cell key={row.label} fill={PLAN_COLORS[row.planKey] ?? '#6366F1'} />
                ))}
              </Bar>
              <Bar dataKey="price" name="Precio plan" fill="rgba(255,255,255,0.4)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card variant="elevated">
        <div style={cardBodyStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={cardTitleStyle}>Break-even thresholds per plan (typical usage)</h2>
            <DisclosurePill tone="violet">
              Operational fixed: ${breakEven.operationalFixedUsd}
            </DisclosurePill>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Plan</th>
                <th style={thStyle}>Costo/usuario</th>
                <th style={thStyle}>Margen contribución</th>
                <th style={thStyle}>Margen %</th>
                <th style={thStyle}>Usuarios para break-even</th>
                <th style={thStyle}>MRR target</th>
                <th style={thStyle}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {breakEven.perPlan.map((row: BreakEvenAnalysis) => (
                <tr key={row.planKey}>
                  <td style={tdStyle}>
                    <strong>{row.planKey}</strong>
                  </td>
                  <td style={tdStyle}>${row.costPerUserUsd.toFixed(2)}</td>
                  <td style={tdStyle}>${row.contributionMarginPerUserUsd.toFixed(2)}</td>
                  <td style={tdStyle}>{row.contributionMarginPct.toFixed(1)}%</td>
                  <td style={tdStyle}>
                    {row.usersNeeded === 9999 ? 'No alcanzable' : row.usersNeeded}
                  </td>
                  <td style={tdStyle}>${row.mrrTargetUsd.toFixed(0)}</td>
                  <td style={tdStyle}>
                    {row.profitableAtUsage ? (
                      <DisclosurePill tone="indigo">Profitable</DisclosurePill>
                    ) : (
                      <DisclosurePill tone="rose">Negative margin</DisclosurePill>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p style={{ ...subtitleStyle, fontSize: '11px', opacity: 0.7 }}>
        STUB ADR-018: Lighthouse scores arriba son sintéticos H1. Activación H2 vía
        L-NEW-STUDIO-LIGHTHOUSE-BASELINE-ACTIVATE. Cost projections + break-even son cálculos reales
        basados en precios canon BIBLIA v4 (Replicate Kling $2.25, ElevenLabs $0.025, Anthropic
        $0.10, Vercel Sandbox $0.10 por video base).
      </p>
    </section>
  );
}

function shortRoute(route: string): string {
  // Truncate long route paths for chart X-axis legibility.
  if (route.length <= 24) return route;
  return `${route.slice(0, 21)}...`;
}
