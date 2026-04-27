import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { OperacionStatus } from '@/features/operaciones/schemas';

const STATUS_STYLES: Record<OperacionStatus, CSSProperties> = {
  propuesta: {
    background: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.32)',
    color: 'var(--canon-indigo-3)',
  },
  oferta_aceptada: {
    background: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.32)',
    color: '#d8b4fe',
  },
  escritura: {
    background: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.32)',
    color: '#fcd34d',
  },
  cerrada: {
    background: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.32)',
    color: '#5eead4',
  },
  pagando: {
    background: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.32)',
    color: '#93c5fd',
  },
  cancelada: {
    background: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.32)',
    color: '#fca5a5',
  },
};

export interface OperacionStatusBadgeProps {
  status: OperacionStatus;
}

export function OperacionStatusBadge({ status }: OperacionStatusBadgeProps) {
  const t = useTranslations('Operaciones');
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={STATUS_STYLES[status]}
    >
      {t(`status.${status}`)}
    </span>
  );
}
