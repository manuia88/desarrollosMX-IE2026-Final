'use client';

import { trpc } from '@/shared/lib/trpc/client';

export function useFeatures() {
  const query = trpc.me.features.list.useQuery(undefined, {
    staleTime: 60 * 1000,
  });
  const features = query.data ?? [];
  return {
    features,
    has: (code: string) => features.includes(code),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
