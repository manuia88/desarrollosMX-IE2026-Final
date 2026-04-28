'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon';

export type MarketPulseCardProps = {
  readonly narrative: string | null;
  readonly source: string | null;
  readonly isPlaceholder: boolean;
};

export function MarketPulseCard({ narrative, source, isPlaceholder }: MarketPulseCardProps) {
  const t = useTranslations('dev.dashboard.marketPulse');

  return (
    <Card className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--canon-cream-3)' }}
        >
          {t('eyebrow')}
        </span>
        {isPlaceholder ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
            style={{
              background: 'rgba(99,102,241,0.18)',
              color: '#a5b4fc',
            }}
            title={t('disclosureTitle')}
          >
            {t('disclosureBadge')}
          </span>
        ) : null}
      </header>

      <h2
        className="text-base font-semibold"
        style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
      >
        {t('title')}
      </h2>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--canon-cream-2)' }}>
        {narrative ?? t('placeholder')}
      </p>

      {source ? (
        <p className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
          {t('sourceLabel')} {source}
        </p>
      ) : null}
    </Card>
  );
}
