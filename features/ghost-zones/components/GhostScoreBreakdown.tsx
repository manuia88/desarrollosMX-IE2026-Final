'use client';

// BLOQUE 11.Q.3.4 (U1) — breakdown transparente search/press/dmx_gap.
// Barras inline 3 componentes visibles por fila de ranking.

import { useTranslations } from 'next-intl';
import type { GhostScoreBreakdown as Breakdown } from '@/features/ghost-zones/types';

interface GhostScoreBreakdownProps {
  readonly breakdown: Breakdown;
}

const COMPONENTS: readonly { readonly key: keyof Breakdown; readonly label: string }[] = [
  { key: 'search_component', label: 'search' },
  { key: 'press_component', label: 'press' },
  { key: 'dmx_gap_component', label: 'dmx_gap' },
];

export function GhostScoreBreakdownView({ breakdown }: GhostScoreBreakdownProps) {
  const t = useTranslations('GhostZones.breakdown');
  return (
    <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
      {COMPONENTS.map(({ key, label }) => {
        const value = breakdown[key];
        const pct = Math.max(0, Math.min(100, value));
        return (
          <div key={key} className="space-y-1">
            <dt className="text-[color:var(--color-text-secondary)]">{t(label)}</dt>
            <dd className="flex items-center gap-2">
              <div
                className="h-1 w-full overflow-hidden rounded bg-[color:var(--color-surface-subtle)]"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-[color:var(--color-accent)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-semibold tabular-nums">{pct.toFixed(0)}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export default GhostScoreBreakdownView;
