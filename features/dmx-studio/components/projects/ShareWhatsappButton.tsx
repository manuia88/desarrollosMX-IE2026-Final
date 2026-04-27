'use client';

// FASE 14.F.2 Sprint 1 — Share via WhatsApp button (wa.me deep link).
// Pre-formatted message: title + portal description + video URL.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useCallback } from 'react';

export interface ShareWhatsappButtonProps {
  readonly title: string;
  readonly description: string;
  readonly videoUrl: string;
}

const buttonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid rgba(34,197,94,0.32)',
  background: 'rgba(34,197,94,0.10)',
  color: '#86efac',
  padding: '10px 20px',
  borderRadius: 'var(--canon-radius-pill)',
  fontFamily: 'var(--font-body)',
  fontSize: '13.5px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  textDecoration: 'none',
};

export function ShareWhatsappButton({ title, description, videoUrl }: ShareWhatsappButtonProps) {
  const t = useTranslations('Studio.result');

  const handleClick = useCallback(() => {
    const message = `${title}\n${description}\n${videoUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [title, description, videoUrl]);

  return (
    <button
      type="button"
      style={buttonStyle}
      onClick={handleClick}
      data-testid="share-whatsapp-button"
      aria-label={t('shareWhatsapp')}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
        <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1" />
      </svg>
      {t('shareWhatsapp')}
    </button>
  );
}
