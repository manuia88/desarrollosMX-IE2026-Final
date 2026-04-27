'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useContactosFilters } from '../hooks/use-contactos-filters';
import type { ContactoSummary } from '../lib/contactos-loader';
import { NotesPanel } from '../notes/notes-panel';
import { WhatsAppDraftButton } from '../whatsapp/whatsapp-draft-button';
import { DiscMini } from './disc-mini';

interface ContactDetailDrawerProps {
  contacto: ContactoSummary | null;
  currentUserId?: string | null;
}

type TabKey = 'overview' | 'notes';

export function ContactDetailDrawer({ contacto, currentUserId = null }: ContactDetailDrawerProps) {
  const t = useTranslations('AsesorContactos.drawer');
  const { openDrawer } = useContactosFilters();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (!contacto) return;
    closeRef.current?.focus();
    setActiveTab('overview');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') openDrawer(undefined);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [contacto, openDrawer]);

  if (!contacto) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(8, 10, 18, 0.55)',
    zIndex: 60,
    display: 'flex',
    justifyContent: 'flex-end',
  };

  const drawerStyle: CSSProperties = {
    width: 'min(480px, 100vw)',
    background: 'var(--surface-elevated)',
    borderLeft: '1px solid var(--canon-border)',
    padding: 24,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const tabsStyle: CSSProperties = {
    display: 'inline-flex',
    gap: 4,
    padding: 4,
    borderRadius: 'var(--canon-radius-pill)',
    background: 'var(--canon-bg-2)',
    border: '1px solid var(--canon-border-2)',
    alignSelf: 'flex-start',
  };

  const tabBtn = (key: TabKey): CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 'var(--canon-radius-pill)',
    border: 'none',
    background: activeTab === key ? 'var(--mod-contactos)' : 'transparent',
    color: activeTab === key ? '#fff' : 'var(--canon-cream-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 200ms var(--canon-ease-out), color 200ms var(--canon-ease-out)',
  });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: ESC handler attached at window via useEffect.
    <div
      style={overlayStyle}
      onClick={(event) => {
        if (event.target === event.currentTarget) openDrawer(undefined);
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t('aria', { name: contacto.contactName })}
    >
      <aside style={drawerStyle}>
        <header
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 20,
                color: 'var(--canon-cream)',
                margin: 0,
              }}
            >
              {contacto.contactName}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--canon-cream-2)', margin: '4px 0 0' }}>
              {contacto.contactEmail ?? contacto.contactPhone ?? '—'}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => openDrawer(undefined)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--canon-radius-pill)',
              border: '1px solid var(--canon-border)',
              background: 'transparent',
              color: 'var(--canon-cream-2)',
              cursor: 'pointer',
            }}
            aria-label={t('closeAria')}
          >
            {t('close')}
          </button>
        </header>

        <div role="tablist" aria-label={t('tabs.aria')} style={tabsStyle}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            style={tabBtn('overview')}
          >
            {t('tabs.overview')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'notes'}
            onClick={() => setActiveTab('notes')}
            style={tabBtn('notes')}
          >
            {t('tabs.notes')}
          </button>
        </div>

        {activeTab === 'overview' ? (
          <>
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h3
                style={{
                  fontSize: 12,
                  color: 'var(--canon-cream-3)',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                {t('discTitle')}
              </h3>
              <DiscMini disc={contacto.disc} />
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h3
                style={{
                  fontSize: 12,
                  color: 'var(--canon-cream-3)',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                {t('insightsTitle')}
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <li style={{ fontSize: 13, color: 'var(--canon-cream)' }}>
                  {t('lastContact', { days: contacto.daysSinceLastContact })}
                </li>
                <li style={{ fontSize: 13, color: 'var(--canon-cream)' }}>
                  {t('qualification', { score: Math.round(contacto.qualificationScore) })}
                </li>
                <li style={{ fontSize: 13, color: 'var(--canon-cream)' }}>
                  {t('status')}: {t(`statuses.${contacto.status}`)}
                </li>
                {contacto.hasFamilyUnit ? (
                  <li style={{ fontSize: 13, color: 'var(--canon-cream)' }}>
                    {t('hasFamilyUnit')}
                  </li>
                ) : null}
                {contacto.birthdayInDays !== null ? (
                  <li style={{ fontSize: 13, color: 'var(--canon-cream)' }}>
                    {t('birthdayIn', { days: contacto.birthdayInDays })}
                  </li>
                ) : null}
              </ul>
            </section>

            {contacto.notes ? (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h3
                  style={{
                    fontSize: 12,
                    color: 'var(--canon-cream-3)',
                    margin: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('notesTitle')}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--canon-cream-2)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {contacto.notes}
                </p>
              </section>
            ) : null}

            <footer style={{ display: 'flex', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
              <WhatsAppDraftButton contacto={contacto} />
            </footer>
          </>
        ) : (
          <NotesPanel leadId={contacto.id} currentUserId={currentUserId} />
        )}
      </aside>
    </div>
  );
}
