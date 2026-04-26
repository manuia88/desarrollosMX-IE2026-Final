'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import type { ContactoSummary } from '../lib/contactos-loader';
import { SuggestDialog } from './suggest-dialog';

export interface SuggestCopilotButtonProps {
  contacto: ContactoSummary;
  familySize?: number | null;
}

function topDiscLetter(disc: ContactoSummary['disc']): 'D' | 'I' | 'S' | 'C' | null {
  if (!disc) return null;
  const entries: Array<['D' | 'I' | 'S' | 'C', number]> = [
    ['D', disc.D],
    ['I', disc.I],
    ['S', disc.S],
    ['C', disc.C],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  if (!top) return null;
  if (top[1] === 0) return null;
  return top[0];
}

export function SuggestCopilotButton({ contacto, familySize = null }: SuggestCopilotButtonProps) {
  const t = useTranslations('AsesorContactos.copilot');
  const [open, setOpen] = useState(false);

  const buttonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 'var(--canon-radius-pill)',
    border: 'none',
    background: 'var(--gradient-ai)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'transform var(--canon-duration-fast) var(--canon-ease-out)',
  };

  const sparkleStyle: CSSProperties = {
    width: 12,
    height: 12,
    display: 'inline-block',
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        style={buttonStyle}
        aria-label={t('button.ariaOpen', { name: contacto.contactName })}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={sparkleStyle}
        >
          <path
            d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
        <span>{t('button.label')}</span>
      </button>
      <SuggestDialog
        open={open}
        onClose={() => setOpen(false)}
        contactName={contacto.contactName}
        leadStatus={contacto.status}
        buyerTwinDisc={topDiscLetter(contacto.disc)}
        lastContactDays={contacto.daysSinceLastContact}
        familySize={familySize}
      />
    </>
  );
}
