'use client';

// F14.F.7 Sprint 6 Tarea 6.5 — Toggle bundle for the 4 Sprint 6 features:
// Virtual Staging, Seedance Ambient, Drone Simulation, Cinema Mode.
// Each toggle disabled when (a) feature flag false, (b) plan is not Agency,
// or (c) project lacks the underlying asset (empty rooms, exterior).

import type { CSSProperties, KeyboardEvent } from 'react';
import { useCallback, useId } from 'react';
import { PlanPaywallCanon } from './PlanPaywallCanon';

export type Sprint6ToggleKey = 'virtualStaging' | 'seedance' | 'droneSim' | 'cinemaMode';

export interface Sprint6FlagsAvailability {
  readonly seedance: boolean;
  readonly virtualStaging: boolean;
  readonly droneSim: boolean;
  readonly cinemaMode: boolean;
}

export interface Sprint6Availability {
  readonly isAgency: boolean;
  readonly flags: Sprint6FlagsAvailability;
}

export interface Sprint6AssetCounts {
  readonly hasEmptyRooms: boolean;
  readonly hasExterior: boolean;
}

export interface Sprint6FeatureTogglesProps {
  readonly availability: Sprint6Availability;
  readonly values: Record<string, boolean>;
  readonly onChange: (key: string, value: boolean) => void;
  readonly assetCounts?: Sprint6AssetCounts;
}

interface ToggleDescriptor {
  readonly key: Sprint6ToggleKey;
  readonly label: string;
  readonly helper: string;
  readonly disabled: boolean;
  readonly disabledReason: string | undefined;
}

const wrapperStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

function rowStyle(disabled: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '14px 16px',
    borderRadius: 'var(--canon-radius-card)',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--canon-border)',
    opacity: disabled ? 0.55 : 1,
    transition: 'transform var(--canon-duration-fast) ease',
  };
}

const labelBlockStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  flex: 1,
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13.5px',
  fontWeight: 600,
  color: 'var(--canon-cream)',
};

const helperStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '12px',
  fontWeight: 400,
  color: 'var(--canon-cream-2)',
};

function trackStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    position: 'relative',
    width: '44px',
    height: '24px',
    borderRadius: 'var(--canon-radius-pill)',
    background: active ? 'var(--gradient-ai)' : 'var(--surface-recessed)',
    border: `1px solid ${active ? 'rgba(168,85,247,0.45)' : 'var(--canon-border)'}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    flexShrink: 0,
    transition:
      'background var(--canon-duration-fast) ease, border-color var(--canon-duration-fast) ease',
  };
}

function thumbStyle(active: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: '2px',
    left: active ? '22px' : '2px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#FFFFFF',
    boxShadow: 'var(--shadow-canon-rest)',
    transition: 'left var(--canon-duration-fast) ease',
  };
}

export function Sprint6FeatureToggles({
  availability,
  values,
  onChange,
  assetCounts,
}: Sprint6FeatureTogglesProps) {
  const id = useId();
  const hasEmptyRooms = assetCounts?.hasEmptyRooms ?? false;
  const hasExterior = assetCounts?.hasExterior ?? false;

  const descriptors: ReadonlyArray<ToggleDescriptor> = [
    {
      key: 'virtualStaging',
      label: 'Virtual Staging',
      helper: hasEmptyRooms
        ? 'Decora habitaciones vacías con muebles AI por estilo.'
        : 'Disponible cuando el proyecto tiene fotos de habitaciones vacías.',
      disabled: !availability.flags.virtualStaging || !hasEmptyRooms,
      disabledReason: !availability.flags.virtualStaging
        ? 'flag_off'
        : !hasEmptyRooms
          ? 'no_empty_rooms'
          : undefined,
    },
    {
      key: 'seedance',
      label: 'Audio Ambiente Seedance',
      helper: 'Genera pistas ambientales que matchean cada espacio.',
      disabled: !availability.flags.seedance,
      disabledReason: !availability.flags.seedance ? 'flag_off' : undefined,
    },
    {
      key: 'droneSim',
      label: 'Drone Simulation',
      helper: hasExterior
        ? 'Simula tomas aéreas a partir de la fachada principal.'
        : 'Disponible cuando hay foto de fachada o exterior.',
      disabled: !availability.flags.droneSim || !hasExterior,
      disabledReason: !availability.flags.droneSim
        ? 'flag_off'
        : !hasExterior
          ? 'no_exterior'
          : undefined,
    },
    {
      key: 'cinemaMode',
      label: 'Cinema Mode (Premium)',
      helper: 'Combina drone reveal + ambiente + branded overlay + multi-formato + beat-sync.',
      disabled: !availability.flags.cinemaMode,
      disabledReason: !availability.flags.cinemaMode ? 'flag_off' : undefined,
    },
  ];

  const handleToggle = useCallback(
    (key: Sprint6ToggleKey, current: boolean, disabled: boolean) => {
      if (disabled) {
        return;
      }
      onChange(key, !current);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLButtonElement>,
      key: Sprint6ToggleKey,
      current: boolean,
      disabled: boolean,
    ) => {
      if (disabled) {
        return;
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onChange(key, !current);
      }
    },
    [onChange],
  );

  return (
    <fieldset
      aria-label="Sprint 6 features toggles"
      data-testid="sprint6-feature-toggles"
      style={{ ...wrapperStyle, border: 'none', padding: 0, margin: 0 }}
    >
      <ul style={listStyle}>
        {descriptors.map((d) => {
          const checked = Boolean(values[d.key]);
          const rowId = `${id}-${d.key}`;
          const helperId = `${rowId}-helper`;
          return (
            <li key={d.key} style={rowStyle(d.disabled)}>
              <div style={labelBlockStyle}>
                <span id={rowId} style={labelStyle}>
                  {d.label}
                </span>
                <span id={helperId} style={helperStyle}>
                  {d.helper}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={rowId}
                aria-describedby={helperId}
                aria-disabled={d.disabled}
                disabled={d.disabled}
                data-testid={`toggle-${d.key}`}
                data-disabled-reason={d.disabledReason ?? ''}
                onClick={() => {
                  handleToggle(d.key, checked, d.disabled);
                }}
                onKeyDown={(e) => {
                  handleKeyDown(e, d.key, checked, d.disabled);
                }}
                style={trackStyle(checked, d.disabled)}
              >
                <span style={thumbStyle(checked)} />
              </button>
            </li>
          );
        })}
      </ul>
      {!availability.isAgency && (
        <PlanPaywallCanon
          requiredPlan="agency"
          currentPlan={null}
          featureName="Sprint 6 funciones premium"
        />
      )}
    </fieldset>
  );
}
