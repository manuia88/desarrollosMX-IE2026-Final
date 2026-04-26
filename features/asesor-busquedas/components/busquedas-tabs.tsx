'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useBusquedasTab } from '../hooks/use-busquedas-tab';
import { TAB_KEYS, type TabKey } from '../lib/filter-schemas';

export interface BusquedasTabsProps {
  tabCounts?: Partial<Record<TabKey, number>>;
}

export function BusquedasTabs({ tabCounts }: BusquedasTabsProps) {
  const t = useTranslations('AsesorBusquedas.tabs');
  const { tab, setTab } = useBusquedasTab();

  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: 8,
    padding: '12px 28px',
    borderBottom: '1px solid var(--canon-border)',
    background: 'var(--canon-bg)',
    position: 'sticky',
    top: 54,
    zIndex: 5,
    overflowX: 'auto',
  };

  return (
    <div role="tablist" aria-label={t('ariaLabel')} style={containerStyle}>
      {TAB_KEYS.map((key) => {
        const isActive = tab === key;
        const count = tabCounts?.[key];
        const buttonStyle: CSSProperties = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          borderRadius: 'var(--canon-radius-pill)',
          border: '1px solid',
          borderColor: isActive ? 'transparent' : 'var(--canon-border-2)',
          background: isActive ? 'var(--canon-gradient)' : 'transparent',
          color: isActive ? '#fff' : 'var(--canon-cream-2)',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 200ms var(--canon-ease-out), color 200ms var(--canon-ease-out)',
        };
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls="busquedas-grid"
            onClick={() => setTab(key)}
            style={buttonStyle}
          >
            <span>{t(key)}</span>
            <span
              data-stub={count === undefined ? 'true' : undefined}
              style={{
                fontVariantNumeric: 'tabular-nums',
                opacity: 0.85,
                fontSize: 11,
              }}
            >
              {count === undefined ? '…' : count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
