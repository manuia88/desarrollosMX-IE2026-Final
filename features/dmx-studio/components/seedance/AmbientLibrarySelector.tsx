'use client';

// F14.F.7 Sprint 6 BIBLIA v4 §6 — Ambient library selector UI (Upgrade 4 / Tarea 6.4).
// DMX Studio dentro DMX único entorno (ADR-054). Canon: pill buttons, translateY-only hover, zero emoji.

import { type CSSProperties, useCallback } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export interface AmbientLibraryItem {
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly context_tags: readonly string[];
}

export interface AmbientLibrarySelectorProps {
  readonly selectedSlug?: string;
  readonly onSelect: (slug: string) => void;
  readonly ambients: readonly AmbientLibraryItem[];
}

const nameStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '15px',
  color: '#FFFFFF',
  lineHeight: 1.3,
};

const descriptionStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream-2)',
  fontSize: '12.5px',
  lineHeight: 1.45,
};

const tagPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: '9999px',
  background: 'var(--accent-violet-soft)',
  color: 'var(--canon-cream)',
  fontFamily: 'var(--font-body)',
  fontSize: '11px',
  fontWeight: 500,
  lineHeight: 1.4,
  border: '1px solid rgba(168, 85, 247, 0.25)',
};

const cardButtonStyle: CSSProperties = {
  appearance: 'none',
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  display: 'block',
};

export function AmbientLibrarySelector({
  selectedSlug,
  onSelect,
  ambients,
}: AmbientLibrarySelectorProps) {
  const handleSelect = useCallback(
    (slug: string) => () => {
      onSelect(slug);
    },
    [onSelect],
  );

  return (
    <fieldset
      aria-label="Audio ambiente"
      data-testid="ambient-library-selector"
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 border-0 p-0 m-0"
    >
      {ambients.map((ambient) => {
        const isSelected = ambient.slug === selectedSlug;
        const cardStyle: CSSProperties = isSelected
          ? {
              borderColor: 'var(--accent-teal)',
              boxShadow: '0 0 0 2px var(--accent-teal-soft)',
            }
          : {};
        return (
          <button
            key={ambient.slug}
            type="button"
            aria-pressed={isSelected}
            aria-label={`Seleccionar ambiente ${ambient.name}`}
            data-testid={`ambient-library-option-${ambient.slug}`}
            onClick={handleSelect(ambient.slug)}
            style={cardButtonStyle}
          >
            <Card
              variant={isSelected ? 'glow' : 'elevated'}
              hoverable
              className="flex flex-col gap-2 p-4"
              style={cardStyle}
            >
              <p style={nameStyle}>{ambient.name}</p>
              {ambient.description ? <p style={descriptionStyle}>{ambient.description}</p> : null}
              {ambient.context_tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ambient.context_tags.map((tag) => (
                    <span key={tag} style={tagPillStyle}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>
          </button>
        );
      })}
    </fieldset>
  );
}
