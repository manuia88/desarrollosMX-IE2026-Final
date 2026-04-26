import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export interface EmptyStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onCreate?: () => void;
  reason?: string | null;
}

export function EmptyState({
  hasActiveFilters,
  onClearFilters,
  onCreate,
  reason,
}: EmptyStateProps) {
  const t = useTranslations('AsesorCaptaciones.empty');

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
      <h2 style={titleStyle}>{t('title')}</h2>
      <p style={bodyStyle}>{reason ?? t('subtitleDefault')}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            style={{
              padding: '10px 22px',
              borderRadius: 'var(--canon-radius-pill)',
              background: 'transparent',
              border: '1px solid var(--canon-border-2)',
              color: 'var(--canon-cream-2)',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {t('ctaClear')}
          </button>
        ) : null}
        {onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            style={{
              padding: '10px 22px',
              borderRadius: 'var(--canon-radius-pill)',
              background: 'var(--mod-captaciones, var(--canon-gradient))',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {t('ctaCreate')}
          </button>
        ) : null}
      </div>
    </Card>
  );
}

function EmptyIllustration() {
  return (
    <div
      style={{
        width: 96,
        height: 96,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" width="96" height="96" fill="none" role="presentation">
        <defs>
          <linearGradient id="empty-captaciones-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect
          x="40"
          y="50"
          width="120"
          height="100"
          rx="12"
          stroke="url(#empty-captaciones-grad)"
          strokeWidth="6"
        />
        <line
          x1="60"
          y1="80"
          x2="140"
          y2="80"
          stroke="url(#empty-captaciones-grad)"
          strokeWidth="6"
        />
        <line
          x1="60"
          y1="110"
          x2="120"
          y2="110"
          stroke="url(#empty-captaciones-grad)"
          strokeWidth="6"
        />
      </svg>
    </div>
  );
}
