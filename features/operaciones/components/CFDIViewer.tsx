'use client';

import { useTranslations } from 'next-intl';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export function CFDIViewer() {
  // STUB ADR-018 — activar en FASE 22 H2 con [dependencia: Facturapi.io contrato + Finkok PAC]
  const t = useTranslations('Operaciones');
  return (
    <Card variant="recessed" className="p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-[var(--canon-white-pure)]">{t('cfdi.title')}</h3>
        <DisclosurePill tone="violet">{t('cfdi.badge')}</DisclosurePill>
      </div>
      <p className="mt-2 text-xs text-[var(--canon-cream-2)]">{t('cfdi.description')}</p>
      <p className="mt-1 text-xs text-[var(--canon-cream-3)]">{t('cfdi.fase22')}</p>
    </Card>
  );
}
