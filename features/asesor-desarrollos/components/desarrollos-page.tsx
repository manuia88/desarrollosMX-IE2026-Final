'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { BlurText } from '@/shared/ui/motion';
import { DisclosurePill } from '@/shared/ui/primitives/canon';
import { useDesarrolloDrawer } from '../hooks/use-desarrollo-drawer';
import { useDesarrollosTab } from '../hooks/use-desarrollos-tab';
import type { DesarrollosLoadResult } from '../lib/desarrollos-loader';
import { DesarrolloDetailDrawer } from './desarrollo-detail-drawer';
import { DesarrollosFilters } from './desarrollos-filters';
import { DesarrollosGrid } from './desarrollos-grid';
import { DesarrollosTabs } from './desarrollos-tabs';

export interface DesarrollosPageProps {
  initialData: DesarrollosLoadResult;
}

export function DesarrollosPage({ initialData }: DesarrollosPageProps) {
  const t = useTranslations('AsesorDesarrollos.page');
  const tDisc = useTranslations('AsesorDesarrollos.disclosure');
  const { tab } = useDesarrollosTab();
  const { openId } = useDesarrolloDrawer();

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

  const newProjectButtonStyle: CSSProperties = {
    alignSelf: 'flex-start',
    marginTop: 4,
    padding: '8px 18px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border-2)',
    background: 'transparent',
    color: 'var(--canon-cream-3)',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'not-allowed',
  };

  const drawerProject = initialData.projects.find((p) => p.id === openId) ?? null;

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
          <DisclosurePill tone="amber">{tDisc('datasourcePending')}</DisclosurePill>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t('newProjectDisabledTooltip')}
            style={newProjectButtonStyle}
          >
            {t('newProjectDisabled')}
          </button>
        </div>
      </header>

      <DesarrollosTabs tabCounts={initialData.tabCounts} />
      <DesarrollosFilters />
      <DesarrollosGrid projects={initialData.projects} tab={tab} />
      <DesarrolloDetailDrawer project={drawerProject} />
    </div>
  );
}
