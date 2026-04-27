'use client';

// FASE 14.F.3 Sprint 2 — Brand Kit logo delete confirm button.
// Confirma con window.confirm + ejecuta deleteLogo mutation. Refresca via onDeleted callback.

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';

export interface BrandKitDeleteLogoButtonProps {
  readonly onDeleted: () => void;
  readonly disabled?: boolean;
}

export function BrandKitDeleteLogoButton({ onDeleted, disabled }: BrandKitDeleteLogoButtonProps) {
  const t = useTranslations('Studio.brandKit');
  const deleteLogo = trpc.studio.brandKit.deleteLogo.useMutation({
    onSuccess() {
      onDeleted();
    },
  });

  const handleClick = useCallback(() => {
    if (typeof window === 'undefined') return;
    const confirmed = window.confirm(t('logoDeleteConfirm'));
    if (!confirmed) return;
    deleteLogo.mutate();
  }, [deleteLogo, t]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={disabled || deleteLogo.isPending}
      aria-busy={deleteLogo.isPending}
      aria-label={t('logoDeleteCta')}
    >
      {t('logoDeleteCta')}
    </Button>
  );
}
