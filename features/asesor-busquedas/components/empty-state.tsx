import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';
import type { TabKey } from '../lib/filter-schemas';

const TITLE_KEY: Record<TabKey, string> = {
  activa: 'titleActiva',
  pausada: 'titlePausada',
  cerrada: 'titleCerrada',
};

export interface EmptyStateProps {
  tab: TabKey;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  reason?: string | null;
}

export function EmptyState({ tab, hasActiveFilters, onClearFilters, reason }: EmptyStateProps) {
  const t = useTranslations('AsesorBusquedas.empty');

  const cardStyle: CSSProperties = {
    margin: '32px auto',
    padding: '48px 32px',
    maxWidth: 560,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  };
  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--canon-cream)',
  };
  const bodyStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: 'var(--canon-cream-2)',
    lineHeight: 1.6,
  };
  return (
    <Card variant="elevated" style={cardStyle} role="status" aria-live="polite">
      <EmptyIllustration />
      <h2 style={titleStyle}>{t(TITLE_KEY[tab])}</h2>
      <p style={bodyStyle}>{reason ?? t('subtitleDefault')}</p>
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          style={{
            padding: '10px 22px',
            borderRadius: 'var(--canon-radius-pill)',
            background: 'var(--canon-gradient)',
            color: '#fff',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {t('ctaClear')}
        </button>
      ) : null}
    </Card>
  );
}

function EmptyIllustration() {
  const wrapperStyle: CSSProperties = {
    width: 96,
    height: 96,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <div style={wrapperStyle} aria-hidden="true">
      <svg viewBox="0 0 200 200" width="96" height="96" fill="none" role="presentation">
        <defs>
          <linearGradient id="empty-busquedas-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r="50" stroke="url(#empty-busquedas-grad)" strokeWidth="8" />
        <line
          x1="125"
          y1="125"
          x2="160"
          y2="160"
          stroke="url(#empty-busquedas-grad)"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
