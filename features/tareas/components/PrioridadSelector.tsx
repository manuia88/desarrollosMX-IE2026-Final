'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { TareaPriority } from '@/features/tareas/schemas';
import { cn } from '@/shared/ui/primitives/canon/cn';

interface Option {
  value: TareaPriority;
  borderColor: string;
  activeBg: string;
  activeBorder: string;
  text: string;
}

const OPTIONS: readonly Option[] = [
  {
    value: 'alta',
    borderColor: 'rgba(244,63,94,0.30)',
    activeBg: 'rgba(244,63,94,0.16)',
    activeBorder: '#f43f5e',
    text: '#fca5a5',
  },
  {
    value: 'media',
    borderColor: 'rgba(245,158,11,0.30)',
    activeBg: 'rgba(245,158,11,0.16)',
    activeBorder: '#f59e0b',
    text: '#fde68a',
  },
  {
    value: 'baja',
    borderColor: 'rgba(34,197,94,0.30)',
    activeBg: 'rgba(34,197,94,0.16)',
    activeBorder: '#22c55e',
    text: '#86efac',
  },
];

export interface PrioridadSelectorProps {
  value: TareaPriority;
  onChange: (next: TareaPriority) => void;
  disabled?: boolean;
}

export function PrioridadSelector({ value, onChange, disabled }: PrioridadSelectorProps) {
  const t = useTranslations('Tareas');
  return (
    <div role="radiogroup" aria-label={t('priority.aria')} className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => {
        const active = value === option.value;
        const buttonStyle: CSSProperties = {
          background: active ? option.activeBg : 'transparent',
          border: `1px solid ${active ? option.activeBorder : option.borderColor}`,
          borderRadius: 'var(--canon-radius-pill)',
          color: active ? option.text : 'var(--canon-cream)',
          fontFamily: 'var(--font-body)',
          fontSize: 12.5,
          fontWeight: active ? 600 : 500,
          padding: '6px 14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        };
        return (
          // biome-ignore lint/a11y/useSemanticElements: radiogroup pattern with custom pill visuals; role+aria-checked are canonical
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={cn('canon-priority-radio', active ? 'is-active' : '')}
            style={buttonStyle}
          >
            {t(`priority.${option.value}`)}
          </button>
        );
      })}
    </div>
  );
}
