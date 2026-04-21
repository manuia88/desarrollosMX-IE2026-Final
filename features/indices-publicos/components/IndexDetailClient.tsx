'use client';

import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { CausalExplanation } from '@/features/causal-engine/components/CausalExplanation';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { LabelPill } from '@/shared/ui/dopamine/label-pill';
import { cn } from '@/shared/ui/primitives/cn';
import { useIndexDetail, useIndexRanking } from '../hooks/useIndexRanking';
import {
  bandToLabelPillTone,
  type IndexCode,
  resolveScoreBand,
  type ScopeType,
  type ScoreBand,
  type TrendDirection,
  trendToArrow,
} from '../lib/index-registry-helpers';
import { IndexBadge } from './IndexBadge';
import { RankingTable } from './RankingTable';
import { SocialShareButtons } from './SocialShareButtons';

export interface IndexDetailClientProps {
  readonly indexCode: IndexCode;
  readonly scopeType: ScopeType;
  readonly scopeId: string | null;
  readonly locale: string;
  readonly shareUrl: string;
  readonly className?: string;
}

function isScoreBand(value: string | null): value is ScoreBand {
  return value === 'excelente' || value === 'bueno' || value === 'regular' || value === 'bajo';
}

function isTrendDirection(value: string | null): value is TrendDirection {
  return value === 'mejorando' || value === 'estable' || value === 'empeorando';
}

export function IndexDetailClient({
  indexCode,
  scopeType,
  scopeId,
  locale,
  shareUrl,
  className,
}: IndexDetailClientProps) {
  void locale;
  const t = useTranslations('IndicesPublic');
  const ranking = useIndexRanking({ indexCode, scopeType });
  const detail = useIndexDetail({
    indexCode,
    scopeType,
    scopeId: scopeId ?? '',
    enabled: Boolean(scopeId),
  });

  const rows = ranking.data ?? [];
  const detailRow = detail.data ?? null;
  const shareText = t('share.share_text', { code: indexCode });

  return (
    <div className={cn('space-y-6', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IndexBadge code={indexCode} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--color-text-primary)]">
              {t(`indices.${indexCode}.name`)}
            </h1>
            <p className="text-sm text-[color:var(--color-text-secondary)]">
              {t(`indices.${indexCode}.tagline`)}
            </p>
          </div>
        </div>
        <SocialShareButtons url={shareUrl} text={shareText} />
      </header>

      {detailRow ? (
        <Card3D className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-[color:var(--color-text-secondary)]">
                {t('detail.value_label')}
              </p>
              <p className="text-4xl font-semibold tabular-nums text-[color:var(--color-text-primary)]">
                {detailRow.value.toFixed(1)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(() => {
                const band = isScoreBand(detailRow.score_band)
                  ? detailRow.score_band
                  : resolveScoreBand(detailRow.value);
                return (
                  <LabelPill tone={bandToLabelPillTone(band)} size="md">
                    {t(`band.${band}`)}
                  </LabelPill>
                );
              })()}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-[color:var(--color-text-secondary)]">
                {t('detail.ranking_in_scope', {
                  rank: detailRow.ranking_in_scope ?? '—',
                  scope_type_plural: t(`scope.${scopeType}_plural`),
                })}
              </dt>
            </div>
            {detailRow.percentile !== null ? (
              <div>
                <dt className="text-[color:var(--color-text-secondary)]">
                  {t('detail.percentile', { percentile: detailRow.percentile })}
                </dt>
              </div>
            ) : null}
            <div>
              <dt className="text-[color:var(--color-text-secondary)]">
                {t('detail.confidence_label')}
              </dt>
              <dd className="font-medium text-[color:var(--color-text-primary)]">
                {t(
                  `confidence.${detailRow.confidence as 'high' | 'medium' | 'low' | 'insufficient_data'}`,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--color-text-secondary)]">
                {t('detail.trend', {
                  arrow: trendToArrow(
                    isTrendDirection(detailRow.trend_direction) ? detailRow.trend_direction : null,
                  ),
                  delta:
                    detailRow.trend_vs_previous !== null
                      ? detailRow.trend_vs_previous.toFixed(2)
                      : '—',
                })}
              </dt>
            </div>
          </dl>
        </Card3D>
      ) : null}

      {detailRow && scopeId ? (
        <CausalExplanation
          scoreId={`${indexCode}:${scopeType}:${scopeId}:${detailRow.period_date}`}
          indexCode={indexCode}
          scopeType={scopeType}
          scopeId={scopeId}
          periodDate={detailRow.period_date}
          scopeLabel={scopeId}
        />
      ) : null}

      <section
        aria-label={t('detail.ranking_in_scope', {
          rank: '#',
          scope_type_plural: t(`scope.${scopeType}_plural`),
        })}
      >
        <Suspense fallback={null}>
          {ranking.isLoading ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center text-[color:var(--color-text-secondary)]"
            >
              {t('page.loading')}
            </div>
          ) : (
            <RankingTable rows={rows} scopeType={scopeType} />
          )}
        </Suspense>
      </section>
    </div>
  );
}
