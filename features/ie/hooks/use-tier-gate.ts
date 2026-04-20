'use client';

import { trpc } from '@/shared/lib/trpc/client';

const STALE_TIME_15M = 15 * 60 * 1000;

export function useTierGate(
  scoreId: string | undefined,
  options?: { readonly countryCode?: string; readonly enabled?: boolean },
) {
  const enabled = Boolean(scoreId) && (options?.enabled ?? true);
  return trpc.ieScores.getTierGate.useQuery(
    {
      score_id: scoreId ?? 'F01',
      country_code: options?.countryCode ?? 'MX',
    },
    {
      enabled,
      staleTime: STALE_TIME_15M,
      refetchOnWindowFocus: false,
    },
  );
}
