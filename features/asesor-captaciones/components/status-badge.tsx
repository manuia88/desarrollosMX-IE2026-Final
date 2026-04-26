import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { CaptacionStatusKey } from '../lib/filter-schemas';

export interface StatusBadgeProps {
  status: CaptacionStatusKey;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<CaptacionStatusKey, { bg: string; border: string; color: string }> = {
  prospecto: {
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.32)',
    color: '#cbd5e1',
  },
  presentacion: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.32)',
    color: '#fcd34d',
  },
  firmado: {
    bg: 'rgba(99, 102, 241, 0.14)',
    border: 'rgba(99, 102, 241, 0.36)',
    color: 'var(--canon-indigo-2, #a5b4fc)',
  },
  en_promocion: {
    bg: 'rgba(16, 185, 129, 0.14)',
    border: 'rgba(16, 185, 129, 0.36)',
    color: '#6ee7b7',
  },
  vendido: {
    bg: 'rgba(5, 150, 105, 0.18)',
    border: 'rgba(5, 150, 105, 0.40)',
    color: '#34d399',
  },
  cerrado_no_listado: {
    bg: 'rgba(217, 207, 188, 0.10)',
    border: 'rgba(217, 207, 188, 0.30)',
    color: 'var(--canon-cream-2, #d9cfbc)',
  },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const t = useTranslations('AsesorCaptaciones.stage');
  const tone = STATUS_STYLES[status];

  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: size === 'sm' ? '2px 10px' : '4px 12px',
    borderRadius: 'var(--canon-radius-pill)',
    background: tone.bg,
    border: `1px solid ${tone.border}`,
    color: tone.color,
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: size === 'sm' ? 11 : 12,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  };

  return (
    <span style={style} data-status={status}>
      {t(status)}
    </span>
  );
}
