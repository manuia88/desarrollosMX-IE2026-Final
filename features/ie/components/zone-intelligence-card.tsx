'use client';

import { useMemo } from 'react';
import type { CalculatorOutput } from '@/shared/lib/intelligence-engine/calculators/base';
import { SCORE_REGISTRY } from '@/shared/lib/intelligence-engine/score-registry';
import {
  IntelligenceCard,
  type IntelligenceCardEntry,
  type IntelligenceCardStatus,
} from '@/shared/ui/dopamine/intelligence-card';
import type { MethodologyShape } from '@/shared/ui/dopamine/score-transparency-panel';
import { useForceIeFlag } from '../hooks/use-force-ie-flag';
import { useZoneScores } from '../hooks/use-zone-scores';

type ZoneScoreRow = {
  readonly zone_id: string;
  readonly country_code: string;
  readonly score_type: string;
  readonly score_value: number;
  readonly score_label: string | null;
  readonly level: number;
  readonly tier: number;
  readonly confidence: string;
  readonly components: unknown;
  readonly inputs_used: unknown;
  readonly citations: unknown;
  readonly provenance: unknown;
  readonly deltas: unknown;
  readonly ranking: unknown;
  readonly comparable_zones: unknown;
  readonly trend_direction: string | null;
  readonly trend_vs_previous: number | null;
  readonly valid_until: string | null;
  readonly period_date: string;
  readonly computed_at: string;
};

function rowToOutput(row: ZoneScoreRow): CalculatorOutput {
  type Mutable = {
    -readonly [K in keyof CalculatorOutput]: CalculatorOutput[K];
  };
  const base: Mutable = {
    score_value: row.score_value,
    score_label: row.score_label ?? `ie.score.${row.score_type.toLowerCase()}.default`,
    components: (row.components as Record<string, unknown>) ?? {},
    inputs_used: (row.inputs_used as Record<string, unknown>) ?? {},
    confidence: row.confidence as CalculatorOutput['confidence'],
    citations: (row.citations as CalculatorOutput['citations']) ?? [],
    provenance: (row.provenance as CalculatorOutput['provenance']) ?? {
      sources: [],
      computed_at: row.computed_at,
      calculator_version: 'unknown',
    },
  };
  if (row.trend_vs_previous !== null) base.trend_vs_previous = row.trend_vs_previous;
  if (
    row.trend_direction === 'mejorando' ||
    row.trend_direction === 'estable' ||
    row.trend_direction === 'empeorando'
  ) {
    base.trend_direction = row.trend_direction;
  }
  if (row.valid_until !== null) base.valid_until = row.valid_until;
  return base;
}

function defaultMethodology(scoreType: string): MethodologyShape {
  return {
    formula: `Ver catálogo 03.8 §${scoreType}`,
    sources: [],
  };
}

export interface ZoneIntelligenceCardProps {
  readonly zoneId: string | undefined;
  readonly scoreCodes?: readonly string[];
  readonly countryCode?: string;
  readonly isSuperadmin?: boolean;
  readonly locale?: string;
  readonly className?: string;
  readonly showTransparency?: boolean;
  readonly showRecommendations?: boolean;
}

export function ZoneIntelligenceCard({
  zoneId,
  scoreCodes,
  countryCode = 'MX',
  isSuperadmin = false,
  locale = 'es-MX',
  className,
  showTransparency = true,
  showRecommendations = true,
}: ZoneIntelligenceCardProps) {
  const forceFlag = useForceIeFlag();
  const { data, isLoading, isError, error, refetch } = useZoneScores(zoneId, {
    countryCode,
    ...(scoreCodes !== undefined ? { scoreCodes } : {}),
  });

  const entries = useMemo<IntelligenceCardEntry[]>(() => {
    if (!data) return [];
    const rows = data as readonly ZoneScoreRow[];
    return rows
      .map((row): IntelligenceCardEntry | null => {
        const registry = SCORE_REGISTRY.find((e) => e.score_id === row.score_type);
        if (!registry) return null;
        return {
          scoreOutput: rowToOutput(row),
          registryEntry: registry,
          methodology: defaultMethodology(row.score_type),
        };
      })
      .filter((e): e is IntelligenceCardEntry => e !== null);
  }, [data]);

  const status: IntelligenceCardStatus = isLoading
    ? 'loading'
    : isError
      ? 'error'
      : entries.length === 0
        ? 'empty'
        : 'ready';

  return (
    <IntelligenceCard
      entries={entries}
      status={status}
      error={isError ? (error?.message ?? null) : null}
      isSuperadmin={isSuperadmin}
      forceFlag={forceFlag}
      showTransparency={showTransparency}
      showRecommendations={showRecommendations}
      locale={locale}
      {...(className !== undefined ? { className } : {})}
      onRetry={() => refetch()}
    />
  );
}
