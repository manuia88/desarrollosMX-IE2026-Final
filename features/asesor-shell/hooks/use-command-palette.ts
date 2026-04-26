'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

const RECENTS_KEY = 'asesor-shell-cmdk-recents';
const MAX_RECENTS = 5;

function readRecents(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function writeRecents(items: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  } catch {
    // ignore storage failures (Safari private mode, quota)
  }
}

type State = {
  isOpen: boolean;
  recents: string[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  addRecent: (id: string) => void;
  clearRecents: () => void;
  hydrated: boolean;
  hydrate: () => void;
};

export const useCommandPaletteStore = create<State>((set, get) => ({
  isOpen: false,
  recents: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ recents: readRecents(), hydrated: true });
  },
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  addRecent: (id: string) => {
    const next = [id, ...get().recents.filter((r) => r !== id)].slice(0, MAX_RECENTS);
    writeRecents(next);
    set({ recents: next });
  },
  clearRecents: () => {
    writeRecents([]);
    set({ recents: [] });
  },
}));

export interface UseCommandPaletteReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  recents: string[];
  addRecent: (id: string) => void;
  clearRecents: () => void;
}

export function useCommandPalette(): UseCommandPaletteReturn {
  const isOpen = useCommandPaletteStore((s) => s.isOpen);
  const recents = useCommandPaletteStore((s) => s.recents);
  const open = useCommandPaletteStore((s) => s.open);
  const close = useCommandPaletteStore((s) => s.close);
  const toggle = useCommandPaletteStore((s) => s.toggle);
  const addRecent = useCommandPaletteStore((s) => s.addRecent);
  const clearRecents = useCommandPaletteStore((s) => s.clearRecents);
  const hydrate = useCommandPaletteStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    const handleKeydown = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [toggle, hydrate]);

  return { isOpen, open, close, toggle, recents, addRecent, clearRecents };
}
