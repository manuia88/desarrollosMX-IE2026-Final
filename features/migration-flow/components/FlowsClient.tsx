'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { cn } from '@/shared/ui/primitives/cn';
import { useFlowMap, useTopFlows } from '../hooks/useMigrationFlow';
import type { MigrationFlowMapPoint, MigrationFlowPublicRow } from '../types';
import { FlowMapbox } from './FlowMapbox';
import { FlowTopTable } from './FlowTopTable';

export interface FlowsClientProps {
  readonly locale: string;
  readonly className?: string;
}

const DECILE_OPTIONS: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function toMapPoints(rows: readonly MigrationFlowPublicRow[]): readonly MigrationFlowMapPoint[] {
  return rows.map((r) => ({
    origin_scope_id: r.origin_scope_id,
    dest_scope_id: r.dest_scope_id,
    origin_centroid: null,
    dest_centroid: null,
    volume: r.volume,
    income_decile_origin: r.income_decile_origin,
    income_decile_dest: r.income_decile_dest,
  }));
}

export function FlowsClient({ className }: FlowsClientProps) {
  const t = useTranslations('MigrationFlow');
  const [decileMin, setDecileMin] = useState<number | null>(null);
  const [decileMax, setDecileMax] = useState<number | null>(null);

  const baseOpts = useMemo(
    () => ({
      ...(decileMin !== null ? { incomeDecileMin: decileMin } : {}),
      ...(decileMax !== null ? { incomeDecileMax: decileMax } : {}),
    }),
    [decileMin, decileMax],
  );

  const topFlows = useTopFlows({ limit: 20, ...baseOpts });
  const flowMap = useFlowMap({ limit: 200, ...baseOpts });

  const rows = topFlows.data ?? [];
  const mapPoints = useMemo(() => toMapPoints(flowMap.data ?? []), [flowMap.data]);

  const isLoading = topFlows.isLoading || flowMap.isLoading;
  const isError = Boolean(topFlows.error) || Boolean(flowMap.error);

  return (
    <div className={cn('space-y-6', className)}>
      <fieldset className="flex flex-wrap items-end gap-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-4">
        <legend className="sr-only">{t('filter_decile_min')}</legend>
        <label className="flex flex-col gap-1 text-xs text-[color:var(--color-text-secondary)]">
          <span>{t('filter_decile_min')}</span>
          <select
            value={decileMin === null ? '' : String(decileMin)}
            onChange={(e) => {
              const v = e.target.value;
              setDecileMin(v === '' ? null : Number(v));
            }}
            className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-sm text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
          >
            <option value="">—</option>
            {DECILE_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[color:var(--color-text-secondary)]">
          <span>{t('filter_decile_max')}</span>
          <select
            value={decileMax === null ? '' : String(decileMax)}
            onChange={(e) => {
              const v = e.target.value;
              setDecileMax(v === '' ? null : Number(v));
            }}
            className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-sm text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
          >
            <option value="">—</option>
            {DECILE_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center text-[color:var(--color-text-secondary)]"
        >
          {t('page.loading')}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center text-[color:var(--color-text-secondary)]"
        >
          {t('page.error')}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <FlowMapbox points={mapPoints} />
          <FlowTopTable rows={rows} />
        </div>
      )}
    </div>
  );
}
