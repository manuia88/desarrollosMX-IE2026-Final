'use client';

// F14.F.9 Sprint 8 BIBLIA Upgrade 1 — Auto-progress toggle.
// Disclosure flag canon ADR-018: feature condicionada a desarrollo asociado.
import { type CSSProperties, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

export interface AutoProgressToggleProps {
  readonly seriesId: string;
  readonly hasDesarrolloAssociated: boolean;
  readonly initialEnabled: boolean;
}

const wrapperStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  padding: 16,
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 16,
  color: '#FFFFFF',
};

const helpStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: 13,
  marginTop: 4,
};

export function AutoProgressToggle(props: AutoProgressToggleProps) {
  const [enabled, setEnabled] = useState(props.initialEnabled);
  const mutation = trpc.studio.sprint8Series.enableAutoProgress.useMutation();

  if (!props.hasDesarrolloAssociated) {
    return (
      <div style={wrapperStyle}>
        <div style={titleStyle}>Generación automática</div>
        <div style={helpStyle}>
          Asocia un desarrollo M02 a esta serie para activar generación automática cuando la obra
          avance.
        </div>
      </div>
    );
  }

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      await mutation.mutateAsync({ seriesId: props.seriesId, enabled: next });
    } catch {
      setEnabled(!next);
    }
  };

  return (
    <div style={wrapperStyle}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          aria-label="Activar generación automática de episodios"
        />
        <div>
          <div style={titleStyle}>Generación automática</div>
          <div style={helpStyle}>
            Genera el próximo episodio cuando la obra avance fase. Datos vía cross-feature M02
            (placeholder hasta tracking de obra real).
          </div>
        </div>
      </label>
    </div>
  );
}
