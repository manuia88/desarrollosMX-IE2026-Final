'use client';

// BLOQUE 11.R.3.4 (U5) — edge weight sliders customizables.
// 4 sliders (migration/climate_twin/genoma_similarity/pulse_correlation)
// con suma obligatoria 1.0. Recompute client-side — no re-query engine.

import { useTranslations } from 'next-intl';
import type { EdgeType } from '@/features/constellations/types';
import { EDGE_TYPE_DEFAULT_WEIGHTS, EDGE_TYPES } from '@/features/constellations/types';

interface EdgeWeightSlidersProps {
  readonly weights: Record<EdgeType, number>;
  readonly onChange: (next: Record<EdgeType, number>) => void;
  readonly onReset: () => void;
}

export function EdgeWeightSliders({ weights, onChange, onReset }: EdgeWeightSlidersProps) {
  const t = useTranslations('Constellations.sliders');
  const tTypes = useTranslations('Constellations.edge_types');

  const sum = EDGE_TYPES.reduce((acc, k) => acc + weights[k], 0);
  const sumOk = Math.abs(sum - 1) < 0.01;

  return (
    <section className="space-y-3 rounded-lg border border-[color:var(--color-border)] p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('title')}</h3>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-[color:var(--color-accent)] hover:underline"
        >
          {t('reset')}
        </button>
      </header>
      <p className="text-xs text-[color:var(--color-text-secondary)]">{t('help')}</p>
      <div className="space-y-2">
        {EDGE_TYPES.map((edgeType) => (
          <div key={edgeType} className="space-y-1">
            <label
              className="flex items-center justify-between text-xs"
              htmlFor={`slider-${edgeType}`}
            >
              <span>{tTypes(edgeType)}</span>
              <span className="font-semibold tabular-nums">
                {(weights[edgeType] * 100).toFixed(0)}%
              </span>
            </label>
            <input
              id={`slider-${edgeType}`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(weights[edgeType] * 100)}
              onChange={(e) => {
                const nextPct = Number.parseInt(e.target.value, 10);
                const next = { ...weights, [edgeType]: nextPct / 100 } as Record<EdgeType, number>;
                onChange(next);
              }}
              className="w-full"
            />
          </div>
        ))}
      </div>
      <p
        className={`text-xs ${sumOk ? 'text-[color:var(--color-text-secondary)]' : 'text-[color:var(--color-warning)]'}`}
      >
        {t('sum_label', { sum: (sum * 100).toFixed(0) })}
      </p>
    </section>
  );
}

export function defaultEdgeWeights(): Record<EdgeType, number> {
  return {
    migration: EDGE_TYPE_DEFAULT_WEIGHTS.migration,
    climate_twin: EDGE_TYPE_DEFAULT_WEIGHTS.climate_twin,
    genoma_similarity: EDGE_TYPE_DEFAULT_WEIGHTS.genoma_similarity,
    pulse_correlation: EDGE_TYPE_DEFAULT_WEIGHTS.pulse_correlation,
  };
}

export default EdgeWeightSliders;
