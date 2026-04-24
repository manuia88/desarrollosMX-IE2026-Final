'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import type { ScopeType } from '@/shared/types/scores';
import { LabelPill } from '@/shared/ui/dopamine/label-pill';
import { cn } from '@/shared/ui/primitives/cn';
import {
  bandToLabelPillTone,
  resolveScoreBand,
  type ScoreBand,
  type TrendDirection,
  trendToArrow,
} from '../lib/index-registry-helpers';

export interface RankingRow {
  readonly scope_id: string;
  readonly scope_type: string;
  readonly index_code: string;
  readonly value: number;
  readonly score_band: string | null;
  readonly confidence: string;
  readonly confidence_score: number | null;
  readonly ranking_in_scope: number | null;
  readonly percentile: number | null;
  readonly trend_direction: string | null;
  readonly trend_vs_previous: number | null;
  readonly period_date: string;
  readonly methodology_version: string;
}

export interface RankingTableProps {
  readonly rows: readonly RankingRow[];
  readonly scopeType: ScopeType;
  readonly isLoading?: boolean;
  readonly searchable?: boolean;
  readonly onSelect?: (row: RankingRow) => void;
  readonly className?: string;
}

type SortKey = 'rank' | 'scope' | 'value' | 'trend' | 'percentile';
type SortDir = 'asc' | 'desc';

const LAZY_THRESHOLD = 50;
const LAZY_PAGE_SIZE = 50;

function isScoreBand(value: string | null): value is ScoreBand {
  return value === 'excelente' || value === 'bueno' || value === 'regular' || value === 'bajo';
}

function isTrendDirection(value: string | null): value is TrendDirection {
  return value === 'mejorando' || value === 'estable' || value === 'empeorando';
}

function formatValue(value: number): string {
  return value.toFixed(1);
}

function formatDelta(delta: number | null): string {
  if (delta === null || Number.isNaN(delta)) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}`;
}

export function RankingTable({
  rows,
  scopeType,
  isLoading = false,
  searchable = true,
  onSelect,
  className,
}: RankingTableProps) {
  const t = useTranslations('IndicesPublic');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(LAZY_PAGE_SIZE);

  const labelByScopeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.scope_id, resolveZoneLabelSync({ scopeType: r.scope_type, scopeId: r.scope_id }));
    }
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const label = labelByScopeId.get(r.scope_id) ?? r.scope_id;
      return label.toLowerCase().includes(q);
    });
  }, [rows, search, labelByScopeId]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'scope': {
          const la = labelByScopeId.get(a.scope_id) ?? a.scope_id;
          const lb = labelByScopeId.get(b.scope_id) ?? b.scope_id;
          return la.localeCompare(lb) * dir;
        }
        case 'value':
          return (a.value - b.value) * dir;
        case 'trend': {
          const av = a.trend_vs_previous ?? 0;
          const bv = b.trend_vs_previous ?? 0;
          return (av - bv) * dir;
        }
        case 'percentile': {
          const av = a.percentile ?? 0;
          const bv = b.percentile ?? 0;
          return (av - bv) * dir;
        }
        default: {
          const av = a.ranking_in_scope ?? Number.MAX_SAFE_INTEGER;
          const bv = b.ranking_in_scope ?? Number.MAX_SAFE_INTEGER;
          return (av - bv) * dir;
        }
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir, labelByScopeId]);

  const isLarge = sorted.length > LAZY_THRESHOLD;
  const visible = isLarge ? sorted.slice(0, visibleCount) : sorted;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' || key === 'scope' ? 'asc' : 'desc');
    }
  };

  const sortAria = (key: SortKey): 'ascending' | 'descending' | 'none' => {
    if (sortKey !== key) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  };

  const scopePluralKey = `scope.${scopeType}_plural` as const;

  if (!isLoading && sorted.length === 0) {
    return (
      <div
        className={cn(
          'rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center',
          className,
        )}
        role="status"
      >
        <p className="text-[color:var(--color-text-secondary)]">
          {search.trim() ? t('ranking.no_results') : t('page.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {searchable ? (
        <label className="block">
          <span className="sr-only">{t('ranking.search_placeholder')}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(LAZY_PAGE_SIZE);
            }}
            placeholder={t('ranking.search_placeholder')}
            className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] px-3 py-2 text-sm text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
            aria-label={t('ranking.search_placeholder')}
          />
        </label>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)]">
        <table className="w-full border-collapse text-sm" aria-busy={isLoading}>
          <caption className="sr-only">
            {t('page.scope_label')}: {t(scopePluralKey)}
          </caption>
          <thead className="bg-[color:var(--color-surface-raised)] text-[color:var(--color-text-secondary)]">
            <tr>
              <SortableTh
                label={t('ranking.col_rank')}
                ariaSort={sortAria('rank')}
                onClick={() => toggleSort('rank')}
                sortLabel={sortDir === 'asc' ? t('ranking.sort_asc') : t('ranking.sort_desc')}
              />
              <SortableTh
                label={t('ranking.col_scope')}
                ariaSort={sortAria('scope')}
                onClick={() => toggleSort('scope')}
                sortLabel={sortDir === 'asc' ? t('ranking.sort_asc') : t('ranking.sort_desc')}
              />
              <SortableTh
                label={t('ranking.col_value')}
                ariaSort={sortAria('value')}
                onClick={() => toggleSort('value')}
                sortLabel={sortDir === 'asc' ? t('ranking.sort_asc') : t('ranking.sort_desc')}
              />
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t('ranking.col_band')}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t('ranking.col_confidence')}
              </th>
              <SortableTh
                label={t('ranking.col_trend')}
                ariaSort={sortAria('trend')}
                onClick={() => toggleSort('trend')}
                sortLabel={sortDir === 'asc' ? t('ranking.sort_asc') : t('ranking.sort_desc')}
              />
              <SortableTh
                label={t('ranking.col_percentile')}
                ariaSort={sortAria('percentile')}
                onClick={() => toggleSort('percentile')}
                sortLabel={sortDir === 'asc' ? t('ranking.sort_asc') : t('ranking.sort_desc')}
              />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const band = isScoreBand(row.score_band)
                ? row.score_band
                : resolveScoreBand(row.value);
              const trend = isTrendDirection(row.trend_direction) ? row.trend_direction : null;
              return (
                <tr
                  key={`${row.scope_id}-${row.index_code}-${row.period_date}`}
                  className="border-t border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-surface-raised)]"
                  onClick={onSelect ? () => onSelect(row) : undefined}
                  tabIndex={onSelect ? 0 : -1}
                  onKeyDown={
                    onSelect
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelect(row);
                          }
                        }
                      : undefined
                  }
                >
                  <td className="px-3 py-2 font-semibold text-[color:var(--color-text-primary)]">
                    {row.ranking_in_scope ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-[color:var(--color-text-primary)]">
                    {labelByScopeId.get(row.scope_id) ?? row.scope_id}
                  </td>
                  <td className="px-3 py-2 text-[color:var(--color-text-primary)] tabular-nums">
                    {formatValue(row.value)}
                  </td>
                  <td className="px-3 py-2">
                    <LabelPill tone={bandToLabelPillTone(band)} size="sm">
                      {t(`band.${band}`)}
                    </LabelPill>
                  </td>
                  <td className="px-3 py-2 text-[color:var(--color-text-secondary)]">
                    {t(
                      `confidence.${row.confidence as 'high' | 'medium' | 'low' | 'insufficient_data'}`,
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    <span aria-hidden="true">{trendToArrow(trend)}</span>{' '}
                    <span className="sr-only">{trend ? t(`trend.${trend}`) : ''}</span>
                    {formatDelta(row.trend_vs_previous)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[color:var(--color-text-secondary)]">
                    {row.percentile !== null ? `${row.percentile}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isLarge && visibleCount < sorted.length ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + LAZY_PAGE_SIZE)}
            className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] px-4 py-2 text-sm text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
            aria-label={`${sorted.length - visibleCount} más`}
          >
            + {Math.min(LAZY_PAGE_SIZE, sorted.length - visibleCount)}
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface SortableThProps {
  readonly label: string;
  readonly ariaSort: 'ascending' | 'descending' | 'none';
  readonly onClick: () => void;
  readonly sortLabel: string;
}

function SortableTh({ label, ariaSort, onClick, sortLabel }: SortableThProps) {
  return (
    <th scope="col" aria-sort={ariaSort} className="px-3 py-2 text-left font-medium">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-sm"
        aria-label={`${label} — ${sortLabel}`}
      >
        {label}
        <span aria-hidden="true">
          {ariaSort === 'ascending' ? '↑' : ariaSort === 'descending' ? '↓' : '↕'}
        </span>
      </button>
    </th>
  );
}
