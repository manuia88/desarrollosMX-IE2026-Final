'use client';

// F14.F.9 Sprint 8 BIBLIA Tarea 8.4 — Template selector grid.
import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

export interface TemplateSelectorProps {
  readonly category?: 'residencial' | 'comercial' | 'mixto' | 'custom';
  readonly selectedId: string | null;
  readonly onSelect: (templateId: string | null) => void;
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 16,
};

const cardStyle = (selected: boolean): CSSProperties => ({
  background: 'var(--surface-recessed)',
  border: selected ? '2px solid #818CF8' : '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  padding: 16,
  textAlign: 'left',
  width: '100%',
  cursor: 'pointer',
  transition: 'transform 220ms ease, border-color 220ms ease',
});

export function TemplateSelector({ category, selectedId, onSelect }: TemplateSelectorProps) {
  const args = category ? { category } : {};
  const list = trpc.studio.sprint8Series.listTemplates.useQuery(args);
  const templates = list.data?.templates ?? [];

  if (list.isLoading) {
    return <div style={{ color: 'var(--canon-cream-2)' }}>Cargando templates...</div>;
  }

  return (
    <fieldset
      style={{ ...gridStyle, border: 'none', padding: 0, margin: 0 }}
      aria-label="Templates desarrolladora"
    >
      <button
        type="button"
        aria-pressed={selectedId === null}
        style={cardStyle(selectedId === null)}
        onClick={() => onSelect(null)}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 16,
            color: '#FFFFFF',
          }}
        >
          Custom
        </div>
        <div style={{ color: 'var(--canon-cream-2)', fontSize: 13, marginTop: 4 }}>
          Crea tu propio arco narrativo (Claude lo asistirá).
        </div>
      </button>
      {templates.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          aria-pressed={selectedId === tpl.id}
          style={cardStyle(selectedId === tpl.id)}
          onClick={() => onSelect(tpl.id)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 16,
                color: '#FFFFFF',
              }}
            >
              {tpl.name}
            </span>
            <span
              style={{
                background: 'rgba(99,102,241,0.18)',
                color: '#818CF8',
                padding: '2px 8px',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {tpl.category}
            </span>
          </div>
          <div style={{ color: 'var(--canon-cream-2)', fontSize: 12, marginTop: 8 }}>
            {tpl.defaultTotalEpisodes} episodios · {tpl.musicThemeMood ?? 'sin tema'}
          </div>
          {tpl.description ? (
            <div style={{ color: 'var(--canon-cream-2)', fontSize: 12, marginTop: 6 }}>
              {tpl.description}
            </div>
          ) : null}
        </button>
      ))}
    </fieldset>
  );
}
