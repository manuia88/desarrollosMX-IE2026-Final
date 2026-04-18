'use client';

import { create } from 'zustand';

export type CopilotMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: number;
};

export type CopilotContext = {
  module: string;
  entity?: { type: string; id: string };
  visibleData?: Record<string, unknown>;
};

export type CopilotSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

type CopilotState = {
  isOpen: boolean;
  initialPrompt: string | null;
  messages: CopilotMessage[];
  context: CopilotContext | null;
  suggestions: CopilotSuggestion[];
  open: (prompt?: string) => void;
  close: () => void;
  toggle: () => void;
  clearInitialPrompt: () => void;
  pushMessage: (m: CopilotMessage) => void;
  setMessages: (m: CopilotMessage[]) => void;
  setContext: (c: CopilotContext | null) => void;
  setSuggestions: (s: CopilotSuggestion[]) => void;
};

export const useCopilotStore = create<CopilotState>((set) => ({
  isOpen: false,
  initialPrompt: null,
  messages: [],
  context: null,
  suggestions: [],
  open: (prompt) => set({ isOpen: true, initialPrompt: prompt ?? null }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  clearInitialPrompt: () => set({ initialPrompt: null }),
  pushMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setMessages: (m) => set({ messages: m }),
  setContext: (c) => set({ context: c }),
  setSuggestions: (s) => set({ suggestions: s }),
}));
