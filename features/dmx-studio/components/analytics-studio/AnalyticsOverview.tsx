'use client';

// F14.F.8 Sprint 7 BIBLIA Tarea 7.3 — Analytics dashboard overview.

import type { CSSProperties } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { Card } from '@/shared/ui/primitives/canon';
import { ExportPdfButton } from './ExportPdfButton';

const PIE_COLORS = ['#6366F1', '#EC4899', '#22D3EE', '#F59E0B'];

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  padding: '24px',
  maxWidth: '1200px',
  margin: '0 auto',
};

const kpiGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
};

const kpiCardStyle: CSSProperties = {
  padding: '20px',
  borderRadius: 'var(--canon-radius-card)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
};

const kpiLabelStyle: CSSProperties = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.6)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const kpiValueStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--canon-cream)',
  marginTop: '8px',
};

export function AnalyticsOverview() {
  const overviewQuery = trpc.studio.sprint7Analytics.getOverview.useQuery({ monthsBack: 1 });

  if (overviewQuery.isLoading) {
    return <div style={containerStyle}>Cargando analytics…</div>;
  }
  const data = overviewQuery.data;
  if (!data) {
    return <div style={containerStyle}>Sin datos en este período.</div>;
  }

  return (
    <div style={containerStyle}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '28px',
            color: 'var(--canon-cream)',
          }}
        >
          Tu performance
        </h1>
        <ExportPdfButton monthsBack={1} />
      </header>

      <div style={kpiGridStyle}>
        <Kpi label="Videos generados" value={data.totalProjects} />
        <Kpi label="Archivos rendered" value={data.totalRendered} />
        <Kpi label="Costo USD" value={`$${data.totalCostsUsd.toFixed(2)}`} />
        <Kpi label="Leads recibidos" value={data.totalReferrals} />
        <Kpi label="Conversión leads" value={`${data.conversionRatePct.toFixed(1)}%`} />
        <Kpi
          label="Rating promedio"
          value={data.avgRating ? `${data.avgRating.toFixed(2)}/5` : 'N/A'}
        />
      </div>

      <Card variant="elevated">
        <div style={{ padding: '20px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '16px',
              color: 'var(--canon-cream)',
              marginBottom: '16px',
            }}
          >
            Hooks utilizados
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.hookBreakdown.map((h) => ({ name: h.hook, count: h.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card variant="elevated">
        <div style={{ padding: '20px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '16px',
              color: 'var(--canon-cream)',
              marginBottom: '16px',
            }}
          >
            Formatos preferidos
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.formatBreakdown.map((f) => ({ name: f.format, value: f.count }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {data.formatBreakdown.map((entry, idx) => (
                  <Cell
                    key={`cell-${entry.format}`}
                    fill={PIE_COLORS[idx % PIE_COLORS.length] ?? '#6366F1'}
                  />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={kpiCardStyle}>
      <div style={kpiLabelStyle}>{label}</div>
      <div style={kpiValueStyle}>{value}</div>
    </div>
  );
}
