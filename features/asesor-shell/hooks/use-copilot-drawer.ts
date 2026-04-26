'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

export type CopilotDrawerKey = 'voice' | 'copilot' | 'briefing' | 'vibe' | 'help';

type State = {
  active: CopilotDrawerKey | null;
  open: (key: CopilotDrawerKey) => void;
  close: () => void;
  toggle: (key: CopilotDrawerKey) => void;
};

export const useCopilotDrawerStore = create<State>((set, get) => ({
  active: null,
  open: (key) => set({ active: key }),
  close: () => set({ active: null }),
  toggle: (key) => set({ active: get().active === key ? null : key }),
}));

export interface UseCopilotDrawerReturn {
  active: CopilotDrawerKey | null;
  open: (key: CopilotDrawerKey) => void;
  close: () => void;
  toggle: (key: CopilotDrawerKey) => void;
}

export function useCopilotDrawer(): UseCopilotDrawerReturn {
  const active = useCopilotDrawerStore((s) => s.active);
  const open = useCopilotDrawerStore((s) => s.open);
  const close = useCopilotDrawerStore((s) => s.close);
  const toggle = useCopilotDrawerStore((s) => s.toggle);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && useCopilotDrawerStore.getState().active !== null) {
        useCopilotDrawerStore.getState().close();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  return { active, open, close, toggle };
}
