'use client';

import type { CSSProperties } from 'react';
import { FadeUp, StaggerContainer } from '@/shared/ui/motion';
import { useDesarrolloDrawer } from '../hooks/use-desarrollo-drawer';
import { useDesarrollosFilters } from '../hooks/use-desarrollos-filters';
import type { DesarrolloSummary } from '../lib/desarrollos-loader';
import type { TabKey } from '../lib/filter-schemas';
import { DesarrolloCard } from './desarrollo-card';
import { EmptyState } from './empty-state';

export interface DesarrollosGridProps {
  projects: DesarrolloSummary[];
  tab: TabKey;
}

export function DesarrollosGrid({ projects, tab }: DesarrollosGridProps) {
  const { open } = useDesarrolloDrawer();
  const { hasActiveFilters, clear } = useDesarrollosFilters();

  if (projects.length === 0) {
    return <EmptyState tab={tab} hasActiveFilters={hasActiveFilters} onClearFilters={clear} />;
  }

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 18,
    padding: '16px 28px 80px',
  };

  return (
    <StaggerContainer staggerMs={60}>
      <ul
        id="desarrollos-grid"
        aria-label="Desarrollos"
        style={{ ...gridStyle, listStyle: 'none', margin: 0 }}
      >
        {projects.map((project) => (
          <FadeUp key={project.id} as="li">
            <DesarrolloCard project={project} onOpen={open} />
          </FadeUp>
        ))}
      </ul>
    </StaggerContainer>
  );
}
