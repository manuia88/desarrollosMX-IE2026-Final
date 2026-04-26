'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useContactosFilters } from '../hooks/use-contactos-filters';
import { type ContactoTab, TABS } from '../schemas/filter-schemas';

interface ContactsTabsProps {
  tabCounts: Record<ContactoTab, number>;
}

export function ContactsTabs({ tabCounts }: ContactsTabsProps) {
  const t = useTranslations('AsesorContactos.tabs');
  const { filters, setTab } = useContactosFilters();

  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: 6,
    padding: '12px 28px 0',
    overflowX: 'auto',
  };

  return (
    <nav style={containerStyle} aria-label={t('aria')}>
      {TABS.map((tabKey) => {
        const isActive = filters.tab === tabKey;
        const buttonStyle: CSSProperties = {
          padding: '8px 14px',
          borderRadius: 'var(--canon-radius-pill)',
          border: '1px solid var(--canon-border)',
          background: isActive ? 'var(--accent-violet-soft)' : 'transparent',
          color: isActive ? 'var(--canon-cream)' : 'var(--canon-cream-2)',
          fontFamily: 'var(--font-body)',
          fontWeight: isActive ? 600 : 500,
          fontSize: 13,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        };
        return (
          <button
            key={tabKey}
            type="button"
            aria-pressed={isActive}
            onClick={() => setTab(tabKey)}
            style={buttonStyle}
          >
            <span>{t(`labels.${tabKey}`)}</span>
            <span
              aria-hidden="true"
              style={{
                fontSize: 11,
                color: 'var(--canon-cream-3)',
                background: 'var(--surface-recessed)',
                padding: '1px 6px',
                borderRadius: 'var(--canon-radius-pill)',
              }}
            >
              {tabCounts[tabKey]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
