'use client';

// TODO install mapbox-gl — fallback grid until BLOQUE 11.D.post-install
// No importar 'mapbox-gl' aquí: la librería no está en package.json todavía.
// Este componente renderiza un grid ranked accesible que sustituye al mapa
// choropleth mientras el stack Mapbox no está instalado.

import { useTranslations } from 'next-intl';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { LabelPill } from '@/shared/ui/dopamine/label-pill';
import { cn } from '@/shared/ui/primitives/cn';
import {
  bandToLabelPillTone,
  resolveScoreBand,
  type ScopeType,
  type ScoreBand,
} from '../lib/index-registry-helpers';

export interface ChoroplethRow {
  readonly scope_id: string;
  readonly value: number;
  readonly score_band: string | null;
  readonly ranking_in_scope: number | null;
}

export interface MapboxChoroplethProps {
  readonly rows: readonly ChoroplethRow[];
  readonly scopeType: ScopeType;
  readonly className?: string;
}

function isScoreBand(value: string | null): value is ScoreBand {
  return value === 'excelente' || value === 'bueno' || value === 'regular' || value === 'bajo';
}

export function MapboxChoropleth({ rows, scopeType, className }: MapboxChoroplethProps) {
  const t = useTranslations('IndicesPublic');

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          'rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center',
          className,
        )}
        role="status"
      >
        <p className="text-[color:var(--color-text-secondary)]">{t('page.empty')}</p>
      </div>
    );
  }

  return (
    <section
      className={cn('space-y-3', className)}
      aria-label={`${t('page.scope_label')}: ${t(`scope.${scopeType}_plural`)}`}
    >
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
      >
        {rows.map((row) => {
          const band = isScoreBand(row.score_band) ? row.score_band : resolveScoreBand(row.value);
          return (
            <Card3D
              key={row.scope_id}
              className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[color:var(--color-text-secondary)] tabular-nums">
                  #{row.ranking_in_scope ?? '—'}
                </span>
                <LabelPill tone={bandToLabelPillTone(band)} size="sm">
                  {t(`band.${band}`)}
                </LabelPill>
              </div>
              <div className="mt-2 text-sm font-semibold text-[color:var(--color-text-primary)] truncate">
                {row.scope_id}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--color-text-primary)]">
                {row.value.toFixed(1)}
              </div>
            </Card3D>
          );
        })}
      </div>
    </section>
  );
}
