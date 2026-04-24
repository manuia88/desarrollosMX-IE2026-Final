'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { INDEX_CODES, type IndexCode, type ScopeType } from '@/shared/types/scores';
import { cn } from '@/shared/ui/primitives/cn';
import { useIndexRanking } from '../hooks/useIndexRanking';
import { INDEX_REGISTRY } from '../lib/index-registry-helpers';
import { IndexBadge } from './IndexBadge';
import { RankingTable } from './RankingTable';

export interface IndicesTabsProps {
  readonly initialCode?: IndexCode;
  readonly scopeType?: ScopeType;
  readonly locale: string;
  readonly className?: string;
}

export function IndicesTabs({
  initialCode = 'IPV',
  scopeType = 'colonia',
  locale,
  className,
}: IndicesTabsProps) {
  const t = useTranslations('IndicesPublic');
  const [active, setActive] = useState<IndexCode>(initialCode);
  const ranking = useIndexRanking({ indexCode: active, scopeType });

  const rows = ranking.data ?? [];
  const firstRow = rows[0];
  const lastUpdate = firstRow?.period_date;

  return (
    <div className={cn('space-y-6', className)}>
      <nav aria-label={t('page.title')} className="flex flex-wrap gap-2">
        {INDEX_CODES.map((code) => {
          const def = INDEX_REGISTRY[code];
          const isActive = code === active;
          return (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${code}`}
              id={`tab-${code}`}
              onClick={() => setActive(code)}
              className={cn(
                'rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                isActive
                  ? 'border-transparent bg-[var(--color-brand-primary)] text-[color:var(--color-text-inverse)]'
                  : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-elevated)]',
              )}
              data-tone={def.tone}
            >
              {code}
            </button>
          );
        })}
      </nav>

      <section
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="space-y-4"
      >
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IndexBadge code={active} size="lg" />
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--color-text-primary)]">
                {t(`indices.${active}.name`)}
              </h2>
              <p className="text-sm text-[color:var(--color-text-secondary)]">
                {t(`indices.${active}.tagline`)}
              </p>
            </div>
          </div>
          {lastUpdate ? (
            <p className="text-xs text-[color:var(--color-text-secondary)]">
              {t('page.last_update', { date: lastUpdate })}
            </p>
          ) : null}
        </header>

        {ranking.isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center text-[color:var(--color-text-secondary)]"
          >
            {t('page.loading')}
          </div>
        ) : (
          <RankingTable
            rows={rows}
            scopeType={scopeType}
            onSelect={(row) => {
              if (typeof window !== 'undefined') {
                window.location.href = `/${locale}/indices/${active}?scope_id=${encodeURIComponent(row.scope_id)}`;
              }
            }}
          />
        )}
      </section>
    </div>
  );
}
