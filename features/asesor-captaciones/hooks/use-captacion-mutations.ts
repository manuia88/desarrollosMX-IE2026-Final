'use client';

import { trpc } from '@/shared/lib/trpc/client';

export function useCreateCaptacion() {
  const utils = trpc.useUtils();
  return trpc.captaciones.create.useMutation({
    onSuccess: () => {
      utils.captaciones.list.invalidate();
    },
  });
}

export function useUpdateCaptacion() {
  const utils = trpc.useUtils();
  return trpc.captaciones.update.useMutation({
    onSuccess: (_data, variables) => {
      utils.captaciones.get.invalidate({ id: variables.id });
      utils.captaciones.list.invalidate();
    },
  });
}

export function useAdvanceCaptacionStage() {
  const utils = trpc.useUtils();
  return trpc.captaciones.advanceStage.useMutation({
    onSuccess: (_data, variables) => {
      utils.captaciones.get.invalidate({ id: variables.id });
      utils.captaciones.list.invalidate();
    },
  });
}

export function useCloseCaptacion() {
  const utils = trpc.useUtils();
  return trpc.captaciones.close.useMutation({
    onSuccess: (_data, variables) => {
      utils.captaciones.get.invalidate({ id: variables.id });
      utils.captaciones.list.invalidate();
    },
  });
}

export function usePauseCaptacion() {
  const utils = trpc.useUtils();
  return trpc.captaciones.pause.useMutation({
    onSuccess: (_data, variables) => {
      utils.captaciones.get.invalidate({ id: variables.id });
      utils.captaciones.list.invalidate();
    },
  });
}

export function useCaptacionMutations() {
  const create = useCreateCaptacion();
  const update = useUpdateCaptacion();
  const advanceStage = useAdvanceCaptacionStage();
  const close = useCloseCaptacion();
  const pause = usePauseCaptacion();
  return { create, update, advanceStage, close, pause };
}
