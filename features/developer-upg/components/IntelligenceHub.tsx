'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon';

interface UpgTool {
  readonly id: string;
  readonly upgNumber: number;
  readonly i18nKey: string;
  readonly href: string | null;
  readonly disabled?: boolean;
}

const UPG_TOOLS: readonly UpgTool[] = [
  {
    id: 'demandHeatmap',
    upgNumber: 81,
    i18nKey: 'demandHeatmap',
    href: '/desarrolladores/analytics',
  },
  {
    id: 'pricingAdvisor',
    upgNumber: 82,
    i18nKey: 'pricingAdvisor',
    href: '/desarrolladores/analytics',
  },
  { id: 'competitive', upgNumber: 83, i18nKey: 'competitive', href: '/desarrolladores/analytics' },
  {
    id: 'benchmark',
    upgNumber: 84,
    i18nKey: 'benchmark',
    href: '/desarrolladores/intelligence/benchmark',
  },
  {
    id: 'feasibility',
    upgNumber: 85,
    i18nKey: 'feasibility',
    href: '/desarrolladores/intelligence/feasibility/new',
  },
  { id: 'terrenos', upgNumber: 86, i18nKey: 'terrenos', href: null, disabled: true },
  {
    id: 'manzana',
    upgNumber: 87,
    i18nKey: 'manzana',
    href: '/desarrolladores/intelligence/manzana',
  },
  {
    id: 'oportunidad',
    upgNumber: 88,
    i18nKey: 'oportunidad',
    href: '/desarrolladores/intelligence/oportunidad',
  },
  {
    id: 'proyeccion',
    upgNumber: 89,
    i18nKey: 'proyeccion',
    href: '/desarrolladores/intelligence/proyeccion',
  },
];

interface IntelligenceHubProps {
  readonly locale: string;
}

export function IntelligenceHub({ locale }: IntelligenceHubProps) {
  const t = useTranslations('dev.upg');

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight">
          {t('title')}
        </h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('hubSubtitle')}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UPG_TOOLS.map((tool) => {
          const label = t(`tools.${tool.i18nKey}`);
          const description = t(`hubDescriptions.${tool.i18nKey}`);
          if (tool.disabled || !tool.href) {
            return (
              <Card key={tool.id} variant="recessed" className="flex flex-col gap-3 p-5 opacity-60">
                <span className="text-xs font-mono uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
                  UPG {tool.upgNumber}
                </span>
                <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
                  {label}
                </h2>
                <p className="text-sm text-[color:var(--color-text-secondary)]">{description}</p>
                <span className="mt-auto inline-flex w-fit items-center rounded-full border border-[color:var(--color-border-subtle)] px-2 py-1 text-[11px] uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
                  {t('hubPendingH2')}
                </span>
              </Card>
            );
          }
          return (
            <Link
              key={tool.id}
              href={`/${locale}${tool.href}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-violet)]"
            >
              <Card
                variant="elevated"
                className="flex h-full flex-col gap-3 p-5 transition-transform hover:translate-y-[-2px]"
              >
                <span className="text-xs font-mono uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
                  UPG {tool.upgNumber}
                </span>
                <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
                  {label}
                </h2>
                <p className="text-sm text-[color:var(--color-text-secondary)]">{description}</p>
                <span className="mt-auto text-sm font-semibold text-[color:var(--accent-violet)]">
                  {t('hubOpenCta')} →
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
