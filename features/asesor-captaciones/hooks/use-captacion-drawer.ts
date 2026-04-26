'use client';

import { useCallback, useEffect } from 'react';
import { useFilterState } from './use-filter-state';

export interface UseCaptacionDrawerResult {
  openId: string | undefined;
  isOpen: boolean;
  open: (id: string) => void;
  close: () => void;
}

export function useCaptacionDrawer(): UseCaptacionDrawerResult {
  const { filters, setFilter } = useFilterState();
  const openId = filters.drawer;
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

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  return { openId, isOpen, open, close };
}
