import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon/card';
import { directionFromDelta, MomentumPill } from '@/shared/ui/primitives/canon/momentum-pill';
import { ScorePill, tierFromScore } from '@/shared/ui/primitives/canon/score-pill';

export interface KpiStripProps {
  pipelineMxn: number | null;
  leadsCount: number;
  leadsLast7d: number;
  visitsLast7dCount: number;
  visitsLast7dSeries: number[];
  avgCloseDays: number | null;
  xpLevel: number;
  xpCurrent: number;
  xpNextThreshold: number;
}

function compactCurrencyMxn(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value.toFixed(0)}`;
}

function Sparkline({ series }: { series: number[] }) {
  const max = Math.max(...series, 1);
  const width = 56;
  const height = 18;
  const barWidth = 6;
  const gap = 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {series.map((value, i) => {
        const h = Math.max(1, (value / max) * height);
        const x = i * (barWidth + gap);
        return (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: 7-day fixed series, order is stable
            key={i}
            x={x}
            y={height - h}
            width={barWidth}
            height={h}
            rx={1}
            fill="var(--accent-teal)"
            opacity={value > 0 ? 0.9 : 0.25}
          />
        );
      })}
    </svg>
  );
}

interface TileProps {
  title: string;
  bigNum: string;
  footer: React.ReactNode;
  empty?: boolean;
}

function KpiTile({ title, bigNum, footer, empty }: TileProps) {
  return (
    <Card variant="elevated" className="flex h-full flex-col justify-between p-5">
      <span
        className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: 'var(--canon-cream-3)', fontFamily: 'var(--font-body)' }}
      >
        {title}
      </span>
      <span
        className="my-2 text-[26px] font-extrabold leading-none"
        style={{
          color: empty ? 'var(--canon-cream-3)' : 'var(--canon-cream)',
          fontFamily: 'var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {bigNum}
      </span>
      <div className="mt-1 min-h-[20px]">{footer}</div>
    </Card>
  );
}

export function KpiStrip({
  pipelineMxn,
  leadsCount,
  leadsLast7d,
  visitsLast7dCount,
  visitsLast7dSeries,
  avgCloseDays,
  xpLevel,
  xpCurrent,
  xpNextThreshold,
}: KpiStripProps) {
  const t = useTranslations('AsesorDashboard.kpi');
  const stripStyle: CSSProperties = {};
  const xpRatio = xpNextThreshold > 0 ? Math.min(1, xpCurrent / xpNextThreshold) : 0;
  const avgTier =
    avgCloseDays === null ? 'neutral' : tierFromScore(100 - Math.min(avgCloseDays * 3, 100));

  return (
    <section
      aria-label={t('aria')}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      style={stripStyle}
    >
      <KpiTile
        title={t('pipeline.title')}
        bigNum={compactCurrencyMxn(pipelineMxn)}
        empty={pipelineMxn === null}
        footer={
          pipelineMxn === null ? (
            <span className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
              {t('pipeline.empty')}
            </span>
          ) : (
            <ScorePill tier={pipelineMxn >= 1_000_000 ? 'good' : 'neutral'}>
              {t('pipeline.activeLabel')}
            </ScorePill>
          )
        }
      />
      <KpiTile
        title={t('leads.title')}
        bigNum={leadsCount === 0 ? '—' : String(leadsCount)}
        empty={leadsCount === 0}
        footer={
          leadsCount === 0 ? (
            <span className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
              {t('leads.empty')}
            </span>
          ) : (
            <MomentumPill direction={directionFromDelta(leadsLast7d)}>
              {leadsLast7d > 0 ? `+${leadsLast7d}` : leadsLast7d} · 7d
            </MomentumPill>
          )
        }
      />
      <KpiTile
        title={t('visits.title')}
        bigNum={visitsLast7dCount === 0 ? '—' : String(visitsLast7dCount)}
        empty={visitsLast7dCount === 0}
        footer={
          visitsLast7dCount === 0 ? (
            <span className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
              {t('visits.empty')}
            </span>
          ) : (
            <Sparkline series={visitsLast7dSeries} />
          )
        }
      />
      <KpiTile
        title={t('avgTime.title')}
        bigNum={avgCloseDays === null ? '—' : `${avgCloseDays} ${t('avgTime.unit')}`}
        empty={avgCloseDays === null}
        footer={
          avgCloseDays === null ? (
            <span className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
              {t('avgTime.empty')}
            </span>
          ) : (
            <ScorePill tier={avgTier}>{t(`avgTime.tier.${avgTier}`)}</ScorePill>
          )
        }
      />
      <KpiTile
        title={t('xp.title')}
        bigNum={`Lv ${xpLevel}`}
        footer={
          <div className="flex flex-col gap-1">
            <div
              className="h-1.5 w-full rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
              aria-hidden="true"
            >
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${xpRatio * 100}%`,
                  background: 'var(--gradient-score-excellent)',
                }}
              />
            </div>
            <span
              className="text-[10px]"
              style={{
                color: 'var(--canon-cream-3)',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'var(--font-body)',
              }}
            >
              {xpCurrent}/{xpNextThreshold} XP
            </span>
          </div>
        }
      />
    </section>
  );
}
