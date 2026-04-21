import { normalizeWeightsToPercent, type WeightEntry } from '../lib/methodology-helpers';

export interface WeightsBarChartProps {
  readonly entries: ReadonlyArray<WeightEntry>;
  readonly ariaLabel: string;
  readonly maxEntries?: number;
  readonly className?: string;
}

/**
 * Visualización de pesos como barras horizontales CSS puras.
 * No usa ningún lib de charts. Cada fila es un `div` con width percentual.
 * Accesible via `role="list"` + `aria-label` y labels visibles.
 */
export function WeightsBarChart({
  entries,
  ariaLabel,
  maxEntries = 12,
  className,
}: WeightsBarChartProps) {
  const normalized = normalizeWeightsToPercent(entries);
  const visible = normalized.slice(0, maxEntries);

  if (visible.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label={ariaLabel}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3, 0.75rem)',
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {visible.map((entry) => {
        const pct = Math.max(0, Math.min(100, entry.weight));
        return (
          <li key={entry.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                }}
              >
                {entry.key}
              </span>
              <span
                aria-hidden="true"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {pct.toFixed(1)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
              aria-label={`${entry.key} ${pct.toFixed(1)}%`}
              style={{
                position: 'relative',
                width: '100%',
                height: 8,
                borderRadius: 'var(--radius-pill, 9999px)',
                background: 'var(--color-surface-muted, rgba(0,0,0,0.06))',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${pct}%`,
                  background: 'var(--gradient-p, var(--color-accent-primary))',
                  borderRadius: 'inherit',
                  transition: 'width 280ms var(--ease-dopamine, ease-out)',
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
