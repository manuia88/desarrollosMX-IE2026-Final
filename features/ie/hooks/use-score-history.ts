'use client';

import { trpc } from '@/shared/lib/trpc/client';

const STALE_TIME_1H = 60 * 60 * 1000;

export function useScoreHistory(
  zoneId: string | undefined,
  scoreCode: string | undefined,
  range: { readonly from: string; readonly to: string },
  options?: { readonly countryCode?: string; readonly enabled?: boolean },
) {
  const enabled = Boolean(zoneId) && Boolean(scoreCode) && (options?.enabled ?? true);
  return trpc.ieScores.getHistory.useQuery(
    {
      zone_id: zoneId ?? '00000000-0000-4000-8000-000000000000',
      score_code: scoreCode ?? 'F01',
      country_code: options?.countryCode ?? 'MX',
      from: range.from,
      to: range.to,
    },
    {
      enabled,
      staleTime: STALE_TIME_1H,
    },
  );
}
