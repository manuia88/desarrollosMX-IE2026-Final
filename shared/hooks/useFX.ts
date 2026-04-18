'use client';

import { trpc } from '@/shared/lib/trpc/client';

type UseFXOptions = {
  enabled?: boolean;
};

export function useFX(amount: number, from: string, to: string, options: UseFXOptions = {}) {
  return trpc.fx.convert.useQuery(
    { amount, from, to },
    {
      enabled: options.enabled ?? (from !== to && Number.isFinite(amount)),
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );
}
