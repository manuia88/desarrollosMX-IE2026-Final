'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useContactosFilters } from '../hooks/use-contactos-filters';
import type { ContactoSummary } from '../lib/contactos-loader';
import { ContactCard } from './contact-card';
import { EmptyState } from './empty-state';

interface ContactsGridProps {
  contactos: ContactoSummary[];
  isStub: boolean;
  reason: string | null;
}

export function ContactsGrid({ contactos, isStub, reason }: ContactsGridProps) {
  const { openDrawer } = useContactosFilters();
  const t = useTranslations('AsesorContactos.grid');

  if (contactos.length === 0) {
    return <EmptyState isStub={isStub} reason={reason} />;
  }

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
    padding: '20px 28px 32px',
  };

  return (
    <ul
      style={{ ...gridStyle, listStyle: 'none', margin: 0 }}
      aria-label={t('aria', { count: contactos.length })}
    >
      {contactos.map((contacto) => (
        <li key={contacto.id}>
          <ContactCard contacto={contacto} onOpen={openDrawer} />
        </li>
      ))}
    </ul>
  );
}
