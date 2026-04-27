'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSidebarHoverOptions {
  collapsed?: number;
  expanded?: number;
  delayMs?: number;
  closeDelayMs?: number;
  disabled?: boolean;
  persistKey?: string;
}

export interface UseSidebarHoverReturn {
  width: number;
  expanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocusCapture: () => void;
  onBlurCapture: () => void;
}

const DEFAULT_PERSIST_KEY = 'asesor-sidebar-expanded';

function readPersisted(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writePersisted(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* noop */
  }
}

export function useSidebarHover(options: UseSidebarHoverOptions = {}): UseSidebarHoverReturn {
  const collapsed = options.collapsed ?? 60;
  const expanded = options.expanded ?? 240;
  const delayMs = options.delayMs ?? 250;
  const closeDelayMs = options.closeDelayMs ?? 400;
  const disabled = options.disabled ?? false;
  const persistKey = options.persistKey ?? DEFAULT_PERSIST_KEY;

  const [isExpanded, setIsExpanded] = useState(false);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (disabled) return;
    if (readPersisted(persistKey)) setIsExpanded(true);
  }, [disabled, persistKey]);

  useEffect(() => {
    if (disabled) return;
    writePersisted(persistKey, isExpanded);
  }, [isExpanded, disabled, persistKey]);

  const clear = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    enterTimer.current = null;
    exitTimer.current = null;
  }, []);

  useEffect(() => () => clear(), [clear]);

  useEffect(() => {
    if (disabled && isExpanded) {
      setIsExpanded(false);
      clear();
    }
  }, [disabled, isExpanded, clear]);

  const onMouseEnter = useCallback(() => {
    if (disabled) return;
    if (exitTimer.current) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    enterTimer.current = setTimeout(() => setIsExpanded(true), delayMs);
  }, [disabled, delayMs]);

  const onMouseLeave = useCallback(() => {
    if (disabled) return;
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    exitTimer.current = setTimeout(() => setIsExpanded(false), closeDelayMs);
  }, [disabled, closeDelayMs]);

  const onFocusCapture = useCallback(() => {
    if (disabled) return;
    setIsExpanded(true);
  }, [disabled]);

  const onBlurCapture = useCallback(() => {
    if (disabled) return;
    exitTimer.current = setTimeout(() => setIsExpanded(false), closeDelayMs);
  }, [disabled, closeDelayMs]);

  return {
    width: isExpanded ? expanded : collapsed,
    expanded: isExpanded,
    onMouseEnter,
    onMouseLeave,
    onFocusCapture,
    onBlurCapture,
  };
}
