import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';

export interface ExclusividadBadgeProps {
  mesesExclusividad: number;
  mesesContrato: number;
  comisionPct: number;
}

export function ExclusividadBadge({
  mesesExclusividad,
  mesesContrato,
  comisionPct,
}: ExclusividadBadgeProps) {
  const t = useTranslations('AsesorDesarrollos');
  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: 'var(--canon-radius-pill)',
    background: 'var(--canon-gradient)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  };
  const label = `EXC ${mesesExclusividad}-${mesesContrato}-${comisionPct}%`;
  const a11yLabel = t('a11y.exclusividadBadge', {
    months: mesesExclusividad,
    contract: mesesContrato,
    pct: comisionPct,
  });
  return (
    <span style={containerStyle} role="img" aria-label={a11yLabel}>
      {label}
    </span>
  );
}
