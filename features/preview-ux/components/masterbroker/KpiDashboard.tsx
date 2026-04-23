import { useLocale, useTranslations } from 'next-intl';
import { formatCurrency, formatNumber } from '@/shared/lib/i18n/formatters';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import type { MockAgent } from '../../types';

export interface KpiDashboardProps {
  readonly agents: readonly MockAgent[];
}

export function KpiDashboard({ agents }: KpiDashboardProps) {
  const t = useTranslations('PreviewMasterBroker.flow.kpis');
  const locale = useLocale();

  const totalPipeline = agents.reduce((acc, a) => acc + a.pipelineMxn, 0);
  const totalYtd = agents.reduce((acc, a) => acc + a.ytdRevenueMxn, 0);
  const avgConversion =
    agents.length > 0 ? agents.reduce((acc, a) => acc + a.conversionPct, 0) / agents.length : 0;
  const topAgent = agents.reduce<MockAgent | null>((best, a) => {
    if (!best) return a;
    return a.ytdRevenueMxn > best.ytdRevenueMxn ? a : best;
  }, null);

  const cards: ReadonlyArray<{ key: string; label: string; value: string; tone: string }> = [
    {
      key: 'total_pipeline',
      label: t('total_pipeline'),
      value: formatCurrency(totalPipeline, 'MXN', locale, { maximumFractionDigits: 0 }),
      tone: 'var(--color-accent-soft, #eef2ff)',
    },
    {
      key: 'total_ytd',
      label: t('total_ytd'),
      value: formatCurrency(totalYtd, 'MXN', locale, { maximumFractionDigits: 0 }),
      tone: 'var(--color-fresh-soft, #d1fae5)',
    },
    {
      key: 'avg_conversion',
      label: t('avg_conversion'),
      value: `${formatNumber(avgConversion, locale, { maximumFractionDigits: 1 })}%`,
      tone: 'var(--color-cool-soft, #cffafe)',
    },
    {
      key: 'top_agent',
      label: t('top_agent'),
      value: topAgent?.name ?? '—',
      tone: 'var(--color-sunset-soft, #ffedd5)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-4, 1rem)',
      }}
    >
      {cards.map((c) => (
        <Card3D
          key={c.key}
          className="rounded-[var(--radius-lg)]"
          style={{
            padding: 'var(--space-5, 1.25rem)',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            border: '1px solid var(--color-border-subtle)',
            background: c.tone,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2, 0.5rem)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-xs, 0.75rem)',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 'var(--font-weight-semibold, 600)',
            }}
          >
            {c.label}
          </span>
          <span
            style={{
              fontSize: 'var(--text-2xl, 1.5rem)',
              fontWeight: 'var(--font-weight-bold, 700)',
              color: 'var(--color-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {c.value}
          </span>
        </Card3D>
      ))}
    </div>
  );
}
