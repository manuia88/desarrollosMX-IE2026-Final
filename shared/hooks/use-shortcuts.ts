'use client';

import { useEffect } from 'react';

type Combo = string;
type Handler = (event: KeyboardEvent) => void;

export type ShortcutMap = Record<Combo, Handler>;

const ALLOWED_TARGET_TAGS = new Set(['INPUT', 'TEXTAREA']);

function shouldSkipTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ALLOWED_TARGET_TAGS.has(target.tagName);
}

function normalizeCombo(combo: string): string {
  return combo
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .sort((a, b) => {
      const order = ['cmd', 'meta', 'ctrl', 'alt', 'shift'];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    })
    .join('+');
}

function eventToCombo(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.metaKey) parts.push('meta');
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  const key = event.key.toLowerCase();
  if (!['meta', 'control', 'alt', 'shift'].includes(key)) parts.push(key);
  return normalizeCombo(parts.join('+'));
}

export function useShortcuts(shortcuts: ShortcutMap, enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;
    const normalized = new Map<string, Handler>();
    for (const combo of Object.keys(shortcuts)) {
      const handler = shortcuts[combo];
      if (handler) normalized.set(normalizeCombo(combo), handler);
    }

    const handleKeydown = (event: KeyboardEvent): void => {
      const combo = eventToCombo(event);
      const handler =
        normalized.get(combo) ??
        normalized.get(combo.replace(/^meta/, 'cmd')) ??
        normalized.get(combo.replace(/^cmd/, 'meta'));
      if (!handler) return;
      if (event.key !== 'Escape' && shouldSkipTarget(event.target)) return;
      handler(event);
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [shortcuts, enabled]);
}
