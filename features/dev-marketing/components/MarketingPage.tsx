'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/shared/ui/primitives/cn';

const TABS = [
  'campaigns',
  'attribution',
  'videoAi',
  'landings',
  'kit',
  'portales',
  'analytics',
] as const;

export type MarketingTab = (typeof TABS)[number];

const TabCampaigns = dynamic(() => import('./tabs/TabCampaigns').then((m) => m.TabCampaigns), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const TabAttribution = dynamic(
  () => import('./tabs/TabAttribution').then((m) => m.TabAttribution),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const TabVideoAi = dynamic(() => import('./tabs/TabVideoAi').then((m) => m.TabVideoAi), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const TabLandings = dynamic(() => import('./tabs/TabLandings').then((m) => m.TabLandings), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const TabKit = dynamic(() => import('./tabs/TabKit').then((m) => m.TabKit), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const TabPortales = dynamic(() => import('./tabs/TabPortales').then((m) => m.TabPortales), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const TabAnalytics = dynamic(() => import('./tabs/TabAnalytics').then((m) => m.TabAnalytics), {
  ssr: false,
  loading: () => <TabSkeleton />,
});

function TabSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="grid h-[480px] place-items-center rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] text-sm text-[color:var(--color-text-secondary)]"
    >
      cargando…
    </div>
  );
}

export function MarketingPage() {
  const t = useTranslations('dev.marketing');
  const [tab, setTab] = useState<MarketingTab>('campaigns');

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--color-text-primary)]">
            {t('title')}
          </h1>
        </div>
      </header>

      <div
        role="tablist"
        aria-label={t('title')}
        className="flex flex-wrap items-center gap-2 border-b border-[color:var(--color-border-subtle)] pb-2"
      >
        {TABS.map((id) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`marketing-tab-${id}`}
              id={`marketing-tabbtn-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[color:var(--color-accent-mint)] text-[color:var(--color-text-on-accent)]'
                  : 'text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]',
              )}
            >
              {t(`tabs.${id}`)}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`marketing-tab-${tab}`}
        aria-labelledby={`marketing-tabbtn-${tab}`}
        className="space-y-4"
      >
        {tab === 'campaigns' && <TabCampaigns />}
        {tab === 'attribution' && <TabAttribution />}
        {tab === 'videoAi' && <TabVideoAi />}
        {tab === 'landings' && <TabLandings />}
        {tab === 'kit' && <TabKit />}
        {tab === 'portales' && <TabPortales />}
        {tab === 'analytics' && <TabAnalytics />}
      </div>
    </section>
  );
}
