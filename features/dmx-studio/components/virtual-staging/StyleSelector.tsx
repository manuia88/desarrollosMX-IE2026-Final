'use client';

// F14.F.7 Sprint 6 BIBLIA v4 §6 UPGRADE 2 — Style selector (5 estilos canon).
// DMX Studio dentro DMX único entorno (ADR-054). Pure UI, no tRPC calls.

import {
  STAGING_STYLES_CANON,
  type StagingStyleCanon,
} from '@/features/dmx-studio/lib/virtual-staging/styles-canon';
import { cn } from '@/shared/ui/primitives/canon';

export interface StyleSelectorProps {
  readonly selectedSlug: string;
  readonly onSelect: (slug: string) => void;
}

const TONE_HINT_BG: Record<StagingStyleCanon['tone'], string> = {
  neutral: 'bg-[color:rgba(240,235,224,0.10)]',
  warm: 'bg-[color:rgba(236,72,153,0.12)]',
  cool: 'bg-[color:rgba(99,102,241,0.12)]',
  gold: 'bg-[color:rgba(217,164,65,0.16)]',
};

const TONE_HINT_DOT: Record<StagingStyleCanon['tone'], string> = {
  neutral: 'bg-[color:var(--canon-cream-2)]',
  warm: 'bg-[color:#ec4899]',
  cool: 'bg-[color:var(--canon-indigo-2)]',
  gold: 'bg-[color:#d9a441]',
};

const TONE_LABEL: Record<StagingStyleCanon['tone'], string> = {
  neutral: 'Neutral',
  warm: 'Cálido',
  cool: 'Frío',
  gold: 'Dorado',
};

export function StyleSelector({ selectedSlug, onSelect }: StyleSelectorProps) {
  return (
    <section aria-label="Selector de estilo de virtual staging" className="w-full">
      <ul
        className={cn('grid gap-3 list-none p-0 m-0', 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5')}
      >
        {STAGING_STYLES_CANON.map((style) => {
          const isSelected = style.slug === selectedSlug;
          return (
            <li key={style.slug}>
              <button
                type="button"
                onClick={() => onSelect(style.slug)}
                aria-pressed={isSelected}
                aria-label={`Seleccionar estilo ${style.name}`}
                className={cn(
                  'w-full text-left p-4 transition-all',
                  'rounded-[var(--canon-radius-card)]',
                  'border-2',
                  'cursor-pointer',
                  'hover:-translate-y-px',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--canon-bg)]',
                  isSelected
                    ? 'border-[color:var(--canon-indigo-2)] bg-[color:rgba(99,102,241,0.12)] shadow-[0_8px_24px_rgba(99,102,241,0.18)]'
                    : 'border-transparent bg-[var(--surface-elevated)] hover:border-[color:rgba(99,102,241,0.30)]',
                )}
              >
                <div
                  className={cn(
                    'h-12 rounded-[10px] flex items-end justify-start p-2 mb-3',
                    TONE_HINT_BG[style.tone],
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      'inline-block h-2.5 w-2.5 rounded-full',
                      TONE_HINT_DOT[style.tone],
                    )}
                  />
                </div>
                <p className="text-[14px] font-bold text-[color:var(--canon-cream)]">
                  {style.name}
                </p>
                <p className="text-[11px] text-[color:var(--canon-cream-2)] mt-1 leading-relaxed">
                  {style.description}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[color:var(--canon-cream-2)] mt-2 opacity-70">
                  {TONE_LABEL[style.tone]}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
