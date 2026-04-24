'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ScopeType } from '@/shared/types/scores';
import { cn } from '@/shared/ui/primitives/cn';
import { useIndexMovers } from '../hooks/useIndexRanking';
import { MapboxChoropleth } from './MapboxChoropleth';

export interface MoversClientProps {
  readonly scopeType?: ScopeType;
  readonly limit?: number;
  readonly className?: string;
}

export function MoversClient({ scopeType = 'colonia', limit = 8, className }: MoversClientProps) {
  const t = useTranslations('IndicesPublic');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const movers = useIndexMovers({ direction, scopeType, limit });
  const rows = movers.data ?? [];

  return (
    <div className={cn('space-y-6', className)}>
      <div
        role="tablist"
        aria-label={t('movers.direction_toggle')}
        className="inline-flex rounded-[var(--radius-pill)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={direction === 'up'}
          onClick={() => setDirection('up')}
          className={cn(
            'rounded-[var(--radius-pill)] px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
            direction === 'up'
              ? 'bg-[var(--color-brand-primary)] text-[color:var(--color-text-inverse)]'
              : 'text-[color:var(--color-text-primary)]',
          )}
        >
          {t('movers.up')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={direction === 'down'}
          onClick={() => setDirection('down')}
          className={cn(
            'rounded-[var(--radius-pill)] px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
            direction === 'down'
              ? 'bg-[var(--color-brand-primary)] text-[color:var(--color-text-inverse)]'
              : 'text-[color:var(--color-text-primary)]',
          )}
        >
          {t('movers.down')}
        </button>
      </div>

      {movers.isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center text-[color:var(--color-text-secondary)]"
        >
          {t('page.loading')}
        </div>
      ) : (
        <MapboxChoropleth
          rows={rows.map((r) => ({
            scope_id: r.scope_id,
            value: r.value,
            score_band: r.score_band,
            ranking_in_scope: r.ranking_in_scope,
          }))}
          scopeType={scopeType}
        />
      )}
    </div>
  );
}
