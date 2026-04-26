import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';
import type { TabKey } from '../lib/filter-schemas';

const TITLE_KEY: Record<TabKey, string> = {
  own: 'titleOwn',
  exclusive: 'titleExclusive',
  dmx: 'titleDmx',
  mls: 'titleMls',
};

export interface EmptyStateProps {
  tab: TabKey;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function EmptyState({ tab, hasActiveFilters, onClearFilters }: EmptyStateProps) {
  const t = useTranslations('AsesorDesarrollos.empty');
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
      <p style={bodyStyle}>{t('subtitleDefault')}</p>
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
          <linearGradient id="empty-desarrollos-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <rect
          x="40"
          y="60"
          width="120"
          height="100"
          rx="8"
          fill="url(#empty-desarrollos-grad)"
          opacity="0.9"
        />
        <rect x="60" y="80" width="20" height="20" rx="2" fill="#06080f" />
        <rect x="90" y="80" width="20" height="20" rx="2" fill="#06080f" />
        <rect x="120" y="80" width="20" height="20" rx="2" fill="#06080f" />
        <rect x="60" y="110" width="20" height="20" rx="2" fill="#06080f" />
        <rect x="90" y="110" width="20" height="20" rx="2" fill="#06080f" />
        <rect x="120" y="110" width="20" height="20" rx="2" fill="#06080f" />
        <rect x="92" y="140" width="16" height="20" rx="1" fill="#06080f" />
      </svg>
    </div>
  );
}
