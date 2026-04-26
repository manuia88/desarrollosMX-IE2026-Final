'use client';

import { useCallback } from 'react';
import { type TabKey, tabEnum } from '../lib/filter-schemas';
import { useDesarrollosFilters } from './use-desarrollos-filters';

export interface UseDesarrollosTabResult {
  tab: TabKey;
  setTab: (next: TabKey) => void;
}

export function useDesarrollosTab(): UseDesarrollosTabResult {
  const { filters, setFilter } = useDesarrollosFilters();
  const tab = tabEnum.catch('own').parse(filters.tab);
  const setTab = useCallback(
    (next: TabKey) => {
      setFilter('tab', next);
    },
    [setFilter],
  );
  return { tab, setTab };
}
