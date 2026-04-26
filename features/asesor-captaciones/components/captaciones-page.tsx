'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import { BlurText } from '@/shared/ui/motion';
import { DisclosurePill } from '@/shared/ui/primitives/canon';
import { useCaptacionDrawer } from '../hooks/use-captacion-drawer';
import { useFilterState } from '../hooks/use-filter-state';
import type { CaptacionDetail, CaptacionesLoadResult } from '../lib/captaciones-loader';
import { CaptacionDetailDrawer } from './captacion-detail-drawer';
import { CaptacionFilters } from './captacion-filters';
import { CreateCaptacionDialog } from './create-captacion-dialog';
import { EmptyState } from './empty-state';
import { PipelineKanban } from './pipeline-kanban';

export interface CaptacionesPageProps {
  initialData: CaptacionesLoadResult;
  detail: CaptacionDetail | null;
}

export function CaptacionesPage({ initialData, detail }: CaptacionesPageProps) {
  const t = useTranslations('AsesorCaptaciones.page');
  const tDisc = useTranslations('AsesorCaptaciones.disclosure');
  const { isOpen } = useCaptacionDrawer();
  const { hasActiveFilters, clear } = useFilterState();
  const [createOpen, setCreateOpen] = useState(false);

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

  const showEmpty = initialData.captaciones.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <header style={headerStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
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
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            style={{
              padding: '10px 22px',
              borderRadius: 'var(--canon-radius-pill)',
              background: 'var(--mod-captaciones, var(--canon-gradient))',
              border: 'none',
              color: '#fff',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {t('ctaCreate')}
          </button>
        </div>
        <p style={subtitleStyle}>{t('subtitle')}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <DisclosurePill tone="amber">{tDisc('acmH1')}</DisclosurePill>
        </div>
      </header>

      <CaptacionFilters />

      {showEmpty ? (
        <EmptyState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clear}
          onCreate={() => setCreateOpen(true)}
          reason={initialData.reason}
        />
      ) : (
        <PipelineKanban captaciones={initialData.captaciones} />
      )}

      {isOpen ? <CaptacionDetailDrawer detail={detail} /> : null}

      <CreateCaptacionDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
