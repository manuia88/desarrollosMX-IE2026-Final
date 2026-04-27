'use client';

import { useTranslations } from 'next-intl';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';

const STEPS = [
  'no_subido',
  'en_revision',
  'aprobado',
  'contrato_enviado',
  'contrato_firmado',
] as const;

export function LegalFlowIndicator() {
  // STUB ADR-018 — activar en FASE 18 H2 con [dependencia: módulo /legal + Mifiel NOM-151]
  const t = useTranslations('Operaciones');
  return (
    <Card variant="recessed" className="p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-[var(--canon-white-pure)]">{t('legal.title')}</h3>
        <DisclosurePill tone="violet">{t('legal.badge')}</DisclosurePill>
      </div>
      <ol className="mt-3 grid gap-2 md:grid-cols-5" aria-label={t('legal.stepsLabel')}>
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-2 rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--canon-cream-2)]"
          >
            <span
              aria-hidden
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--canon-indigo-3)] text-[10px] font-semibold text-[var(--canon-bg)]"
            >
              {index + 1}
            </span>
            {t(`legal.steps.${step}`)}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-[var(--canon-cream-3)]">{t('legal.fase18')}</p>
    </Card>
  );
}
