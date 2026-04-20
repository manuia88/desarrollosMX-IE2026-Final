'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import type {
  CalculatorOutput,
  Confidence,
} from '@/shared/lib/intelligence-engine/calculators/base';
import { getScoreLineage } from '@/shared/lib/intelligence-engine/cascades/score-lineage';
import type { ScoreRegistryEntry } from '@/shared/lib/intelligence-engine/registry';
import { cn } from '../primitives/cn';
import { Dialog } from '../primitives/dialog';
import { ConfidenceBadge } from './confidence-badge';

export interface MethodologyShape {
  readonly formula: string;
  readonly sources: readonly string[];
  readonly weights?: Readonly<Record<string, number>>;
  readonly references?: readonly {
    readonly name: string;
    readonly url: string;
    readonly period?: string;
  }[];
}

export interface ComparableZone {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly value: number;
  readonly delta: number;
}

export interface ScoreRankingInfo {
  readonly rank: number;
  readonly total: number;
  readonly percentile: number;
}

export interface ScoreTimeSeriesInfo {
  readonly delta3m?: number;
  readonly delta6m?: number;
  readonly delta12m?: number;
}

export interface ScoreTransparencyPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scoreOutput: CalculatorOutput;
  registryEntry: ScoreRegistryEntry;
  methodology: MethodologyShape;
  reasoningTemplate?: string;
  comparableZones?: readonly ComparableZone[];
  ranking?: ScoreRankingInfo;
  timeSeries?: ScoreTimeSeriesInfo;
  locale?: string;
  /** D10 FASE 09 — muestra upstream + downstream dependencies del SCORE_REGISTRY. */
  showDependencyTree?: boolean;
}

export function resolveReasoning(
  template: string | undefined,
  templateVars: Readonly<Record<string, string | number>> | undefined,
  extra: Readonly<Record<string, string | number>>,
): string | null {
  if (!template) return null;
  const vars: Record<string, string | number> = {
    ...(templateVars ?? {}),
    ...extra,
  };
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null) return match;
    return String(v);
  });
}

function formatDelta(delta: number | undefined): string {
  if (delta === undefined || Number.isNaN(delta)) return '—';
  const rounded = Math.round(delta * 10) / 10;
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
}

export function ScoreTransparencyPanel({
  open,
  onOpenChange,
  scoreOutput,
  registryEntry,
  methodology,
  reasoningTemplate,
  comparableZones,
  ranking,
  timeSeries,
  locale = 'es-MX',
  showDependencyTree = false,
}: ScoreTransparencyPanelProps) {
  const t = useTranslations();
  const [methodologyExpanded, setMethodologyExpanded] = useState(false);

  const lineage = useMemo(
    () => (showDependencyTree ? getScoreLineage(registryEntry.score_id) : null),
    [showDependencyTree, registryEntry.score_id],
  );

  const reasoning = useMemo(
    () =>
      resolveReasoning(reasoningTemplate, scoreOutput.template_vars, {
        score_value: scoreOutput.score_value,
        confidence: scoreOutput.confidence,
      }),
    [reasoningTemplate, scoreOutput.template_vars, scoreOutput.score_value, scoreOutput.confidence],
  );

  const confidence: Confidence = scoreOutput.confidence;
  const methodologyUrl = `/metodologia/${registryEntry.score_id.toLowerCase()}`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-w-xl max-h-[85vh] overflow-y-auto">
        <Dialog.Header>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Dialog.Title>
                {registryEntry.name}{' '}
                <span className="text-[var(--color-text-muted)] font-[var(--font-weight-regular)]">
                  ({registryEntry.score_id})
                </span>
              </Dialog.Title>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-2xl)] font-[var(--font-weight-bold)] text-[var(--color-brand-primary)] tabular-nums">
                {scoreOutput.score_value}
              </span>
              <ConfidenceBadge confidence={confidence} size="sm" />
            </div>
          </div>
          <Dialog.Description>{t(scoreOutput.score_label)}</Dialog.Description>
        </Dialog.Header>

        <div className="flex flex-col gap-4">
          {reasoning ? (
            <section aria-label={t('ie.transparency.reasoning')}>
              <h4 className={sectionHeading}>{t('ie.transparency.reasoning')}</h4>
              <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] leading-[var(--leading-relaxed)]">
                {reasoning}
              </p>
            </section>
          ) : null}

          <section aria-label={t('ie.transparency.methodology')}>
            <button
              type="button"
              onClick={() => setMethodologyExpanded((prev) => !prev)}
              aria-expanded={methodologyExpanded}
              className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-sm"
            >
              <span className={sectionHeading}>{t('ie.transparency.methodology')}</span>
              <span
                aria-hidden="true"
                className="text-[var(--color-text-muted)] text-[var(--text-sm)]"
              >
                {methodologyExpanded ? '−' : '+'}
              </span>
            </button>
            {methodologyExpanded ? (
              <div className="flex flex-col gap-2 mt-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                <div>
                  <span className="font-[var(--font-weight-semibold)]">
                    {t('ie.transparency.formula')}:
                  </span>{' '}
                  <code className="text-[var(--text-xs)] font-[var(--font-mono)] text-[var(--color-text-primary)]">
                    {methodology.formula}
                  </code>
                </div>
                <div>
                  <span className="font-[var(--font-weight-semibold)]">
                    {t('ie.transparency.sources')}:
                  </span>{' '}
                  {methodology.sources.join(', ')}
                </div>
                {methodology.weights ? (
                  <div>
                    <span className="font-[var(--font-weight-semibold)]">
                      {t('ie.transparency.weights')}:
                    </span>{' '}
                    {Object.entries(methodology.weights)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')}
                  </div>
                ) : null}
                {methodology.references && methodology.references.length > 0 ? (
                  <div>
                    <span className="font-[var(--font-weight-semibold)]">
                      {t('ie.transparency.references')}:
                    </span>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {methodology.references.map((ref) => (
                        <li key={ref.url} className="text-[var(--text-xs)]">
                          {ref.name}
                          {ref.period ? ` (${ref.period})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section aria-label={t('ie.transparency.provenance')}>
            <h4 className={sectionHeading}>{t('ie.transparency.provenance')}</h4>
            <ul className="flex flex-col gap-0.5 text-[var(--text-xs)] text-[var(--color-text-secondary)]">
              {scoreOutput.provenance.sources.map((src) => (
                <li key={src.name}>
                  <span className="font-[var(--font-weight-semibold)]">{src.name}</span>
                  {src.period ? ` · ${src.period}` : ''}
                  {typeof src.count === 'number' ? ` · ${src.count}` : ''}
                </li>
              ))}
            </ul>
          </section>

          {comparableZones && comparableZones.length > 0 ? (
            <section aria-label={t('ie.transparency.comparable_zones')}>
              <h4 className={sectionHeading}>{t('ie.transparency.comparable_zones')}</h4>
              <ul className="grid grid-cols-3 gap-2">
                {comparableZones.slice(0, 3).map((z) => (
                  <li
                    key={z.zoneId}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] p-2"
                  >
                    <div className="text-[var(--text-xs)] text-[var(--color-text-muted)] truncate">
                      {z.zoneName}
                    </div>
                    <div className="text-[var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] tabular-nums">
                      {z.value}
                    </div>
                    <div
                      className={cn(
                        'text-[var(--text-xs)] tabular-nums',
                        z.delta > 0
                          ? 'text-[var(--color-success)]'
                          : z.delta < 0
                            ? 'text-[var(--color-danger)]'
                            : 'text-[var(--color-text-muted)]',
                      )}
                    >
                      {formatDelta(z.delta)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {ranking ? (
            <section aria-label={t('ie.transparency.ranking')}>
              <h4 className={sectionHeading}>{t('ie.transparency.ranking')}</h4>
              <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                {t('ie.transparency.rank_fmt', { rank: ranking.rank, total: ranking.total })}
              </p>
              <progress
                className="mt-1 block h-2 w-full appearance-none overflow-hidden rounded-[var(--radius-pill)] border-0 bg-[var(--color-bg-muted)] [&::-webkit-progress-bar]:bg-[var(--color-bg-muted)] [&::-webkit-progress-value]:bg-[var(--gradient-p)] [&::-moz-progress-bar]:bg-[var(--gradient-p)]"
                value={Math.max(0, Math.min(100, ranking.percentile))}
                max={100}
                aria-label={t('ie.transparency.ranking')}
              />
              <span className="sr-only">{ranking.percentile}%</span>
            </section>
          ) : null}

          {timeSeries &&
          (timeSeries.delta3m !== undefined ||
            timeSeries.delta6m !== undefined ||
            timeSeries.delta12m !== undefined) ? (
            <section aria-label={t('ie.transparency.time_series')}>
              <h4 className={sectionHeading}>{t('ie.transparency.time_series')}</h4>
              <ul className="flex gap-3 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                <li>
                  <span className="text-[var(--color-text-muted)]">
                    {t('ie.transparency.delta_3m')}:
                  </span>{' '}
                  <span className="tabular-nums font-[var(--font-weight-semibold)]">
                    {formatDelta(timeSeries.delta3m)}
                  </span>
                </li>
                <li>
                  <span className="text-[var(--color-text-muted)]">
                    {t('ie.transparency.delta_6m')}:
                  </span>{' '}
                  <span className="tabular-nums font-[var(--font-weight-semibold)]">
                    {formatDelta(timeSeries.delta6m)}
                  </span>
                </li>
                <li>
                  <span className="text-[var(--color-text-muted)]">
                    {t('ie.transparency.delta_12m')}:
                  </span>{' '}
                  <span className="tabular-nums font-[var(--font-weight-semibold)]">
                    {formatDelta(timeSeries.delta12m)}
                  </span>
                </li>
              </ul>
            </section>
          ) : null}

          {lineage &&
          (lineage.root.dependencies.length > 0 || lineage.root.dependents.length > 0) ? (
            <section aria-label={t('ie.transparency.dependencies')}>
              <h4 className={sectionHeading}>{t('ie.transparency.dependencies')}</h4>
              <div className="flex flex-col gap-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                {lineage.root.dependencies.length > 0 ? (
                  <div>
                    <span className="font-[var(--font-weight-semibold)]">
                      {t('ie.transparency.depends_on')}:
                    </span>{' '}
                    <span className="font-[var(--font-mono)] text-[var(--text-xs)]">
                      {lineage.root.dependencies.join(', ')}
                    </span>
                  </div>
                ) : null}
                {lineage.root.dependents.length > 0 ? (
                  <div>
                    <span className="font-[var(--font-weight-semibold)]">
                      {t('ie.transparency.used_by')}:
                    </span>{' '}
                    <span className="font-[var(--font-mono)] text-[var(--text-xs)]">
                      {lineage.root.dependents.join(', ')}
                    </span>
                  </div>
                ) : null}
                <div className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                  {t('ie.transparency.lineage_depth', {
                    upstream: lineage.depth_upstream,
                    downstream: lineage.depth_downstream,
                  })}
                </div>
              </div>
            </section>
          ) : null}

          <section aria-label={t('ie.transparency.validity')}>
            <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
              {t('ie.transparency.computed_at')}:{' '}
              {formatDate(scoreOutput.provenance.computed_at, locale)}
              {scoreOutput.valid_until ? (
                <>
                  {' · '}
                  {t('ie.transparency.valid_until')}: {formatDate(scoreOutput.valid_until, locale)}
                </>
              ) : null}
            </p>
          </section>
        </div>

        <Dialog.Footer>
          <a
            href={methodologyUrl}
            className="text-[var(--text-sm)] text-[var(--color-brand-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-sm"
          >
            {t('ie.transparency.see_full')}
          </a>
          <Dialog.Close asChild>
            <button
              type="button"
              className="text-[var(--text-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-sm px-2"
            >
              {t('ie.transparency.close')}
            </button>
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

const sectionHeading =
  'text-[var(--text-xs)] font-[var(--font-weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--color-text-muted)] mb-1';
