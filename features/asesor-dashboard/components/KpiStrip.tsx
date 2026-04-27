'use client';

import { useTranslations } from 'next-intl';
import { SparklineMini } from '@/shared/ui/charts/sparkline-mini';
import { AnimatedBar } from '@/shared/ui/motion/animated-bar';
import { StaggerContainer } from '@/shared/ui/motion/stagger-container';
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

interface TileProps {
  title: string;
  bigNum: string;
  footer: React.ReactNode;
  empty?: boolean | undefined;
  spark?: ReadonlyArray<number> | undefined;
  variant?: 'elevated' | 'glow' | undefined;
}

function KpiTile({ title, bigNum, footer, empty, spark, variant = 'elevated' }: TileProps) {
  return (
    <div className="group relative h-full transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5">
      <Card
        variant={variant}
        className="flex h-full flex-col justify-between p-5 transition-[border-color,box-shadow] duration-200 group-hover:border-[color:var(--canon-card-border-hover)] group-hover:shadow-[var(--canon-card-shadow-hover)]"
      >
        <span
          className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--canon-white-pure)', fontFamily: 'var(--font-body)' }}
        >
          {title}
        </span>
        <span
          className="my-2 text-[28px] leading-none"
          style={{
            color: empty ? 'var(--canon-cream-3)' : 'var(--canon-cream)',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {bigNum}
        </span>
        {spark && spark.length > 1 ? (
          <div className="mt-1">
            <SparklineMini data={spark} height={20} stroke="#6366f1" fill="#6366f1" />
          </div>
        ) : null}
        <div className="mt-1 min-h-[20px]">{footer}</div>
      </Card>
    </div>
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
  const xpRatio = xpNextThreshold > 0 ? Math.min(1, xpCurrent / xpNextThreshold) : 0;
  const avgTier =
    avgCloseDays === null ? 'neutral' : tierFromScore(100 - Math.min(avgCloseDays * 3, 100));

  return (
    <section aria-label={t('aria')}>
      <StaggerContainer
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
        staggerMs={80}
        distance={16}
      >
        <KpiTile
          title={t('pipeline.title')}
          bigNum={compactCurrencyMxn(pipelineMxn)}
          empty={pipelineMxn === null}
          footer={
            pipelineMxn === null ? (
              <span className="text-[11px]" style={{ color: 'var(--canon-cream-2)' }}>
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
              <span className="text-[11px]" style={{ color: 'var(--canon-cream-2)' }}>
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
          spark={visitsLast7dCount > 0 ? visitsLast7dSeries : undefined}
          footer={
            visitsLast7dCount === 0 ? (
              <span className="text-[11px]" style={{ color: 'var(--canon-cream-2)' }}>
                {t('visits.empty')}
              </span>
            ) : null
          }
        />
        <KpiTile
          title={t('avgTime.title')}
          bigNum={avgCloseDays === null ? '—' : `${avgCloseDays} ${t('avgTime.unit')}`}
          empty={avgCloseDays === null}
          footer={
            avgCloseDays === null ? (
              <span className="text-[11px]" style={{ color: 'var(--canon-cream-2)' }}>
                {t('avgTime.empty')}
              </span>
            ) : (
              <ScorePill tier={avgTier}>{t(`avgTime.tier.${avgTier}`)}</ScorePill>
            )
          }
        />
        <KpiTile
          variant="glow"
          title={t('xp.title')}
          bigNum={`Lv ${xpLevel}`}
          footer={
            <div className="flex flex-col gap-1">
              <AnimatedBar
                value={xpRatio * 100}
                max={100}
                fillBackground="var(--gradient-score-excellent)"
                glowColor="rgba(34,197,94,0.40)"
                height={6}
                ariaLabel={`${xpCurrent}/${xpNextThreshold} XP`}
              />
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
      </StaggerContainer>
    </section>
  );
}
