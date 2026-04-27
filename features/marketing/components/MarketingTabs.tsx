'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FoldersSection } from './folders/FoldersSection';
import { LandingsSection } from './landings/LandingsSection';
import { PhotosSection } from './photos/PhotosSection';
import { PortalesSection } from './portales/PortalesSection';
import { QRSection } from './qr-codes/QRSection';
import { StudioCrossLinkBanner } from './StudioCrossLinkBanner';
import { WATemplatesSection } from './wa-templates/WATemplatesSection';

const TABS = [
  { id: 'landings', labelKey: 'tabs.landings' },
  { id: 'qr', labelKey: 'tabs.qr' },
  { id: 'wa', labelKey: 'tabs.wa' },
  { id: 'folders', labelKey: 'tabs.folders' },
  { id: 'photos', labelKey: 'tabs.photos' },
  { id: 'portales', labelKey: 'tabs.portales' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export interface MarketingTabsProps {
  locale: string;
}

export function MarketingTabs({ locale }: MarketingTabsProps) {
  const t = useTranslations('Marketing');
  const [activeTab, setActiveTab] = useState<TabId>('landings');

  return (
    <div
      className="flex flex-col gap-6 px-4 py-6 md:px-6"
      style={{ background: 'var(--canon-bg)' }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1
          className="text-2xl font-extrabold tracking-tight text-[var(--canon-white-pure)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('list.title')}
        </h1>
      </header>

      <nav
        aria-label={t('list.tabs')}
        className="flex flex-wrap gap-2 border-b border-[color:rgba(255,255,255,0.08)] pb-1"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                isActive
                  ? 'bg-[image:linear-gradient(90deg,_#6366f1,_#ec4899)] text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)]'
                  : 'text-[color:rgba(255,255,255,0.65)] hover:text-[var(--canon-white-pure)]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </nav>

      <section className="flex flex-col gap-6">
        {activeTab === 'landings' && <LandingsSection locale={locale} />}
        {activeTab === 'qr' && <QRSection />}
        {activeTab === 'wa' && <WATemplatesSection />}
        {activeTab === 'folders' && <FoldersSection />}
        {activeTab === 'photos' && <PhotosSection />}
        {activeTab === 'portales' && <PortalesSection />}
      </section>

      <StudioCrossLinkBanner locale={locale} />
    </div>
  );
}
