'use client';

import { trpc } from '@/shared/lib/trpc/client';

const STALE_TIME_5M = 5 * 60 * 1000;

export function useZoneScores(
  zoneId: string | undefined,
  options?: {
    readonly scoreCodes?: readonly string[];
    readonly countryCode?: string;
    readonly periodDate?: string;
    readonly enabled?: boolean;
  },
) {
  const enabled = Boolean(zoneId) && (options?.enabled ?? true);
  return trpc.ieScores.list.useQuery(
    {
      zone_id: zoneId ?? '00000000-0000-4000-8000-000000000000',
      country_code: options?.countryCode ?? 'MX',
      ...(options?.scoreCodes !== undefined ? { score_codes: options.scoreCodes as string[] } : {}),
      ...(options?.periodDate !== undefined ? { period_date: options.periodDate } : {}),
    },
    {
      enabled,
      staleTime: STALE_TIME_5M,
    },
  );
}

export function useZoneScoresByLevel(
  zoneId: string | undefined,
  options?: {
    readonly levels?: readonly number[];
    readonly countryCode?: string;
    readonly periodDate?: string;
    readonly enabled?: boolean;
  },
) {
  const enabled = Boolean(zoneId) && (options?.enabled ?? true);
  return trpc.ieScores.getByZone.useQuery(
    {
      zone_id: zoneId ?? '00000000-0000-4000-8000-000000000000',
      country_code: options?.countryCode ?? 'MX',
      ...(options?.levels !== undefined ? { levels: options.levels as number[] } : {}),
      ...(options?.periodDate !== undefined ? { period_date: options.periodDate } : {}),
    },
    {
      enabled,
      staleTime: STALE_TIME_5M,
    },
  );
}
