'use client';

import { useEffect, useMemo, useRef } from 'react';
import { type CopilotSuggestion, useCopilotStore } from './useCopilotStore';

const POLL_INTERVAL_MS = 30_000;

export function useCopilotSuggestions(): void {
  const context = useCopilotStore((s) => s.context);
  const setSuggestions = useCopilotStore((s) => s.setSuggestions);

  const serialized = useMemo(() => (context ? JSON.stringify(context) : null), [context]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSuggestions = async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch('/api/ai/suggestions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ context: serialized ? JSON.parse(serialized) : null }),
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: CopilotSuggestion[] };
        if (!cancelled && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      } catch {
        // aborted / network — ignore
      }
    };

    void fetchSuggestions();
    const interval = setInterval(fetchSuggestions, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [serialized, setSuggestions]);
}
