'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon';

const PORTALS = ['inmuebles24', 'easybroker', 'mercadolibre'] as const;

export function TabPortales() {
  const t = useTranslations('dev.marketing.portales');

  return (
    <Card className="space-y-3 p-4">
      <header>
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <p className="text-xs text-[color:var(--color-text-secondary)]">{t('subtitle')}</p>
      </header>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PORTALS.map((portal) => (
          <li
            key={portal}
            className="space-y-1 rounded-md border border-[color:var(--color-border-subtle)] p-3 text-xs"
          >
            <p className="font-medium text-[color:var(--color-text-primary)]">
              {t(`portal.${portal}.name`)}
            </p>
            <p className="text-[11px] text-[color:var(--color-text-secondary)]">
              {t(`portal.${portal}.description`)}
            </p>
            <span className="inline-block rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-900">
              {t('configPending')}
            </span>
          </li>
        ))}
      </ul>
      <p className="rounded-md border border-violet-200 bg-violet-50 p-2 text-[11px] text-violet-900">
        {t('reusedFromAsesor')}
      </p>
    </Card>
  );
}
