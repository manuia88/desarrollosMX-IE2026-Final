import { useLocale, useTranslations } from 'next-intl';
import { formatCurrency, formatNumber } from '@/shared/lib/i18n/formatters';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import type { MockFeasibility } from '../../types';

export interface FeasibilityCardsProps {
  readonly feasibility: MockFeasibility;
}

export function FeasibilityCards({ feasibility }: FeasibilityCardsProps) {
  const t = useTranslations('PreviewDeveloper.flow.feasibility');
  const locale = useLocale();

  const cards: ReadonlyArray<{ key: string; label: string; value: string; tone: string }> = [
    {
      key: 'roi',
      label: t('roi'),
      value: `${formatNumber(feasibility.roiPct, locale, { maximumFractionDigits: 1 })}%`,
      tone: 'var(--color-fresh-soft, #d1fae5)',
    },
    {
      key: 'absorption',
      label: t('absorption'),
      value: formatNumber(feasibility.absorptionMonths, locale),
      tone: 'var(--color-cool-soft, #cffafe)',
    },
    {
      key: 'competitors',
      label: t('competitors'),
      value: formatNumber(feasibility.competitorUnits, locale),
      tone: 'var(--color-warm-soft, #fef3c7)',
    },
    {
      key: 'price_m2',
      label: t('price_m2'),
      value: formatCurrency(feasibility.pricePerM2Mxn, 'MXN', locale, { maximumFractionDigits: 0 }),
      tone: 'var(--color-accent-soft, #eef2ff)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4, 1rem)',
      }}
    >
      {cards.map((c) => (
        <Card3D
          key={c.key}
          className="rounded-[var(--radius-lg)]"
          style={{
            padding: 'var(--space-5, 1.25rem)',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            border: '1px solid var(--color-border-subtle)',
            background: c.tone,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2, 0.5rem)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-xs, 0.75rem)',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 'var(--font-weight-semibold, 600)',
            }}
          >
            {c.label}
          </span>
          <span
            style={{
              fontSize: 'var(--text-3xl, 2rem)',
              fontWeight: 'var(--font-weight-bold, 700)',
              color: 'var(--color-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {c.value}
          </span>
        </Card3D>
      ))}
    </div>
  );
}
