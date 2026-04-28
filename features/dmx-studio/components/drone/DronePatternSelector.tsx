'use client';

// F14.F.7 Sprint 6 — Drone pattern selector (4 patterns canon + heat map suggestion banner).

import {
  DRONE_PATTERNS_CANON,
  getPatternBySlug,
} from '@/features/dmx-studio/lib/drone-sim/patterns';

export interface DronePatternSelectorProps {
  readonly selectedSlug: string;
  readonly onSelect: (slug: string) => void;
  readonly suggestion?: { pattern: string; reasoning: string };
}

export function DronePatternSelector({
  selectedSlug,
  onSelect,
  suggestion,
}: DronePatternSelectorProps) {
  const suggested = suggestion ? getPatternBySlug(suggestion.pattern) : null;

  return (
    <section
      aria-label="Selector de patrón de drone"
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      {suggestion && suggested ? (
        <div
          role="note"
          aria-label="Sugerencia de patrón"
          style={{
            background: 'var(--surface-spotlight, rgba(99, 102, 241, 0.10))',
            border: '1px solid var(--accent-violet, #6366F1)',
            borderRadius: 'var(--canon-radius-card, 16px)',
            padding: '12px 16px',
            color: 'var(--canon-cream)',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700 }}>
            Recomendado para tu propiedad: {suggested.name}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--canon-cream-2)', marginTop: '4px' }}>
            {suggestion.reasoning}
          </p>
        </div>
      ) : null}

      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {DRONE_PATTERNS_CANON.map((pattern) => {
          const isSelected = selectedSlug === pattern.slug;
          const isSuggested = suggestion?.pattern === pattern.slug;
          return (
            <li key={pattern.slug}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`Seleccionar patrón ${pattern.name}`}
                onClick={() => onSelect(pattern.slug)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--surface-elevated)',
                  border: isSelected
                    ? '2px solid var(--accent-violet, #6366F1)'
                    : isSuggested
                      ? '2px dashed var(--accent-violet, #6366F1)'
                      : '2px solid transparent',
                  borderRadius: 'var(--canon-radius-card, 16px)',
                  padding: '16px',
                  transition: 'transform 220ms ease, border-color 220ms ease',
                  transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--canon-cream)',
                  }}
                >
                  {pattern.name}
                </p>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--canon-cream-2)',
                    marginTop: '6px',
                    lineHeight: 1.4,
                  }}
                >
                  {pattern.description}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--canon-cream-3, var(--canon-cream-2))',
                    marginTop: '8px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  Duración por defecto: {pattern.defaultDurationSeconds}s
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
