'use client';

// FASE 14.F.2 Sprint 1 — DMX Studio Cross-function banner.
// Solo se renderiza cuando hay desarrollos asignados (broker_user) o captaciones activas.
// CTA pasa source=cross-function-* via query param. Sub-agente 3 implementa consumo en /projects/new.
// ADR-050 canon: Card spotlight + gradient AI signal + DisclosurePill tone="violet".

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback } from 'react';
import { Button, Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

export interface StudioCrossFunctionDeveloper {
  readonly proyectoId: string;
  readonly nombre: string | undefined;
}

export interface StudioCrossFunctionCaptacion {
  readonly id: string;
  readonly direccion: string | null;
  readonly ciudad: string | null;
  readonly precioSolicitado: number | null;
  readonly status: string;
}

export interface StudioCrossFunctionBannerProps {
  readonly locale: string;
  readonly developers: ReadonlyArray<StudioCrossFunctionDeveloper>;
  readonly captaciones: ReadonlyArray<StudioCrossFunctionCaptacion>;
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '18px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const sparkIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
);

export function StudioCrossFunctionBanner({
  locale,
  developers,
  captaciones,
}: StudioCrossFunctionBannerProps) {
  const t = useTranslations('Studio.dashboard');
  const router = useRouter();

  const hasDevelopers = developers.length > 0;
  const hasCaptaciones = captaciones.length > 0;

  const source: 'cross-function-developer' | 'cross-function-captacion' = hasDevelopers
    ? 'cross-function-developer'
    : 'cross-function-captacion';

  const handleClick = useCallback(() => {
    router.push(`/${locale}/studio-app/projects/new?source=${source}`);
  }, [router, locale, source]);

  if (!hasDevelopers && !hasCaptaciones) {
    return null;
  }

  const summary = [
    hasDevelopers ? `${developers.length} ${t('crossFunctionBannerDevelopers')}` : null,
    hasCaptaciones ? `${captaciones.length} ${t('crossFunctionBannerCaptaciones')}` : null,
  ]
    .filter((s): s is string => Boolean(s))
    .join(' · ');

  return (
    <Card
      variant="spotlight"
      className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label={t('crossFunctionBannerTitle')}
      data-testid="studio-cross-function-banner"
    >
      <div className="flex items-start gap-4">
        <IconCircle tone="violet" size="lg" icon={sparkIcon} />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 style={titleStyle}>{t('crossFunctionBannerTitle')}</h2>
            <DisclosurePill tone="violet">{t('crossFunctionBannerBadge')}</DisclosurePill>
          </div>
          <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)', lineHeight: 1.5 }}>
            {summary}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="md"
        onClick={handleClick}
        aria-label={t('crossFunctionBannerCta')}
        data-testid="studio-cross-function-cta"
      >
        {t('crossFunctionBannerCta')}
      </Button>
    </Card>
  );
}
