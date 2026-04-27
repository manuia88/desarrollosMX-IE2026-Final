'use client';

// FASE 14.F.2 Sprint 1 — Tabs: "Subir fotos" (default) | "Importar de portal" (STUB H2).
// ADR-018 4 señales: STUB activar comment + heuristic message + L-NEW pointer + tests.

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

export type CrossFunctionImportTab = 'upload' | 'import-portal';

export interface CrossFunctionImportTabsProps {
  readonly activeTab: CrossFunctionImportTab;
  readonly onChange: (tab: CrossFunctionImportTab) => void;
  readonly uploadContent: ReactNode;
}

// STUB — activar Sprint 3 H2 (BIBLIA v4 Sprint 3). Importación automática
// desde portales (Inmuebles24/Lamudi/Vivanuncios) requiere acceso a APIs
// scraping legales (defer). Validación heurística: el botón disabled +
// badge "Próximamente Sprint 3" señalan claramente que la feature no está activa.
// Pointer: features/dmx-studio/components/projects/CrossFunctionImportTabs.tsx
// L-NEW-DMX-STUDIO-IMPORT-PORTAL-SPRINT-3 → activar tras BIBLIA v4 Sprint 3.

export function CrossFunctionImportTabs({
  activeTab,
  onChange,
  uploadContent,
}: CrossFunctionImportTabsProps) {
  const t = useTranslations('Studio.projects.new');

  const handleSelectUpload = useCallback(() => onChange('upload'), [onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        role="tablist"
        aria-label={t('tabUploadTitle')}
        style={{
          display: 'flex',
          gap: '8px',
          padding: '4px',
          background: 'var(--surface-recessed)',
          border: '1px solid var(--canon-border)',
          borderRadius: 'var(--canon-radius-pill)',
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upload'}
          aria-controls="cross-function-tabpanel-upload"
          id="cross-function-tab-upload"
          onClick={handleSelectUpload}
          data-testid="cross-function-tab-upload"
          style={{
            appearance: 'none',
            border: 0,
            cursor: 'pointer',
            padding: '0 16px',
            height: '34px',
            borderRadius: 'var(--canon-radius-pill)',
            background: activeTab === 'upload' ? 'var(--gradient-ai)' : 'transparent',
            color: activeTab === 'upload' ? '#FFFFFF' : 'var(--canon-cream-2)',
            fontSize: '12.5px',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          {t('tabUploadTitle')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          aria-disabled="true"
          disabled
          aria-controls="cross-function-tabpanel-import"
          id="cross-function-tab-import"
          data-testid="cross-function-tab-import-portal"
          data-stub-activar="Sprint 3 H2"
          title={t('tabImportPortalDescription')}
          style={{
            appearance: 'none',
            border: 0,
            cursor: 'not-allowed',
            padding: '0 16px',
            height: '34px',
            borderRadius: 'var(--canon-radius-pill)',
            background: 'transparent',
            color: 'var(--canon-cream-2)',
            fontSize: '12.5px',
            fontWeight: 600,
            fontFamily: 'inherit',
            opacity: 0.55,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {t('tabImportPortalTitle')}
          <span
            aria-hidden="true"
            data-testid="cross-function-import-coming-soon"
            style={{
              padding: '2px 8px',
              fontSize: '10.5px',
              fontWeight: 700,
              borderRadius: 'var(--canon-radius-pill)',
              background: 'rgba(168, 85, 247, 0.16)',
              color: '#d8b4fe',
              border: '1px solid rgba(168, 85, 247, 0.32)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {t('tabImportPortalComingSoon')}
          </span>
        </button>
      </div>

      <div
        role="tabpanel"
        id="cross-function-tabpanel-upload"
        aria-labelledby="cross-function-tab-upload"
        hidden={activeTab !== 'upload'}
      >
        <p
          style={{
            margin: '0 0 10px 0',
            fontSize: '13px',
            color: 'var(--canon-cream-2)',
          }}
        >
          {t('tabUploadSubtitle')}
        </p>
        {uploadContent}
      </div>
    </div>
  );
}
