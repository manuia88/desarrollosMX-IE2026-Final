'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import type { CalculatorOutput } from '@/shared/lib/intelligence-engine/calculators/base';
import type { TierGateResult } from '@/shared/lib/intelligence-engine/calculators/tier-gate';
import type { ScoreRegistryEntry } from '@/shared/lib/intelligence-engine/score-registry';
import { cn } from '../primitives/cn';
import { ConfidenceBadge } from './confidence-badge';
import { ScorePlaceholder } from './score-placeholder';
import {
  ScoreRecommendationsCard,
  type ScoreRecommendationsMap,
} from './score-recommendations-card';
import {
  type ComparableZone,
  type MethodologyShape,
  type ScoreRankingInfo,
  type ScoreTimeSeriesInfo,
  ScoreTransparencyPanel,
} from './score-transparency-panel';

export interface IntelligenceCardEntry {
  readonly scoreOutput: CalculatorOutput;
  readonly registryEntry: ScoreRegistryEntry;
  readonly methodology: MethodologyShape;
  readonly reasoningTemplate?: string;
  readonly recommendations?: ScoreRecommendationsMap;
  readonly tierGate?: TierGateResult;
  readonly comparableZones?: readonly ComparableZone[];
  readonly ranking?: ScoreRankingInfo;
  readonly timeSeries?: ScoreTimeSeriesInfo;
}

export type IntelligenceCardStatus = 'loading' | 'empty' | 'error' | 'ready';

export interface IntelligenceCardProps {
  entries: readonly IntelligenceCardEntry[];
  status?: IntelligenceCardStatus;
  error?: string | null;
  isSuperadmin?: boolean;
  forceFlag?: boolean;
  showTransparency?: boolean;
  showRecommendations?: boolean;
  locale?: string;
  className?: string;
  onRetry?: () => void;
  onRecommendationAction?: (scoreId: string, actionKey: string) => void;
}

function ScoreTile({
  entry,
  isSuperadmin,
  forceFlag,
  showTransparency,
  showRecommendations,
  locale,
  onRecommendationAction,
}: {
  entry: IntelligenceCardEntry;
  isSuperadmin: boolean;
  forceFlag: boolean;
  showTransparency: boolean;
  showRecommendations: boolean;
  locale: string;
  onRecommendationAction?: ((scoreId: string, actionKey: string) => void) | undefined;
}) {
  const t = useTranslations();
  const [panelOpen, setPanelOpen] = useState(false);
  const [recsExpanded, setRecsExpanded] = useState(false);

  const { scoreOutput, registryEntry, methodology, tierGate, recommendations, reasoningTemplate } =
    entry;

  if (tierGate?.gated) {
    return (
      <ScorePlaceholder
        tierGate={tierGate}
        scoreId={registryEntry.score_id}
        isSuperadmin={isSuperadmin}
        forceFlag={forceFlag}
      >
        <ScoreTileInner
          entry={entry}
          panelOpen={panelOpen}
          setPanelOpen={setPanelOpen}
          recsExpanded={recsExpanded}
          setRecsExpanded={setRecsExpanded}
          showTransparency={showTransparency}
          showRecommendations={showRecommendations}
          locale={locale}
          onRecommendationAction={onRecommendationAction}
          t={t}
        />
      </ScorePlaceholder>
    );
  }

  return (
    <>
      <ScoreTileInner
        entry={entry}
        panelOpen={panelOpen}
        setPanelOpen={setPanelOpen}
        recsExpanded={recsExpanded}
        setRecsExpanded={setRecsExpanded}
        showTransparency={showTransparency}
        showRecommendations={showRecommendations}
        locale={locale}
        onRecommendationAction={onRecommendationAction}
        t={t}
      />
      {showTransparency ? (
        <ScoreTransparencyPanel
          open={panelOpen}
          onOpenChange={setPanelOpen}
          scoreOutput={scoreOutput}
          registryEntry={registryEntry}
          methodology={methodology}
          {...(reasoningTemplate !== undefined ? { reasoningTemplate } : {})}
          {...(entry.comparableZones !== undefined
            ? { comparableZones: entry.comparableZones }
            : {})}
          {...(entry.ranking !== undefined ? { ranking: entry.ranking } : {})}
          {...(entry.timeSeries !== undefined ? { timeSeries: entry.timeSeries } : {})}
          locale={locale}
        />
      ) : null}
      {showRecommendations && recsExpanded && recommendations ? (
        <ScoreRecommendationsCard
          scoreId={registryEntry.score_id}
          scoreValue={scoreOutput.score_value}
          confidence={scoreOutput.confidence}
          recommendations={recommendations}
          className="mt-2"
          {...(onRecommendationAction
            ? {
                onAction: (key: string) => onRecommendationAction(registryEntry.score_id, key),
              }
            : {})}
        />
      ) : null}
    </>
  );
}

function ScoreTileInner({
  entry,
  panelOpen,
  setPanelOpen,
  recsExpanded,
  setRecsExpanded,
  showTransparency,
  showRecommendations,
  t,
}: {
  entry: IntelligenceCardEntry;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  recsExpanded: boolean;
  setRecsExpanded: (v: boolean) => void;
  showTransparency: boolean;
  showRecommendations: boolean;
  locale: string;
  onRecommendationAction?: ((scoreId: string, actionKey: string) => void) | undefined;
  t: (k: string) => string;
}) {
  const { scoreOutput, registryEntry, recommendations } = entry;

  return (
    <article
      className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-xs)]"
      aria-labelledby={`score-${registryEntry.score_id}`}
    >
      <header className="flex items-center justify-between gap-2">
        <h3
          id={`score-${registryEntry.score_id}`}
          className="text-[var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]"
        >
          {registryEntry.name}
        </h3>
        <ConfidenceBadge
          confidence={scoreOutput.confidence}
          size="sm"
          onExplain={showTransparency ? () => setPanelOpen(true) : undefined}
        />
      </header>
      <div className="flex items-baseline gap-2">
        <span className="text-[var(--text-3xl)] font-[var(--font-weight-bold)] text-[var(--color-brand-primary)] tabular-nums">
          {scoreOutput.score_value}
        </span>
        <span className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
          {t(scoreOutput.score_label)}
        </span>
      </div>
      <footer className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
        {showTransparency ? (
          <button
            type="button"
            onClick={() => setPanelOpen(!panelOpen)}
            aria-expanded={panelOpen}
            className="text-[var(--text-xs)] text-[var(--color-brand-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-sm"
          >
            {t('ie.transparency.cta_open')}
          </button>
        ) : (
          <span />
        )}
        {showRecommendations && recommendations ? (
          <button
            type="button"
            onClick={() => setRecsExpanded(!recsExpanded)}
            aria-expanded={recsExpanded}
            className="text-[var(--text-xs)] text-[var(--color-brand-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-sm"
          >
            {t('ie.recommendations.cta')}
          </button>
        ) : null}
      </footer>
    </article>
  );
}

export function IntelligenceCard({
  entries,
  status = 'ready',
  error = null,
  isSuperadmin = false,
  forceFlag = false,
  showTransparency = true,
  showRecommendations = true,
  locale = 'es-MX',
  className,
  onRetry,
  onRecommendationAction,
}: IntelligenceCardProps) {
  const t = useTranslations();

  const resolvedStatus: IntelligenceCardStatus = useMemo(() => {
    if (status === 'ready' && entries.length === 0) return 'empty';
    return status;
  }, [status, entries.length]);

  if (resolvedStatus === 'loading') {
    return (
      <div
        className={cn('grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', className)}
        aria-busy="true"
        aria-live="polite"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (resolvedStatus === 'error') {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-rose)] p-6 text-center',
          className,
        )}
        role="alert"
      >
        <p className="text-[var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
          {t('ie.card.error_title')}
        </p>
        <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
          {error ?? t('ie.card.error_desc')}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-[var(--text-sm)] text-[var(--color-brand-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-sm"
          >
            {t('ie.card.retry')}
          </button>
        ) : null}
      </div>
    );
  }

  if (resolvedStatus === 'empty') {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] p-6 text-center',
          className,
        )}
        role="status"
      >
        <p className="text-[var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
          {t('ie.card.empty_title')}
        </p>
        <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
          {t('ie.card.empty_desc')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {entries.map((entry) => (
        <ScoreTile
          key={entry.registryEntry.score_id}
          entry={entry}
          isSuperadmin={isSuperadmin}
          forceFlag={forceFlag}
          showTransparency={showTransparency}
          showRecommendations={showRecommendations}
          locale={locale}
          {...(onRecommendationAction ? { onRecommendationAction } : {})}
        />
      ))}
    </div>
  );
}
