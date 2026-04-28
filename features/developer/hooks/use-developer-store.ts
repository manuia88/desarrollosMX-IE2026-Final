'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type DeveloperState = {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
};

export const useDeveloperStore = create<DeveloperState>()(
  persist(
    (set) => ({
      currentProjectId: null,
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
    }),
    { name: 'dmx-developer-store' },
  ),
);
