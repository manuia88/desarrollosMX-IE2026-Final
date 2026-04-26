'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { type BusquedasFilters, filtersSchema } from '../lib/filter-schemas';

function paramsToObject(sp: URLSearchParams): Record<string, string> {
  const obj: Record<string, string> = {};
  sp.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

export interface UseBusquedasFiltersResult {
  filters: BusquedasFilters;
  setFilter: <K extends keyof BusquedasFilters>(
    key: K,
    value: BusquedasFilters[K] | undefined | null,
  ) => void;
  clear: () => void;
  hasActiveFilters: boolean;
}

const ALWAYS_DEFAULT_KEYS = new Set<keyof BusquedasFilters>(['tab', 'sort']);

export function useBusquedasFilters(): UseBusquedasFiltersResult {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const filters = useMemo<BusquedasFilters>(() => {
    const raw = paramsToObject(new URLSearchParams(sp.toString()));
    const parsed = filtersSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    return filtersSchema.parse({});
  }, [sp]);

  const setFilter = useCallback(
    <K extends keyof BusquedasFilters>(key: K, value: BusquedasFilters[K] | undefined | null) => {
      const next = new URLSearchParams(sp.toString());
      if (value === undefined || value === null || value === '') {
        next.delete(String(key));
      } else {
        next.set(String(key), String(value));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, sp],
  );

  const clear = useCallback(() => {
    const next = new URLSearchParams();
    for (const k of ALWAYS_DEFAULT_KEYS) {
      const v = sp.get(String(k));
      if (v) next.set(String(k), v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, sp]);

  const hasActiveFilters = useMemo(() => {
    return [filters.q, filters.countryCode, filters.tipo, filters.operacion].some(
      (v) => v !== undefined && v !== null && v !== '',
    );
  }, [filters]);

  return { filters, setFilter, clear, hasActiveFilters };
}
