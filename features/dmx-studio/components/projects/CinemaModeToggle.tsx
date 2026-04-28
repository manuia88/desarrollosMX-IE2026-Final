'use client';

// F14.F.7 Sprint 6 Tarea 6.5 — Cinema Mode toggle with featured pill list.
// Big prominent switch + 5 features visible (drone reveal, seedance ambient,
// branded overlay, multi-format, beat-sync). Glow when enabled.

import type { CSSProperties, KeyboardEvent } from 'react';
import { useCallback, useId } from 'react';

export interface CinemaModeToggleProps {
  readonly enabled: boolean;
  readonly onToggle: (v: boolean) => void;
  readonly disabled?: boolean;
}

interface FeaturePill {
  readonly key: string;
  readonly label: string;
}

const FEATURES: ReadonlyArray<FeaturePill> = [
  { key: 'drone_reveal', label: 'Drone reveal' },
  { key: 'seedance_ambient', label: 'Seedance ambient' },
  { key: 'branded_overlay', label: 'Branded overlay' },
  { key: 'multi_format', label: 'Multi-formato' },
  { key: 'beat_sync', label: 'Beat-sync' },
];

function cardStyle(enabled: boolean, disabled: boolean): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '20px 22px',
    borderRadius: 'var(--canon-radius-card)',
    background: enabled ? 'var(--surface-elevated)' : 'var(--surface-recessed)',
    border: `1px solid ${enabled ? 'rgba(168, 85, 247, 0.45)' : 'var(--canon-border)'}`,
    boxShadow: enabled ? 'var(--shadow-canon-spotlight)' : 'var(--shadow-canon-rest)',
    opacity: disabled ? 0.55 : 1,
    transition:
      'background var(--canon-duration-fast) ease, border-color var(--canon-duration-fast) ease, box-shadow var(--canon-duration-fast) ease, transform var(--canon-duration-fast) ease',
  };
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
};

const titleBlockStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-heading, var(--font-body))',
  fontSize: '18px',
  fontWeight: 700,
  color: 'var(--canon-cream)',
  letterSpacing: '-0.01em',
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-body)',
  fontSize: '12.5px',
  fontWeight: 400,
  color: 'var(--canon-cream-2)',
};

function bigSwitchStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    position: 'relative',
    width: '60px',
    height: '32px',
    borderRadius: 'var(--canon-radius-pill)',
    background: active ? 'var(--gradient-ai)' : 'var(--surface-recessed)',
    border: `1px solid ${active ? 'rgba(168,85,247,0.55)' : 'var(--canon-border-2)'}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    flexShrink: 0,
    transition:
      'background var(--canon-duration-fast) ease, border-color var(--canon-duration-fast) ease',
  };
}

function bigThumbStyle(active: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: '3px',
    left: active ? '31px' : '3px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#FFFFFF',
    boxShadow: 'var(--shadow-canon-rest)',
    transition: 'left var(--canon-duration-fast) ease',
  };
}

const pillListStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

function pillStyle(enabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: 'var(--canon-radius-pill)',
    background: enabled ? 'rgba(168, 85, 247, 0.16)' : 'var(--surface-recessed)',
    border: `1px solid ${enabled ? 'rgba(168, 85, 247, 0.40)' : 'var(--canon-border)'}`,
    color: enabled ? 'var(--canon-cream)' : 'var(--canon-cream-2)',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'background var(--canon-duration-fast) ease',
  };
}

export function CinemaModeToggle({ enabled, onToggle, disabled = false }: CinemaModeToggleProps) {
  const id = useId();
  const titleId = `${id}-title`;

  const handleClick = useCallback(() => {
    if (disabled) {
      return;
    }
    onToggle(!enabled);
  }, [disabled, enabled, onToggle]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onToggle(!enabled);
      }
    },
    [disabled, enabled, onToggle],
  );

  return (
    <div
      data-testid="cinema-mode-toggle"
      data-enabled={enabled ? 'true' : 'false'}
      style={cardStyle(enabled, disabled)}
    >
      <div style={headerStyle}>
        <div style={titleBlockStyle}>
          <h3 id={titleId} style={titleStyle}>
            Modo Cine Pro
          </h3>
          <p style={subtitleStyle}>
            Activa la combinación premium: drone, ambiente, branding, multi-formato y beat-sync.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={enabled}
          aria-labelledby={titleId}
          aria-disabled={disabled}
          disabled={disabled}
          data-testid="cinema-mode-switch"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          style={bigSwitchStyle(enabled, disabled)}
        >
          <span style={bigThumbStyle(enabled)} />
        </button>
      </div>
      <ul aria-label="Funciones incluidas en Modo Cine Pro" style={pillListStyle}>
        {FEATURES.map((f) => (
          <li key={f.key} data-feature={f.key} style={pillStyle(enabled)}>
            {f.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
