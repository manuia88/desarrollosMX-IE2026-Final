'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { ContactoSummary } from '../lib/contactos-loader';
import { DiscMini } from './disc-mini';

interface ContactCardProps {
  contacto: ContactoSummary;
  onOpen: (id: string) => void;
}

const STATUS_TONES: Record<ContactoSummary['status'], { bg: string; fg: string }> = {
  new: { bg: 'rgba(99,102,241,0.12)', fg: '#818cf8' },
  qualified: { bg: 'rgba(16,185,129,0.16)', fg: '#34d399' },
  nurturing: { bg: 'rgba(245,158,11,0.16)', fg: '#fbbf24' },
  converted: { bg: 'rgba(20,184,166,0.16)', fg: '#2dd4bf' },
  lost: { bg: 'rgba(244,63,94,0.16)', fg: '#fb7185' },
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

export function ContactCard({ contacto, onOpen }: ContactCardProps) {
  const t = useTranslations('AsesorContactos.card');
  const statusTone = STATUS_TONES[contacto.status];
  const cardStyle: CSSProperties = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--canon-border)',
    borderRadius: 'var(--canon-radius-lg)',
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    cursor: 'pointer',
    transition:
      'transform var(--canon-duration-fast) var(--canon-ease-out), border-color var(--canon-duration-fast)',
  };
  const avatarStyle: CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--canon-gradient)',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    flexShrink: 0,
  };

  return (
    <button
      type="button"
      onClick={() => onOpen(contacto.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(contacto.id);
        }
      }}
      style={cardStyle}
      aria-label={t('open', { name: contacto.contactName })}
    >
      <header style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={avatarStyle} aria-hidden="true">
          {initialsFromName(contacto.contactName)}
        </span>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--canon-cream)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {contacto.contactName}
          </h3>
          <p
            style={{
              fontSize: 12,
              color: 'var(--canon-cream-2)',
              margin: 0,
            }}
          >
            {contacto.contactEmail ?? contacto.contactPhone ?? '—'}
          </p>
        </div>
        {contacto.birthdayInDays !== null && contacto.birthdayInDays <= 30 ? (
          <span
            role="img"
            aria-label={t('birthdayBadge', { days: contacto.birthdayInDays })}
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--canon-radius-pill)',
              background: 'rgba(236,72,153,0.18)',
              color: '#f472b6',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {t('birthdayShort', { days: contacto.birthdayInDays })}
          </span>
        ) : null}
      </header>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
      >
        <span
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--canon-radius-pill)',
            background: statusTone.bg,
            color: statusTone.fg,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'capitalize',
          }}
        >
          {t(`status.${contacto.status}`)}
        </span>
        <DiscMini disc={contacto.disc} />
      </div>
      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--canon-cream-2)',
        }}
      >
        <span>{t('lastContactAgo', { days: contacto.daysSinceLastContact })}</span>
        <span>{t('qualification', { score: Math.round(contacto.qualificationScore) })}</span>
      </footer>
    </button>
  );
}
