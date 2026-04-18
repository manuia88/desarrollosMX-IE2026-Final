'use client';

import { useEffect, useMemo } from 'react';
import { type CopilotContext, useCopilotStore } from './useCopilotStore';

export function useCopilotContext(context: CopilotContext | null): void {
  const setContext = useCopilotStore((s) => s.setContext);

  const serialized = useMemo(() => (context ? JSON.stringify(context) : null), [context]);

  useEffect(() => {
    const parsed = serialized ? (JSON.parse(serialized) as CopilotContext) : null;
    setContext(parsed);
    return () => {
      setContext(null);
    };
  }, [serialized, setContext]);
}
