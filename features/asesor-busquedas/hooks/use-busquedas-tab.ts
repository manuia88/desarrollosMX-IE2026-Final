'use client';

import { useCallback } from 'react';
import { type TabKey, tabEnum } from '../lib/filter-schemas';
import { useBusquedasFilters } from './use-busquedas-filters';

export interface UseBusquedasTabResult {
  tab: TabKey;
  setTab: (next: TabKey) => void;
}

export function useBusquedasTab(): UseBusquedasTabResult {
  const { filters, setFilter } = useBusquedasFilters();
  const tab = tabEnum.catch('activa').parse(filters.tab);
  const setTab = useCallback(
    (next: TabKey) => {
      setFilter('tab', next);
    },
    [setFilter],
  );
  return { tab, setTab };
}
