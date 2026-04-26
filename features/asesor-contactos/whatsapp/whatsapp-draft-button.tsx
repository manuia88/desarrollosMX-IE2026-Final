'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ContactoSummary } from '../lib/contactos-loader';
import { WhatsAppDraftDialog } from './whatsapp-draft-dialog';

interface WhatsAppDraftButtonProps {
  contacto: ContactoSummary;
}

export function WhatsAppDraftButton({ contacto }: WhatsAppDraftButtonProps) {
  const t = useTranslations('AsesorContactos.whatsapp');
  const [open, setOpen] = useState(false);
  const disabled = !contacto.contactPhone;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-disabled={disabled}
        style={{
          padding: '8px 14px',
          borderRadius: 'var(--canon-radius-pill)',
          border: '1px solid var(--canon-border-2)',
          background: disabled ? 'transparent' : 'rgba(16,185,129,0.16)',
          color: disabled ? 'var(--canon-cream-3)' : '#34d399',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        title={disabled ? t('disabledNoPhone') : t('triggerTitle')}
      >
        {t('trigger')}
      </button>
      {open ? <WhatsAppDraftDialog contacto={contacto} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
