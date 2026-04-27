'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.5 — Costs breakdown (charts + KPIs).
// BarChart costos por mes (último 6 meses) + PieChart costos por modelo IA + 3 KPI cards
// (kpiTotalThisMonth, kpiAvgPerVideo, kpiProjectedEom). prefers-reduced-motion respect via
// recharts isAnimationActive=false fallback. ADR-050 canon: Card elevated, monospace tabular
// para datos, gradient AI solo en cifra hero (kpiTotalThisMonth).

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';

const sectionTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '18px',
  letterSpacing: '-0.005em',
  color: '#FFFFFF',
  margin: 0,
};

const kpiLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '11.5px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--canon-cream-2)',
};

const kpiValueStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '28px',
  lineHeight: 1.1,
  letterSpacing: '-0.01em',
  fontVariantNumeric: 'tabular-nums',
  color: '#FFFFFF',
};

const kpiHeroValueStyle: CSSProperties = {
  ...kpiValueStyle,
  background: 'var(--gradient-ai)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
};

const errorStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: '#fca5a5',
};

const skeletonStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: '300px',
};

const MODEL_COLORS: Record<string, string> = {
  kling: '#6366F1',
  elevenlabs: '#8B5CF6',
  claude: '#EC4899',
  other: 'rgba(240, 235, 224, 0.55)',
};

const MODEL_KEYS = ['kling', 'elevenlabs', 'claude', 'other'] as const;

function normalizeModelKey(raw: string): (typeof MODEL_KEYS)[number] {
  const lower = raw.toLowerCase();
  if (lower.includes('kling') || lower.includes('seedance') || lower.includes('flux'))
    return 'kling';
  if (lower.includes('eleven') || lower.includes('voice')) return 'elevenlabs';
  if (lower.includes('claude') || lower.includes('director') || lower.includes('copy'))
    return 'claude';
  return 'other';
}

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

interface MonthBucket {
  readonly period: string;
  readonly costUsd: number;
  readonly videos: number;
  readonly byModel: Record<string, number>;
}

function projectEomFromCurrent(months: ReadonlyArray<MonthBucket>, nowDate: Date): number {
  if (months.length === 0) return 0;
  const yyyy = nowDate.getUTCFullYear();
  const mm = String(nowDate.getUTCMonth() + 1).padStart(2, '0');
  const currentPeriod = `${yyyy}-${mm}`;
  const currentBucket = months.find((m) => m.period === currentPeriod);
  if (!currentBucket || currentBucket.costUsd === 0) return 0;

  const daysElapsed = nowDate.getUTCDate();
  const daysInMonth = new Date(Date.UTC(yyyy, nowDate.getUTCMonth() + 1, 0)).getUTCDate();
  if (daysElapsed === 0) return 0;
  return (currentBucket.costUsd / daysElapsed) * daysInMonth;
}

export interface CostsBreakdownProps {
  readonly testId?: string;
}

export function CostsBreakdown({ testId }: CostsBreakdownProps) {
  const t = useTranslations('Studio.usage');
  const historyQuery = trpc.studio.usage.getHistory.useQuery({ monthsBack: 6 });

  const aggregated = useMemo(() => {
    if (!historyQuery.data) return null;
    const months = historyQuery.data.months;
    const totalsByModel: Record<string, number> = { kling: 0, elevenlabs: 0, claude: 0, other: 0 };
    let currentMonthCost = 0;
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const currentPeriod = `${yyyy}-${mm}`;

    for (const month of months) {
      for (const [modelRaw, cost] of Object.entries(month.byModel)) {
        const key = normalizeModelKey(modelRaw);
        totalsByModel[key] = (totalsByModel[key] ?? 0) + cost;
      }
      if (month.period === currentPeriod) currentMonthCost = month.costUsd;
    }

    const projectedEom = projectEomFromCurrent(months as ReadonlyArray<MonthBucket>, now);
    const avgPerVideo = historyQuery.data.totals.avgPerVideo;

    return {
      months,
      totalsByModel,
      currentMonthCost,
      projectedEom,
      avgPerVideo,
    };
  }, [historyQuery.data]);

  if (historyQuery.isLoading) {
    return <div aria-hidden="true" style={skeletonStyle} data-testid="costs-breakdown-skeleton" />;
  }

  if (historyQuery.error || !aggregated) {
    return (
      <Card variant="elevated" className="p-6" role="alert" data-testid={testId}>
        <p style={errorStyle}>{t('errorLoading')}</p>
      </Card>
    );
  }

  const barChartData = aggregated.months.map((m) => ({
    period: m.period,
    costUsd: Number(m.costUsd.toFixed(4)),
  }));

  const pieChartData = MODEL_KEYS.map((key) => {
    const labelMap: Record<string, string> = {
      kling: t('modelKling'),
      elevenlabs: t('modelElevenLabs'),
      claude: t('modelClaude'),
      other: t('modelOther'),
    };
    return {
      name: labelMap[key] ?? key,
      modelKey: key,
      value: Number((aggregated.totalsByModel[key] ?? 0).toFixed(4)),
    };
  }).filter((d) => d.value > 0);

  const hasNoData = aggregated.months.length === 0;

  return (
    <section
      className="flex flex-col gap-6"
      aria-label={t('costsSectionTitle')}
      data-testid={testId}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card variant="spotlight" className="flex flex-col gap-2 p-5" data-testid="kpi-total">
          <span style={kpiLabelStyle}>{t('kpiTotalThisMonth')}</span>
          <span style={kpiHeroValueStyle}>{formatUsd(aggregated.currentMonthCost)}</span>
        </Card>
        <Card variant="elevated" className="flex flex-col gap-2 p-5" data-testid="kpi-avg">
          <span style={kpiLabelStyle}>{t('kpiAvgPerVideo')}</span>
          <span style={kpiValueStyle}>{formatUsd(aggregated.avgPerVideo)}</span>
        </Card>
        <Card variant="elevated" className="flex flex-col gap-2 p-5" data-testid="kpi-projected">
          <span style={kpiLabelStyle}>{t('kpiProjectedEom')}</span>
          <span style={kpiValueStyle}>{formatUsd(aggregated.projectedEom)}</span>
        </Card>
      </div>

      <Card variant="elevated" className="flex flex-col gap-4 p-6" data-testid="costs-bar-chart">
        <h3 style={sectionTitleStyle}>{t('costsSectionTitle')}</h3>
        {hasNoData ? (
          <p style={{ ...errorStyle, color: 'var(--canon-cream-2)' }}>{t('noDataYet')}</p>
        ) : (
          <div
            role="img"
            aria-label={t('costsSectionTitle')}
            style={{ width: '100%', height: 300 }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <XAxis dataKey="period" stroke="var(--canon-cream-2)" fontSize={11} />
                <YAxis stroke="var(--canon-cream-2)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--canon-border)',
                    borderRadius: '12px',
                    color: 'var(--canon-cream)',
                  }}
                  formatter={(value) => formatUsd(Number(value))}
                />
                <Bar dataKey="costUsd" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card variant="elevated" className="flex flex-col gap-4 p-6" data-testid="costs-pie-chart">
        <h3 style={sectionTitleStyle}>{t('costsByModelTitle')}</h3>
        {pieChartData.length === 0 ? (
          <p style={{ ...errorStyle, color: 'var(--canon-cream-2)' }}>{t('noDataYet')}</p>
        ) : (
          <div
            role="img"
            aria-label={t('costsByModelTitle')}
            style={{ width: '100%', height: 300 }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  paddingAngle={2}
                >
                  {pieChartData.map((entry) => {
                    const fillColor =
                      MODEL_COLORS[entry.modelKey] ?? MODEL_COLORS.other ?? '#6366F1';
                    return <Cell key={entry.modelKey} fill={fillColor} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--canon-border)',
                    borderRadius: '12px',
                    color: 'var(--canon-cream)',
                  }}
                  formatter={(value) => formatUsd(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <ul
          className="flex flex-wrap gap-x-5 gap-y-2 pt-2"
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          {pieChartData.map((entry) => (
            <li
              key={entry.modelKey}
              className="flex items-center gap-2"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12.5px',
                color: 'var(--canon-cream-2)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '9999px',
                  background: MODEL_COLORS[entry.modelKey] ?? MODEL_COLORS.other,
                  display: 'inline-block',
                }}
              />
              <span>{entry.name}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--canon-cream)' }}>
                {formatUsd(entry.value)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
