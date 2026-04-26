'use client';

import { useCallback, useEffect } from 'react';
import type { PaneKey } from '../lib/filter-schemas';
import { useDesarrollosFilters } from './use-desarrollos-filters';

export interface UseDesarrolloDrawerResult {
  openId: string | undefined;
  pane: PaneKey;
  isOpen: boolean;
  open: (id: string) => void;
  close: () => void;
  setPane: (pane: PaneKey) => void;
}

export function useDesarrolloDrawer(): UseDesarrolloDrawerResult {
  const { filters, setFilter } = useDesarrollosFilters();
  const openId = filters.drawer;
  const pane = filters.pane;
  const isOpen = Boolean(openId);

  const open = useCallback(
    (id: string) => {
      setFilter('drawer', id);
    },
    [setFilter],
  );

  const close = useCallback(() => {
    setFilter('drawer', undefined);
  }, [setFilter]);

  const setPane = useCallback(
    (next: PaneKey) => {
      setFilter('pane', next);
    },
    [setFilter],
  );

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  return { openId, pane, isOpen, open, close, setPane };
}
