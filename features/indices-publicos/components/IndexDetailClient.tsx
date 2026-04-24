'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Suspense, useId, useState } from 'react';
import { VitalSigns, VitalSignsComparison } from '@/features/pulse-score/components';
import { isCausalLocaleSupported, useCausalExplanation } from '@/shared/hooks/useCausalExplanation';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import type { IndexCode, ScopeType } from '@/shared/types/scores';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { LabelPill } from '@/shared/ui/dopamine/label-pill';
import { CausalExplanation } from '@/shared/ui/molecules/CausalExplanation';
import { cn } from '@/shared/ui/primitives/cn';
import { useIndexDetail, useIndexRanking } from '../hooks/useIndexRanking';

const COMPARE_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,120}$/i;

import {
  bandToLabelPillTone,
  resolveScoreBand,
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
  const activeLocale = useLocale();
  const compareInputId = useId();
  const [compareOpen, setCompareOpen] = useState<boolean>(false);
  const [compareRaw, setCompareRaw] = useState<string>('');
  const compareScopeId =
    compareRaw && COMPARE_SLUG_REGEX.test(compareRaw) && compareRaw !== scopeId ? compareRaw : null;

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
  const datalistId = `${compareInputId}-suggestions`;

  const causalLocaleSupported = isCausalLocaleSupported(activeLocale);
  const causalEnabled = Boolean(detailRow && scopeId) && causalLocaleSupported;
  const causalQuery = useCausalExplanation({
    scoreId:
      detailRow && scopeId ? `${indexCode}:${scopeType}:${scopeId}:${detailRow.period_date}` : '',
    indexCode,
    scopeType,
    scopeId: scopeId ?? '',
    ...(detailRow?.period_date ? { periodDate: detailRow.period_date } : {}),
    enabled: causalEnabled,
  });

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
          data={causalQuery.data}
          isLoading={causalQuery.isLoading}
          error={causalQuery.error}
          localeSupported={causalLocaleSupported}
          scopeId={scopeId}
          scopeLabel={resolveZoneLabelSync({ scopeType, scopeId })}
        />
      ) : null}

      {detailRow && scopeId ? <VitalSigns scopeType={scopeType} scopeId={scopeId} /> : null}

      {detailRow && scopeId ? (
        <div className="flex justify-start">
          <Link
            href={`/${locale}/indices/${indexCode}/similares?scope_id=${encodeURIComponent(scopeId)}`}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] px-4 py-2 text-sm font-medium text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-sunken)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]"
          >
            {t('detail.view_similar_link')}
          </Link>
        </div>
      ) : null}

      {detailRow && scopeId ? (
        <section
          aria-label={t('compare.toggle_label')}
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCompareOpen((v) => !v)}
              aria-expanded={compareOpen}
              aria-controls={compareInputId}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] px-3 py-1.5 text-sm font-medium text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-sunken)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]"
            >
              {compareOpen ? t('compare.hide') : t('compare.toggle_label')}
            </button>
            {compareOpen ? (
              <div className="flex flex-1 min-w-[240px] flex-col gap-1">
                <label
                  htmlFor={compareInputId}
                  className="text-xs text-[color:var(--color-text-secondary)]"
                >
                  {t('compare.input_label')}
                </label>
                <input
                  id={compareInputId}
                  type="text"
                  list={datalistId}
                  inputMode="text"
                  autoComplete="off"
                  value={compareRaw}
                  onChange={(e) => setCompareRaw(e.target.value.trim())}
                  placeholder={t('compare.input_placeholder')}
                  aria-label={t('compare.input_label')}
                  className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] px-3 py-1.5 text-sm text-[color:var(--color-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]"
                />
                <datalist id={datalistId}>
                  {rows.slice(0, 20).map((r) => (
                    <option key={r.scope_id} value={r.scope_id} />
                  ))}
                </datalist>
                {compareRaw && !compareScopeId ? (
                  <p role="alert" className="text-xs text-[color:var(--color-warning,#f59e0b)]">
                    {t('compare.invalid_slug')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          {compareOpen && compareScopeId ? (
            <div className="mt-4">
              <VitalSignsComparison
                scopeA={{ scopeType, scopeId }}
                scopeB={{ scopeType, scopeId: compareScopeId }}
              />
            </div>
          ) : null}
        </section>
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
