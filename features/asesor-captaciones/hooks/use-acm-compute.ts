'use client';

import { trpc } from '@/shared/lib/trpc/client';

export function useAcmCompute() {
  const utils = trpc.useUtils();
  return trpc.captaciones.runAcm.useMutation({
    onSuccess: (_data, variables) => {
      utils.captaciones.get.invalidate({ id: variables.id });
      utils.captaciones.list.invalidate();
    },
  });
}
