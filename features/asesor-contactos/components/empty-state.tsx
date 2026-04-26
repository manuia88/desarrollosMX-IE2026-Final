'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';

interface EmptyStateProps {
  isStub: boolean;
  reason: string | null;
}

export function EmptyState({ isStub, reason }: EmptyStateProps) {
  const t = useTranslations('AsesorContactos.empty');

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    gap: 12,
    color: 'var(--canon-cream-2)',
    textAlign: 'center',
  };

  const iconStyle: CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'var(--surface-recessed)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={containerStyle} role="status" aria-live="polite">
      <span style={iconStyle} aria-hidden="true">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <title>contacts</title>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
        </svg>
      </span>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--canon-cream)',
          margin: 0,
        }}
      >
        {isStub ? t('isStubTitle') : t('noResultsTitle')}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--canon-cream-2)', maxWidth: 380, margin: 0 }}>
        {reason ?? t(isStub ? 'isStubBody' : 'noResultsBody')}
      </p>
    </div>
  );
}
