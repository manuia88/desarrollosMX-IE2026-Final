'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { IndexBadge } from '@/features/indices-publicos/components/IndexBadge';
import { useIndexDetail } from '@/features/indices-publicos/hooks/useIndexRanking';
import { resolveScoreBand } from '@/features/indices-publicos/lib/index-registry-helpers';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import { INDEX_CODES, type IndexCode } from '@/shared/types/scores';
import { cn } from '@/shared/ui/primitives/cn';
import type { WidgetCustomization, WidgetScopeType } from '../types';
import { WidgetShell } from './WidgetShell';

export interface WidgetScoreCardProps {
  readonly scopeType: WidgetScopeType;
  readonly scopeId: string;
  readonly customization?: WidgetCustomization | undefined;
  readonly ctaUrl: string;
  readonly className?: string;
}

interface IndexRowValue {
  readonly code: IndexCode;
  readonly value: number | null;
  readonly confidence: string | null;
  readonly isLoading: boolean;
}

function IndexRow({ row }: { row: IndexRowValue }) {
  const t = useTranslations('IndicesPublic');
  const band = row.value !== null ? resolveScoreBand(row.value) : null;

  return (
    <li
      aria-label={`${row.code}: ${row.value !== null ? row.value.toFixed(1) : '—'}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '72px 1fr 56px',
        gap: 'var(--space-2, 0.5rem)',
        alignItems: 'center',
        padding: 'var(--space-1, 0.25rem) 0',
        borderBottom: '1px solid var(--color-border-subtle, rgba(0,0,0,0.05))',
        fontSize: 'var(--text-xs, 0.75rem)',
      }}
    >
      <IndexBadge code={row.code} size="sm" />
      <span
        style={{
          color: 'var(--color-text-secondary, #475569)',
          fontSize: 'var(--text-xs, 0.75rem)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {band ? t(`band.${band}`) : row.isLoading ? t('page.loading') : '—'}
      </span>
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 'var(--font-weight-semibold, 600)',
          textAlign: 'right',
          color: 'var(--color-text-primary, #0f172a)',
        }}
      >
        {row.value !== null ? row.value.toFixed(1) : '—'}
      </span>
    </li>
  );
}

export function WidgetScoreCard({
  scopeType,
  scopeId,
  customization,
  ctaUrl,
  className,
}: WidgetScoreCardProps) {
  const t = useTranslations('WidgetEmbed');
  const zoneLabel = useMemo(
    () => resolveZoneLabelSync({ scopeType, scopeId }),
    [scopeType, scopeId],
  );

  const ariaLabel = t('score.aria_label', { zone: zoneLabel });

  return (
    <WidgetShell
      customization={customization}
      ctaUrl={ctaUrl}
      ctaLabel={t('common.cta_view_full')}
      poweredByLabel={t('common.powered_by')}
      ariaLabel={ariaLabel}
      className={cn('dmx-widget-score', className)}
    >
      <header style={{ marginBottom: 'var(--space-2, 0.5rem)' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--text-base, 1rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary, #0f172a)',
          }}
        >
          {t('score.heading')}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-xs, 0.75rem)',
            color: 'var(--color-text-secondary, #475569)',
          }}
        >
          {zoneLabel}
        </p>
      </header>
      <ul
        aria-label={t('score.list_label')}
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {INDEX_CODES.map((code) => (
          <IndexRowQuery key={code} indexCode={code} scopeType={scopeType} scopeId={scopeId} />
        ))}
      </ul>
    </WidgetShell>
  );
}

function IndexRowQuery({
  indexCode,
  scopeType,
  scopeId,
}: {
  readonly indexCode: IndexCode;
  readonly scopeType: WidgetScopeType;
  readonly scopeId: string;
}) {
  const query = useIndexDetail({
    indexCode,
    scopeType,
    scopeId,
  });
  const data = query.data ?? null;
  const row: IndexRowValue = {
    code: indexCode,
    value: data?.value ?? null,
    confidence: data?.confidence ?? null,
    isLoading: query.isLoading,
  };
  return <IndexRow row={row} />;
}
