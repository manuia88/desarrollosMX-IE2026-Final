'use client';

import type { CSSProperties } from 'react';
import { FadeUp, StaggerContainer } from '@/shared/ui/motion';
import { useBusquedaDrawer } from '../hooks/use-busqueda-drawer';
import { useBusquedasFilters } from '../hooks/use-busquedas-filters';
import type { BusquedaSummary } from '../lib/busquedas-loader';
import type { TabKey } from '../lib/filter-schemas';
import { BusquedaCard } from './busqueda-card';
import { EmptyState } from './empty-state';

export interface BusquedasGridProps {
  busquedas: BusquedaSummary[];
  tab: TabKey;
  reason?: string | null;
}

export function BusquedasGrid({ busquedas, tab, reason }: BusquedasGridProps) {
  const { open } = useBusquedaDrawer();
  const { hasActiveFilters, clear } = useBusquedasFilters();

  if (busquedas.length === 0) {
    return (
      <EmptyState
        tab={tab}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clear}
        reason={reason ?? null}
      />
    );
  }

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 18,
    padding: '16px 28px 80px',
  };

  return (
    <StaggerContainer staggerMs={60}>
      <ul
        id="busquedas-grid"
        aria-label="Búsquedas"
        style={{ ...gridStyle, listStyle: 'none', margin: 0 }}
      >
        {busquedas.map((b) => (
          <FadeUp key={b.id} as="li">
            <BusquedaCard busqueda={b} onOpen={open} />
          </FadeUp>
        ))}
      </ul>
    </StaggerContainer>
  );
}
