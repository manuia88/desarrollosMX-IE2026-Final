'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { ContactoSummary } from '../lib/contactos-loader';
import { buildWhatsAppDraft, type WhatsAppObjective } from './whatsapp-template';

interface WhatsAppDraftDialogProps {
  contacto: ContactoSummary;
  onClose: () => void;
}

const OBJECTIVES: WhatsAppObjective[] = ['follow_up', 'birthday', 'reengagement', 'invite_visit'];

export function WhatsAppDraftDialog({ contacto, onClose }: WhatsAppDraftDialogProps) {
  const t = useTranslations('AsesorContactos.whatsapp');
  const [objective, setObjective] = useState<WhatsAppObjective>('follow_up');
  const draft = useMemo(() => buildWhatsAppDraft(contacto, objective), [contacto, objective]);
  const [editedText, setEditedText] = useState(draft.template_md);

  useEffect(() => {
    setEditedText(draft.template_md);
  }, [draft.template_md]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: ESC handler attached at window via useEffect.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('dialogAria')}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,10,18,0.65)',
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        style={{
          width: 'min(560px, 100%)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--canon-border)',
          borderRadius: 'var(--canon-radius-lg)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <header>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--canon-cream)',
              margin: 0,
            }}
          >
            {t('dialogTitle')}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--canon-cream-2)', margin: '4px 0 0' }}>
            {t('dialogSubtitle')}
          </p>
        </header>

        <fieldset
          style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}
        >
          <legend
            style={{ fontSize: 11, color: 'var(--canon-cream-3)', textTransform: 'uppercase' }}
          >
            {t('objectiveLegend')}
          </legend>
          {OBJECTIVES.map((value) => {
            const active = objective === value;
            return (
              <label
                key={value}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--canon-radius-pill)',
                  border: '1px solid var(--canon-border)',
                  background: active ? 'var(--accent-violet-soft)' : 'transparent',
                  color: active ? 'var(--canon-cream)' : 'var(--canon-cream-2)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="whatsapp-objective"
                  value={value}
                  checked={active}
                  onChange={() => setObjective(value)}
                  style={{ display: 'none' }}
                />
                {t(`objectives.${value}`)}
              </label>
            );
          })}
        </fieldset>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--canon-cream-3)', textTransform: 'uppercase' }}>
            {t('messageLegend')}
          </span>
          <textarea
            value={editedText}
            onChange={(event) => setEditedText(event.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 'var(--canon-radius-md)',
              border: '1px solid var(--canon-border)',
              background: 'var(--surface-recessed)',
              color: 'var(--canon-cream)',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              resize: 'vertical',
            }}
          />
        </label>

        <p style={{ fontSize: 11, color: 'var(--canon-cream-3)', margin: 0 }}>
          {t('disclosureWebQr')}
        </p>

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(editedText).catch(() => undefined)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--canon-radius-pill)',
              border: '1px solid var(--canon-border)',
              background: 'transparent',
              color: 'var(--canon-cream-2)',
              cursor: 'pointer',
            }}
          >
            {t('copy')}
          </button>
          <a
            href={
              draft.url
                ? `https://web.whatsapp.com/send?phone=${encodeURIComponent(
                    (draft.fallbackPhone ?? '').replace(/\D/g, ''),
                  )}&text=${encodeURIComponent(editedText)}`
                : '#'
            }
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!draft.url}
            onClick={(event) => {
              if (!draft.url) {
                event.preventDefault();
              }
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--canon-radius-pill)',
              border: '1px solid #34d399',
              background: 'rgba(16,185,129,0.16)',
              color: '#34d399',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
              opacity: draft.url ? 1 : 0.4,
              pointerEvents: draft.url ? 'auto' : 'none',
            }}
          >
            {t('openWhatsAppWeb')}
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--canon-radius-pill)',
              border: '1px solid var(--canon-border-2)',
              background: 'transparent',
              color: 'var(--canon-cream-2)',
              cursor: 'pointer',
            }}
          >
            {t('close')}
          </button>
        </footer>
      </section>
    </div>
  );
}
