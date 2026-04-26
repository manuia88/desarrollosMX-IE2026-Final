'use client';

import { trpc } from '@/shared/lib/trpc/client';

export function useCaptacionDetail(id: string | undefined) {
  return trpc.captaciones.get.useQuery(
    { id: id ?? '' },
    {
      enabled: Boolean(id),
      staleTime: 15_000,
    },
  );
}
