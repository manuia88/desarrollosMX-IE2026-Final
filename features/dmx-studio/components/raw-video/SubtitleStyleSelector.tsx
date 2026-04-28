'use client';

// F14.F.6 Sprint 5 BIBLIA UPGRADE 4 — Subtitle style selector (5 estilos canon).

import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';

export interface SubtitleStyleSelectorProps {
  readonly rawVideoId: string;
}

export function SubtitleStyleSelector({ rawVideoId }: SubtitleStyleSelectorProps) {
  const stylesQuery = trpc.studio.subtitles.getStyles.useQuery();
  const applyMutation = trpc.studio.subtitles.applyStyle.useMutation();
  const [selected, setSelected] = useState<string | null>(null);

  if (stylesQuery.isLoading) return <div role="status">Cargando estilos...</div>;
  if (stylesQuery.error) {
    return (
      <div role="alert" style={{ color: 'var(--canon-red)' }}>
        {stylesQuery.error.message}
      </div>
    );
  }

  const styles = stylesQuery.data ?? [];

  return (
    <section aria-label="Selector de estilo de subtítulos" style={{ marginTop: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--canon-cream)' }}>
        Estilo de subtítulos
      </h2>
      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          listStyle: 'none',
          padding: 0,
          marginTop: '12px',
        }}
      >
        {styles.map((style) => (
          <li key={style.key}>
            <button
              type="button"
              onClick={() => setSelected(style.key)}
              style={{
                display: 'block',
                width: '100%',
                background:
                  selected === style.key ? 'rgba(99, 102, 241, 0.15)' : 'var(--surface-elevated)',
                border:
                  selected === style.key
                    ? '2px solid var(--accent-violet)'
                    : '2px solid transparent',
                borderRadius: 'var(--canon-radius-card)',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              aria-label={`Seleccionar estilo ${style.label}`}
            >
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--canon-cream)',
                }}
              >
                {style.label}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--canon-cream-2)', marginTop: '4px' }}>
                {style.description}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '16px', textAlign: 'right' }}>
        <Button
          variant="primary"
          size="md"
          disabled={!selected || applyMutation.isPending}
          onClick={() => {
            if (selected) {
              applyMutation.mutate({
                rawVideoId,
                styleKey: selected as 'cinematic' | 'bold' | 'minimal' | 'quote' | 'yellow_hot',
              });
            }
          }}
        >
          {applyMutation.isPending ? 'Aplicando...' : 'Aplicar estilo'}
        </Button>
      </div>
    </section>
  );
}
