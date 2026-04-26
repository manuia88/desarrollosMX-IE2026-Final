'use client';

// STUB ADR-018 — Spatial search keybind shipped, integración Mapbox/Leaflet pendiente.
// Activar L-NEW-SPATIAL en F2 implementation cuando se incorpore mapa.
// UI consumer debe renderizar badge "Beta" en el sidebar resultante.

import { useCallback, useEffect, useState } from 'react';

export interface SpatialSearchResult {
  lat: number;
  lng: number;
  label: string;
}

export interface UseSpatialSearchOptions {
  onSelect: (result: SpatialSearchResult) => void;
  enableHotkey?: boolean;
  hotkey?: string;
}

export interface UseSpatialSearchReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  isStub: true;
}

export function useSpatialSearch(options: UseSpatialSearchOptions): UseSpatialSearchReturn {
  const { enableHotkey = true, hotkey = 'k' } = options;
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!enableHotkey) return;
    const handler = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === hotkey.toLowerCase()) {
        event.preventDefault();
        setIsOpen(true);
      } else if (event.key === 'Escape') {
        setIsOpen((prev) => (prev ? false : prev));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enableHotkey, hotkey]);

  return { isOpen, open, close, isStub: true };
}
