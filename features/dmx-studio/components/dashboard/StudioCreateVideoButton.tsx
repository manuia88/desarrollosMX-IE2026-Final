'use client';

// FASE 14.F.2 Sprint 1 — DMX Studio "Crear video" CTA.
// ADR-050 canon: pill button + brand gradient firma #6366F1 → #EC4899.
// Click navega a /studio-app/projects/new (handler crea project draft, sub-agente 3).
// Soporta `source` query param para flujos cross-function (desarrollos / captaciones).

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { Button, type ButtonProps } from '@/shared/ui/primitives/canon';

export interface StudioCreateVideoButtonProps {
  readonly locale: string;
  readonly source?: 'cross-function-developer' | 'cross-function-captacion';
  readonly variant?: ButtonProps['variant'];
  readonly size?: ButtonProps['size'];
  readonly labelKey?: 'createVideoButton' | 'emptyStateCta';
  readonly testId?: string;
}

export function StudioCreateVideoButton({
  locale,
  source,
  variant = 'primary',
  size = 'lg',
  labelKey = 'createVideoButton',
  testId,
}: StudioCreateVideoButtonProps) {
  const t = useTranslations('Studio.dashboard');
  const router = useRouter();

  const handleClick = useCallback(() => {
    const target = source
      ? `/${locale}/studio-app/projects/new?source=${source}`
      : `/${locale}/studio-app/projects/new`;
    router.push(target);
  }, [router, locale, source]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      aria-label={t(labelKey)}
      data-testid={testId}
    >
      {t(labelKey)}
    </Button>
  );
}
