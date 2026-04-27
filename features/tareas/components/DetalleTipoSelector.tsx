'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { TareaDetalleTipo } from '@/features/tareas/schemas';
import { cn } from '@/shared/ui/primitives/canon/cn';

const OPTIONS: readonly TareaDetalleTipo[] = [
  'contactar_propietario',
  'organizar_visita',
  'organizar_captacion',
  'pedir_devolucion_visita',
  'custom',
];

export interface DetalleTipoSelectorProps {
  value: TareaDetalleTipo;
  onChange: (next: TareaDetalleTipo) => void;
  disabled?: boolean;
}

export function DetalleTipoSelector({ value, onChange, disabled }: DetalleTipoSelectorProps) {
  const t = useTranslations('Tareas');
  return (
    <div
      role="radiogroup"
      aria-label={t('detalleTipo.aria')}
      className="grid grid-cols-1 gap-2 md:grid-cols-2"
    >
      {OPTIONS.map((option) => {
        const active = value === option;
        const optionStyle: CSSProperties = {
          background: active ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${active ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 'var(--canon-radius-card)',
          color: active ? 'var(--canon-white-pure)' : 'var(--canon-cream)',
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          fontWeight: active ? 600 : 500,
          padding: '12px 16px',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          width: '100%',
        };
        return (
          // biome-ignore lint/a11y/useSemanticElements: radiogroup pattern with custom card visuals; role+aria-checked are canonical
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !disabled && onChange(option)}
            disabled={disabled}
            className={cn('canon-detalle-tipo', active ? 'is-active' : '')}
            style={optionStyle}
          >
            {t(`detalleTipo.${option}`)}
          </button>
        );
      })}
    </div>
  );
}
