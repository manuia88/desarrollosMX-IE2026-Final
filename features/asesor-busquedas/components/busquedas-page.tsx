'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { BlurText } from '@/shared/ui/motion';
import { DisclosurePill } from '@/shared/ui/primitives/canon';
import { useBusquedaDrawer } from '../hooks/use-busqueda-drawer';
import { useBusquedasTab } from '../hooks/use-busquedas-tab';
import type { BusquedaDetail, BusquedasLoadResult } from '../lib/busquedas-loader';
import { BusquedaDetailDrawer } from './busqueda-detail-drawer';
import { BusquedasFilters } from './busquedas-filters';
import { BusquedasGrid } from './busquedas-grid';
import { BusquedasTabs } from './busquedas-tabs';

export interface BusquedasPageProps {
  initialData: BusquedasLoadResult;
  detail: BusquedaDetail | null;
}

export function BusquedasPage({ initialData, detail }: BusquedasPageProps) {
  const t = useTranslations('AsesorBusquedas.page');
  const tDisc = useTranslations('AsesorBusquedas.disclosure');
  const { tab } = useBusquedasTab();
  const { isOpen } = useBusquedaDrawer();

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
          <DisclosurePill tone="amber">{tDisc('matcherH1')}</DisclosurePill>
        </div>
      </header>
      <BusquedasTabs tabCounts={initialData.tabCounts} />
      <BusquedasFilters />
      <BusquedasGrid busquedas={initialData.busquedas} tab={tab} reason={initialData.reason} />
      {isOpen ? <BusquedaDetailDrawer detail={detail} /> : null}
    </div>
  );
}
