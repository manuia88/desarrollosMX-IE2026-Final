'use client';

// FASE 14.F.4 Sprint 3 — Regenerate Copy 3 Variations button.
// Single mutation trigger studio.copyPack.regenerateOutput. Loading shimmer canon.
// ADR-050: pill button (rounded-full via Button primitive), translateY-only hover.

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';
import { toast } from '@/shared/ui/primitives/toast';

export interface RegenerateButtonProps {
  readonly copyOutputId: string;
  readonly onSuccess?: (
    variations: ReadonlyArray<{ id: string; tone: string; content: string }>,
  ) => void;
  readonly disabled?: boolean;
}

export function RegenerateButton({
  copyOutputId,
  onSuccess,
  disabled = false,
}: RegenerateButtonProps) {
  const t = useTranslations('Studio.copyPack');
  const utils = trpc.useUtils();
  const regenerate = trpc.studio.copyPack.regenerateOutput.useMutation({
    onSuccess: async (data) => {
      toast.success(t('regenerateSuccessToast'));
      await utils.studio.copyPack.getByProject.invalidate();
      const items = (data.variations ?? []) as ReadonlyArray<{
        id: string | null;
        tone: string | null;
        content: string | null;
      }>;
      const normalized = items
        .filter(
          (v): v is { id: string; tone: string; content: string } =>
            typeof v.id === 'string' && typeof v.tone === 'string' && typeof v.content === 'string',
        )
        .map((v) => ({ id: v.id, tone: v.tone, content: v.content }));
      onSuccess?.(normalized);
    },
    onError: () => {
      toast.error(t('regenerateErrorToast'));
    },
  });

  const handleClick = useCallback(() => {
    regenerate.mutate({ copyOutputId });
  }, [copyOutputId, regenerate]);

  const isPending = regenerate.isPending;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={disabled || isPending}
      aria-label={t('regenerateAriaLabel')}
      data-testid={`copy-pack-regenerate-${copyOutputId}`}
    >
      {isPending ? t('regeneratingLabel') : t('regenerateCta')}
    </Button>
  );
}
