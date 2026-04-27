'use client';

// FASE 14.F.4 Sprint 3 UPGRADE 4 — WhatsApp deep link share button.
// Builds wa.me/[cleanPhone]?text=encodedMessage. Phone null → warning prompt
// to configure Brand Kit. Encoding via encodeURIComponent (canon).
// ADR-050: pill button + aria-label + target=_blank rel=noopener.

import { useTranslations } from 'next-intl';
import { type CSSProperties, useMemo } from 'react';

export interface WhatsappDeepLinkProps {
  readonly phone: string | null;
  readonly message: string;
  readonly className?: string;
}

const warningStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-pill)',
  color: 'var(--canon-cream-2)',
  fontFamily: 'var(--font-body)',
  fontSize: '12.5px',
  lineHeight: 1.45,
  padding: '8px 14px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

const linkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--font-body)',
  fontSize: '12.5px',
  fontWeight: 600,
  height: '34px',
  padding: '0 14px',
  borderRadius: 'var(--canon-radius-pill)',
  color: 'var(--canon-cream)',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  transition:
    'transform var(--canon-duration-fast) var(--canon-ease-out), border-color var(--canon-duration-fast) ease, background-color var(--canon-duration-fast) ease',
  textDecoration: 'none',
};

function buildLink(phone: string, message: string): string | null {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 7) return null;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function WhatsappDeepLink({ phone, message, className }: WhatsappDeepLinkProps) {
  const t = useTranslations('Studio.copyPack');
  const href = useMemo<string | null>(() => {
    if (!phone) return null;
    return buildLink(phone, message);
  }, [phone, message]);

  if (!href) {
    return (
      <span role="status" style={warningStyle} data-testid="whatsapp-deep-link-warning">
        {t('waPhoneMissingWarning')}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={linkStyle}
      aria-label={t('waShareAriaLabel')}
      data-testid="whatsapp-deep-link"
      className={className}
    >
      {t('waShareCta')}
    </a>
  );
}
