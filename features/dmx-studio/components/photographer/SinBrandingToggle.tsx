'use client';

// F14.F.10 Sprint 9 BIBLIA — SinBrandingToggle (Plan Fotógrafo).
// Default ON: fotógrafo entrega clean video al cliente asesor (reventa permitida).
// Toggle OFF cuando asesor descarga branded version (con SU brand kit).
// ADR-050 canon: pill toggle, gradient-ai en active, motion ≤ 200ms.

import { type CSSProperties, useCallback, useId, useState } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export interface SinBrandingToggleProps {
  readonly initialEnabled?: boolean;
  readonly onChange?: (enabled: boolean) => void;
  readonly disabled?: boolean;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '20px 22px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--canon-cream)',
};

const descriptionStyle: CSSProperties = {
  fontSize: '13px',
  color: 'var(--canon-cream-2)',
  lineHeight: 1.55,
};

const switchTrackBase: CSSProperties = {
  position: 'relative',
  width: '52px',
  height: '28px',
  borderRadius: '9999px',
  cursor: 'pointer',
  transition: 'background 220ms ease',
  border: '1px solid transparent',
  flexShrink: 0,
};

const switchKnobBase: CSSProperties = {
  position: 'absolute',
  top: '3px',
  width: '20px',
  height: '20px',
  background: '#FFFFFF',
  borderRadius: '9999px',
  transition: 'left 220ms ease',
  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
};

const noticeStyle: CSSProperties = {
  marginTop: '8px',
  padding: '10px 12px',
  background: 'rgba(99, 102, 241, 0.08)',
  border: '1px solid rgba(99, 102, 241, 0.22)',
  borderRadius: '10px',
  fontSize: '12.5px',
  color: 'var(--canon-cream-2)',
  lineHeight: 1.5,
};

export function SinBrandingToggle({
  initialEnabled = true,
  onChange,
  disabled = false,
}: SinBrandingToggleProps) {
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const switchId = useId();
  const descriptionId = useId();

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const next = !enabled;
    setEnabled(next);
    if (onChange) onChange(next);
  }, [enabled, onChange, disabled]);

  const handleKey = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle, disabled],
  );

  const trackStyle: CSSProperties = {
    ...switchTrackBase,
    background: enabled ? 'linear-gradient(90deg, #6366F1, #EC4899)' : 'rgba(255, 255, 255, 0.10)',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  const knobStyle: CSSProperties = {
    ...switchKnobBase,
    left: enabled ? '28px' : '4px',
  };

  return (
    <Card variant="elevated" style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span id={switchId} style={titleStyle}>
            Entregar sin branding al cliente
          </span>
          <span id={descriptionId} style={descriptionStyle}>
            Tus videos llegan limpios al asesor (sin DMX y sin tu logo). Él aplica su propia marca
            cuando descarga la versión final.
          </span>
        </div>
        <div
          role="switch"
          tabIndex={disabled ? -1 : 0}
          aria-checked={enabled}
          aria-labelledby={switchId}
          aria-describedby={descriptionId}
          aria-disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKey}
          style={trackStyle}
        >
          <span aria-hidden="true" style={knobStyle} />
        </div>
      </div>

      <div style={noticeStyle}>
        {enabled
          ? 'Activado (recomendado): el asesor recibe video limpio y aplica su propio kit de marca.'
          : 'Desactivado: el asesor descarga la versión con tu marca aplicada (no recomendado para reventa).'}
      </div>
    </Card>
  );
}
