'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useMemo } from 'react';
import { useBusquedaDrawer } from '../hooks/use-busqueda-drawer';
import type { BusquedaSummary } from '../lib/busquedas-loader';
import { TAB_KEYS, type TabKey } from '../lib/filter-schemas';
import { BusquedaCard } from './busqueda-card';

export interface BusquedasKanbanProps {
  busquedas: BusquedaSummary[];
}

// Read-only kanban view (no drag-drop H1). Status changes via drawer/menu actions.
// Mirrors PipelineKanban shape from captaciones for visual canon consistency.
export function BusquedasKanban({ busquedas }: BusquedasKanbanProps) {
  const t = useTranslations('AsesorBusquedas.kanban');
  const { open } = useBusquedaDrawer();

  const grouped = useMemo(() => {
    const acc: Record<TabKey, BusquedaSummary[]> = {
      activa: [],
      pausada: [],
      cerrada: [],
    };
    for (const b of busquedas) {
      acc[b.status].push(b);
    }
    return acc;
  }, [busquedas]);

  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${TAB_KEYS.length}, minmax(280px, 1fr))`,
    gap: 12,
    padding: '16px 28px 80px',
    overflowX: 'auto',
  };

  const columnStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 12,
    borderRadius: 'var(--canon-radius-card)',
    background: 'var(--canon-bg)',
    border: '1px dashed var(--canon-border-2)',
    minHeight: 240,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottom: '1px solid var(--canon-border)',
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--canon-cream)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const countStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--mod-busquedas)',
    fontWeight: 700,
    fontSize: 11,
  };

  return (
    <section aria-label={t('ariaLabel')} style={containerStyle}>
      {TAB_KEYS.map((status) => {
        const cardsInCol = grouped[status];
        return (
          <section key={status} style={columnStyle} data-kanban-column={status}>
            <header style={headerStyle}>
              <span>{t(`stage.${status}`)}</span>
              <span style={countStyle}>{cardsInCol.length}</span>
            </header>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {cardsInCol.map((b) => (
                <li key={b.id}>
                  <BusquedaCard busqueda={b} onOpen={open} />
                </li>
              ))}
              {cardsInCol.length === 0 ? (
                <li
                  style={{
                    padding: '24px 8px',
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'var(--canon-cream-3)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {t('emptyColumn')}
                </li>
              ) : null}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
