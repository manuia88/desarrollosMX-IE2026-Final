'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import { cn } from '@/shared/ui/primitives/cn';
import type { MigrationFlowPublicRow } from '../types';

export interface FlowTopTableProps {
  readonly rows: readonly MigrationFlowPublicRow[];
  readonly className?: string;
}

export function FlowTopTable({ rows, className }: FlowTopTableProps) {
  const t = useTranslations('MigrationFlow');

  const totalVolume = useMemo(() => rows.reduce((acc, r) => acc + r.volume, 0), [rows]);

  if (rows.length === 0) {
    return (
      <div
        role="status"
        className={cn(
          'rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-8 text-center',
          className,
        )}
      >
        <p className="text-[color:var(--color-text-secondary)]">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)]',
        className,
      )}
    >
      <table className="w-full text-sm" aria-label={t('aria_table')}>
        <caption className="px-4 pt-4 text-left text-sm font-semibold text-[color:var(--color-text-primary)]">
          {t('table_title')}
        </caption>
        <thead>
          <tr className="border-b border-[color:var(--color-border-subtle)] text-xs uppercase text-[color:var(--color-text-secondary)]">
            <th scope="col" className="px-4 py-2 text-left">
              {t('table_rank')}
            </th>
            <th scope="col" className="px-4 py-2 text-left">
              {t('table_origin')}
            </th>
            <th scope="col" className="px-4 py-2 text-left">
              {t('table_destination')}
            </th>
            <th scope="col" className="px-4 py-2 text-right">
              {t('table_volume')}
            </th>
            <th scope="col" className="px-4 py-2 text-right">
              {t('table_pct')}
            </th>
            <th scope="col" className="px-4 py-2 text-right">
              {t('table_decile')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const pct = totalVolume > 0 ? (row.volume / totalVolume) * 100 : 0;
            const decile = row.income_decile_dest ?? row.income_decile_origin;
            const rowKey = `${row.origin_scope_type}:${row.origin_scope_id}->${row.dest_scope_type}:${row.dest_scope_id}@${row.period_date}`;
            const originLabel = resolveZoneLabelSync({
              scopeType: row.origin_scope_type,
              scopeId: row.origin_scope_id,
            });
            const destLabel = resolveZoneLabelSync({
              scopeType: row.dest_scope_type,
              scopeId: row.dest_scope_id,
            });
            return (
              <tr
                key={rowKey}
                className="border-b border-[color:var(--color-border-subtle)] last:border-b-0 hover:bg-[color:var(--color-surface-elevated)]"
              >
                <td className="px-4 py-2 tabular-nums text-[color:var(--color-text-secondary)]">
                  {`#${index + 1}`}
                </td>
                <td className="px-4 py-2 text-[color:var(--color-text-primary)]">
                  <span className="block truncate font-medium" title={originLabel}>
                    {originLabel}
                  </span>
                  <span className="block text-xs text-[color:var(--color-text-secondary)]">
                    {row.origin_scope_type}
                  </span>
                </td>
                <td className="px-4 py-2 text-[color:var(--color-text-primary)]">
                  <span className="block truncate font-medium" title={destLabel}>
                    {destLabel}
                  </span>
                  <span className="block text-xs text-[color:var(--color-text-secondary)]">
                    {row.dest_scope_type}
                  </span>
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[color:var(--color-text-primary)]">
                  {row.volume.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[color:var(--color-text-secondary)]">
                  {pct.toFixed(1)}%
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[color:var(--color-text-secondary)]">
                  {decile ?? t('table_decile_unclassified')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
