'use client';

import { create } from 'zustand';

type SidebarState = {
  isExpanded: boolean;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  setExpanded: (value: boolean) => void;
};

export const useSidebarStore = create<SidebarState>((set) => ({
  isExpanded: false,
  expand: () => set({ isExpanded: true }),
  collapse: () => set({ isExpanded: false }),
  toggle: () => set((s) => ({ isExpanded: !s.isExpanded })),
  setExpanded: (value) => set({ isExpanded: value }),
}));
