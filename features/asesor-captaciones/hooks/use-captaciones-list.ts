'use client';

import { useMemo } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import type { CaptacionesFilters } from '../lib/filter-schemas';

export interface UseCaptacionesListOptions {
  filters: CaptacionesFilters;
  enabled?: boolean;
}

export function useCaptacionesList({ filters, enabled = true }: UseCaptacionesListOptions) {
  const input = useMemo(
    () => ({
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.countryCode ? { countryCode: filters.countryCode } : {}),
      ...(filters.q ? { q: filters.q } : {}),
      limit: 120,
    }),
    [filters.status, filters.countryCode, filters.q],
  );

  return trpc.captaciones.list.useQuery(input, {
    enabled,
    staleTime: 30_000,
  });
}
