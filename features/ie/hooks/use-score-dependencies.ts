'use client';

import { trpc } from '@/shared/lib/trpc/client';

const STALE_TIME_SWR = 10 * 60 * 1000;

export function useScoreDependencies(
  scoreId: string | undefined,
  options?: { readonly enabled?: boolean },
) {
  const enabled = Boolean(scoreId) && (options?.enabled ?? true);
  return trpc.ieScores.getDependencies.useQuery(
    { score_id: scoreId ?? 'F01' },
    {
      enabled,
      staleTime: STALE_TIME_SWR,
      refetchOnWindowFocus: false,
    },
  );
}
