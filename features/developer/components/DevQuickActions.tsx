'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Button } from '@/shared/ui/primitives/canon';

interface QuickAction {
  readonly id: 'uploadDoc' | 'createLanding' | 'emitCfdi' | 'sendCommunique' | 'startCampaign';
  readonly href: string;
}

// STUB ADR-018 — activar FASE 15 (rutas inventario/marketing/contabilidad/comunicaciones aún no shipped)
const ACTIONS: ReadonlyArray<QuickAction> = [
  // STUB ADR-018 uploadDoc — activar FASE 15
  { id: 'uploadDoc', href: '/desarrolladores/inventario/documentos/nuevo' },
  // STUB ADR-018 createLanding — activar FASE 15
  { id: 'createLanding', href: '/desarrolladores/marketing/landings/nuevo' },
  // STUB ADR-018 emitCfdi — activar FASE 15
  { id: 'emitCfdi', href: '/desarrolladores/contabilidad/cfdis/nuevo' },
  // STUB ADR-018 sendCommunique — activar FASE 15
  { id: 'sendCommunique', href: '/desarrolladores/comunicaciones/nuevo' },
  // STUB ADR-018 startCampaign — activar FASE 15
  { id: 'startCampaign', href: '/desarrolladores/marketing/campanas/nuevo' },
];

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontSize: 14,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--canon-cream-2)',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 10px',
  borderRadius: 9999,
  fontFamily: 'var(--font-body)',
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  background: 'rgba(148, 163, 184, 0.18)',
  color: 'var(--canon-cream-3)',
  border: '1px solid var(--canon-border-2)',
};

const actionWrapperStyle: CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 4,
};

export function DevQuickActions(): React.ReactElement {
  const t = useTranslations('dev.quickActions');

  return (
    <section aria-label={t('title')} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={titleStyle}>{t('title')}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {ACTIONS.map((action) => (
          <div key={action.id} style={actionWrapperStyle}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled
              aria-disabled="true"
              aria-label={t(`actions.${action.id}`)}
              data-stub-href={action.href}
            >
              {t(`actions.${action.id}`)}
            </Button>
            <span style={badgeStyle}>{t('comingSoon')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
