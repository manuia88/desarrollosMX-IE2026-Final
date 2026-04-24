'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  type BloombergColumn,
  BloombergTable,
} from '@/features/indices-publicos/components/BloombergTable';
import { IndexBadge } from '@/features/indices-publicos/components/IndexBadge';
import { exportToCSV } from '@/features/indices-publicos/lib/csv-export';
import {
  COUNTRY_CODES,
  type CountryCode,
  type ScoreBand,
} from '@/features/indices-publicos/lib/index-registry-helpers';
import { trpc } from '@/shared/lib/trpc/client';
import { INDEX_CODES, type IndexCode, SCOPE_TYPES, type ScopeType } from '@/shared/types/scores';

interface RankingRow {
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

export function ProTerminal() {
  const t = useTranslations('IndicesPublic');
  const [indexCode, setIndexCode] = useState<IndexCode>('IPV');
  const [scopeType, setScopeType] = useState<ScopeType>('colonia');
  const [countryCode, setCountryCode] = useState<CountryCode>('MX');

  const query = trpc.indicesPublic.getRanking.useQuery({
    indexCode,
    scopeType,
    countryCode,
    periodType: 'monthly',
    limit: 200,
  });

  const rows = useMemo<ReadonlyArray<RankingRow>>(() => {
    const data = query.data;
    return Array.isArray(data) ? (data as ReadonlyArray<RankingRow>) : [];
  }, [query.data]);

  const columns = useMemo<ReadonlyArray<BloombergColumn<RankingRow>>>(
    () => [
      {
        key: 'rank',
        label: t('ranking.col_rank'),
        align: 'right',
        accessor: (row) => row.ranking_in_scope,
      },
      {
        key: 'scope',
        label: t('ranking.col_scope'),
        accessor: (row) => row.scope_id,
      },
      {
        key: 'index',
        label: 'CODE',
        accessor: (row) => row.index_code,
        render: (row) => <IndexBadge code={row.index_code as IndexCode} size="sm" />,
        sortable: false,
      },
      {
        key: 'value',
        label: t('ranking.col_value'),
        align: 'right',
        accessor: (row) => row.value,
        render: (row) => row.value.toFixed(2),
      },
      {
        key: 'band',
        label: t('ranking.col_band'),
        accessor: (row) => row.score_band,
        render: (row) => (row.score_band ? t(`band.${row.score_band as ScoreBand}`) : '—'),
      },
      {
        key: 'confidence',
        label: t('ranking.col_confidence'),
        accessor: (row) => row.confidence,
        render: (row) =>
          t(`confidence.${row.confidence as 'high' | 'medium' | 'low' | 'insufficient_data'}`),
      },
      {
        key: 'trend',
        label: t('ranking.col_trend'),
        align: 'right',
        accessor: (row) => row.trend_vs_previous,
        render: (row) =>
          row.trend_vs_previous === null
            ? '—'
            : `${row.trend_vs_previous > 0 ? '+' : ''}${row.trend_vs_previous.toFixed(2)}`,
      },
      {
        key: 'percentile',
        label: t('ranking.col_percentile'),
        align: 'right',
        accessor: (row) => row.percentile,
        render: (row) => (row.percentile === null ? '—' : row.percentile.toFixed(1)),
      },
    ],
    [t],
  );

  const handleExportCsv = () => {
    const exportRows = rows.map((row) => ({
      rank: row.ranking_in_scope ?? '',
      scope_id: row.scope_id,
      index_code: row.index_code,
      value: row.value.toFixed(4),
      score_band: row.score_band ?? '',
      confidence: row.confidence,
      trend_vs_previous: row.trend_vs_previous ?? '',
      percentile: row.percentile ?? '',
      period_date: row.period_date,
      methodology_version: row.methodology_version,
    }));
    exportToCSV(
      exportRows,
      [
        'rank',
        'scope_id',
        'index_code',
        'value',
        'score_band',
        'confidence',
        'trend_vs_previous',
        'percentile',
        'period_date',
        'methodology_version',
      ],
      `dmx-pro-${indexCode}-${scopeType}-${countryCode}`,
    );
  };

  const handleReset = () => {
    setIndexCode('IPV');
    setScopeType('colonia');
    setCountryCode('MX');
  };

  const selectStyle: React.CSSProperties = {
    background: 'var(--color-surface-sunken)',
    borderColor: 'var(--color-border-subtle)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('pro.filter_index')}</span>
          <select
            value={indexCode}
            onChange={(event) => setIndexCode(event.target.value as IndexCode)}
            className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm"
            style={selectStyle}
          >
            {INDEX_CODES.map((code) => (
              <option key={code} value={code}>
                {code} — {t(`indices.${code}.short`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('pro.filter_scope')}</span>
          <select
            value={scopeType}
            onChange={(event) => setScopeType(event.target.value as ScopeType)}
            className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm"
            style={selectStyle}
          >
            {SCOPE_TYPES.map((scope) => (
              <option key={scope} value={scope}>
                {t(`scope.${scope}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('pro.filter_country')}</span>
          <select
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value as CountryCode)}
            className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm"
            style={selectStyle}
          >
            {COUNTRY_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs"
            style={selectStyle}
          >
            {t('pro.reset_filters')}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={rows.length === 0}
            className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            style={{
              background: 'var(--gradient-p)',
              color: 'var(--color-text-inverse)',
            }}
          >
            {t('pro.export_csv')}
          </button>
        </div>
      </div>
      <BloombergTable
        rows={rows}
        columns={columns}
        rowKey={(row) => `${row.scope_id}-${row.index_code}-${row.period_date}`}
        searchPlaceholder={t('ranking.search_placeholder')}
        noResultsLabel={query.isLoading ? t('page.loading') : t('ranking.no_results')}
        caption={t('pro.title')}
      />
    </section>
  );
}
