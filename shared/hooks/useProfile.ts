'use client';

import { trpc } from '@/shared/lib/trpc/client';

export function useProfile() {
  return trpc.me.profile.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
