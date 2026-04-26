'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import { BlurText } from '@/shared/ui/motion';
import { DisclosurePill } from '@/shared/ui/primitives/canon';
import { useBusquedaDrawer } from '../hooks/use-busqueda-drawer';
import { useBusquedasTab } from '../hooks/use-busquedas-tab';
import type { BusquedaDetail, BusquedasLoadResult } from '../lib/busquedas-loader';
import { BusquedaDetailDrawer } from './busqueda-detail-drawer';
import { BusquedasFilters } from './busquedas-filters';
import { BusquedasGrid } from './busquedas-grid';
import { BusquedasKanban } from './busquedas-kanban';
import { BusquedasTabs } from './busquedas-tabs';

export interface BusquedasPageProps {
  initialData: BusquedasLoadResult;
  detail: BusquedaDetail | null;
}

type ViewMode = 'list' | 'grid' | 'kanban';

const VIEW_MODES: readonly ViewMode[] = ['list', 'grid', 'kanban'] as const;

export function BusquedasPage({ initialData, detail }: BusquedasPageProps) {
  const t = useTranslations('AsesorBusquedas.page');
  const tDisc = useTranslations('AsesorBusquedas.disclosure');
  const tView = useTranslations('AsesorBusquedas.view');
  const { tab } = useBusquedasTab();
  const { isOpen } = useBusquedaDrawer();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

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

  const viewToggleStyle: CSSProperties = {
    display: 'inline-flex',
    gap: 4,
    padding: 4,
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg-2)',
  };

  const viewBtn = (mode: ViewMode): CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 'var(--canon-radius-pill)',
    border: 'none',
    background: viewMode === mode ? 'var(--mod-busquedas)' : 'transparent',
    color: viewMode === mode ? '#fff' : 'var(--canon-cream-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 200ms var(--canon-ease-out), color 200ms var(--canon-ease-out)',
  });

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
          {/* biome-ignore lint/a11y/useSemanticElements: pill toggle needs flexible div, not fieldset semantics */}
          <div role="group" aria-label={tView('ariaToggle')} style={viewToggleStyle}>
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                aria-label={tView(`ariaSelect.${mode}`)}
                style={viewBtn(mode)}
              >
                {tView(`mode.${mode}`)}
              </button>
            ))}
          </div>
        </div>
      </header>
      <BusquedasTabs tabCounts={initialData.tabCounts} />
      <BusquedasFilters />
      {viewMode === 'kanban' ? (
        <BusquedasKanban busquedas={initialData.busquedas} />
      ) : (
        <BusquedasGrid busquedas={initialData.busquedas} tab={tab} reason={initialData.reason} />
      )}
      {isOpen ? <BusquedaDetailDrawer detail={detail} /> : null}
    </div>
  );
}
