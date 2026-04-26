'use client';

import { trpc } from '@/shared/lib/trpc/client';

// NOTE TS2589 workaround:
// trpc v11 + Zod schemas con muchos optional() + TanStack Query v5 disparan
// "Type instantiation is excessively deep" cuando se infiere `variables` en el
// callback `onSuccess` de useMutation. Solución: NO usar onSuccess inline aquí —
// los componentes invalidan manualmente via `utils.captaciones.list.invalidate()`
// después de `mutateAsync` o en `useEffect(() => { ... }, [mutation.isSuccess])`.
// Pattern canon mantiene type inference en el caller sin explosión.

export function useCreateCaptacion() {
  return trpc.captaciones.create.useMutation();
}

export function useUpdateCaptacion() {
  return trpc.captaciones.update.useMutation();
}

export function useAdvanceCaptacionStage() {
  return trpc.captaciones.advanceStage.useMutation();
}

export function useCloseCaptacion() {
  return trpc.captaciones.close.useMutation();
}

export function usePauseCaptacion() {
  return trpc.captaciones.pause.useMutation();
}

export function useCaptacionMutations() {
  const create = useCreateCaptacion();
  const update = useUpdateCaptacion();
  const advanceStage = useAdvanceCaptacionStage();
  const close = useCloseCaptacion();
  const pause = usePauseCaptacion();
  return { create, update, advanceStage, close, pause };
}

// Convenience helper for components: after a mutation succeeds, invalidate
// the relevant queries. Components call this in onSuccess of mutateAsync or
// in a useEffect watching isSuccess.
export function useInvalidateCaptacionQueries() {
  const utils = trpc.useUtils();
  return {
    invalidateAll: () => {
      utils.captaciones.list.invalidate();
    },
    invalidateOne: (id: string) => {
      utils.captaciones.get.invalidate({ id });
      utils.captaciones.list.invalidate();
    },
  };
}
