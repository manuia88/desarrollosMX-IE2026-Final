'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { cn } from '@/shared/ui/primitives/canon/cn';

export interface EquipoToggleProps {
  enabled: boolean;
  onChange: (next: boolean) => void;
  visible: boolean;
}

export function EquipoToggle({ enabled, onChange, visible }: EquipoToggleProps) {
  const t = useTranslations('Tareas');
  if (!visible) return null;
  const buttonStyle: CSSProperties = {
    background: enabled ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${enabled ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.14)'}`,
    borderRadius: 'var(--canon-radius-pill)',
    color: enabled ? '#c7d2fe' : 'var(--canon-cream)',
    fontFamily: 'var(--font-body)',
    fontSize: 12.5,
    fontWeight: enabled ? 600 : 500,
    padding: '6px 14px',
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={t('equipo.aria')}
      onClick={() => onChange(!enabled)}
      className={cn('canon-equipo-toggle')}
      style={buttonStyle}
    >
      {enabled ? t('equipo.on') : t('equipo.off')}
    </button>
  );
}
