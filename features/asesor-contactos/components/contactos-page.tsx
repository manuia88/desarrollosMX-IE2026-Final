'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { BlurText } from '@/shared/ui/motion';
import { DisclosurePill } from '@/shared/ui/primitives/canon';
import { EnrichmentPipelineCard } from '../enrichment/enrichment-pipeline-card';
import { useContactosFilters } from '../hooks/use-contactos-filters';
import type { ContactosLoadResult } from '../lib/contactos-loader';
import { ReEngagementBanner } from '../re-engagement/re-engagement-banner';
import { ScanOcrButton } from '../scan-ocr/scan-button';
import { ContactDetailDrawer } from './contact-detail-drawer';
import { ContactsFilters } from './contacts-filters';
import { ContactsGrid } from './contacts-grid';
import { ContactsTabs } from './contacts-tabs';

export interface ContactosPageProps {
  initialData: ContactosLoadResult;
}

export function ContactosPage({ initialData }: ContactosPageProps) {
  const t = useTranslations('AsesorContactos.page');
  const tDisc = useTranslations('AsesorContactos.disclosure');
  const { filters } = useContactosFilters();

  const headerStyle: CSSProperties = {
    padding: '24px 28px',
    borderBottom: '1px solid var(--canon-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const subtitleStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: 'var(--canon-cream-2)',
    margin: 0,
  };

  const drawerContact = initialData.contactos.find((c) => c.id === filters.drawer) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <header style={headerStyle}>
        <BlurText
          as="h1"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--canon-cream)',
            margin: 0,
          }}
        >
          {t('title')}
        </BlurText>
        <p style={subtitleStyle}>{t('subtitle')}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <DisclosurePill tone="amber">{tDisc('crmH1Source')}</DisclosurePill>
          <ScanOcrButton />
        </div>
      </header>
      <ContactsTabs tabCounts={initialData.tabCounts} />
      <ContactsFilters />
      <ReEngagementBanner contactos={initialData.contactos} />
      <EnrichmentPipelineCard />
      <ContactsGrid
        contactos={initialData.contactos}
        isStub={initialData.isStub}
        reason={initialData.reason}
      />
      <ContactDetailDrawer contacto={drawerContact} />
    </div>
  );
}
