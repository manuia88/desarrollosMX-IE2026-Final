'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSidebarHoverOptions {
  collapsed?: number;
  expanded?: number;
  delayMs?: number;
  closeDelayMs?: number;
  disabled?: boolean;
}

export interface UseSidebarHoverReturn {
  width: number;
  expanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocusCapture: () => void;
  onBlurCapture: () => void;
}

export function useSidebarHover(options: UseSidebarHoverOptions = {}): UseSidebarHoverReturn {
  const collapsed = options.collapsed ?? 60;
  const expanded = options.expanded ?? 240;
  const delayMs = options.delayMs ?? 250;
  const closeDelayMs = options.closeDelayMs ?? 100;
  const disabled = options.disabled ?? false;

  const [isExpanded, setIsExpanded] = useState(false);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
