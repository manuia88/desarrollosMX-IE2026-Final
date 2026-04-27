'use client';

// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Cross-function 3: banner discreto al pie del dashboard asesor invitando a
// unirse a la lista de espera de DMX Studio. Render condicional según señales
// de actividad (asesor con tracción suficiente para ser early adopter).

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { DisclosurePill } from '@/shared/ui/primitives/canon/disclosure-pill';

export interface StudioCrossPromoBannerProps {
  readonly contactosCount: number;
  readonly operacionesCerradasCount: number;
  readonly desarrollosActivosCount: number;
  readonly locale: string;
}

const CONTACTOS_THRESHOLD = 5 as const;
const DESARROLLOS_THRESHOLD = 5 as const;

function shouldShowBanner({
  contactosCount,
  operacionesCerradasCount,
  desarrollosActivosCount,
}: Pick<
  StudioCrossPromoBannerProps,
  'contactosCount' | 'operacionesCerradasCount' | 'desarrollosActivosCount'
>): boolean {
  return (
    contactosCount > CONTACTOS_THRESHOLD ||
    operacionesCerradasCount > 0 ||
    desarrollosActivosCount > DESARROLLOS_THRESHOLD
  );
}

export function StudioCrossPromoBanner({
  contactosCount,
  operacionesCerradasCount,
  desarrollosActivosCount,
  locale,
}: StudioCrossPromoBannerProps) {
  const t = useTranslations('AsesorDashboard.studioBanner');

  if (!shouldShowBanner({ contactosCount, operacionesCerradasCount, desarrollosActivosCount })) {
    return null;
  }

  const sectionStyle: CSSProperties = {
    position: 'relative',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--canon-card-border-default)',
    borderRadius: 'var(--canon-radius-card)',
    boxShadow: 'var(--shadow-canon-spotlight)',
    padding: '20px 24px',
    overflow: 'hidden',
    isolation: 'isolate',
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '18px',
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
    color: 'var(--canon-white-pure)',
    margin: 0,
  };

  const subtitleStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    lineHeight: 1.45,
    color: 'var(--canon-cream-2)',
    margin: 0,
  };

  const ctaStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    padding: '0 20px',
    borderRadius: 'var(--canon-radius-pill)',
    backgroundImage: 'linear-gradient(90deg, #6366F1, #EC4899)',
    color: '#ffffff',
    fontFamily: 'var(--font-body)',
    fontSize: '13.5px',
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
    transition:
      'transform var(--canon-duration-fast) var(--canon-ease-out), box-shadow var(--canon-duration-fast) var(--canon-ease-out)',
  };

  const auraStyle: CSSProperties = {
    position: 'absolute',
    inset: '-20%',
    background: 'var(--gradient-ai)',
    opacity: 0.08,
    filter: 'blur(48px)',
    pointerEvents: 'none',
    zIndex: 0,
  };

  return (
    <section aria-label={t('aria')} data-testid="studio-cross-promo-banner" style={sectionStyle}>
      <div aria-hidden="true" style={auraStyle} />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <DisclosurePill tone="violet">{t('badge')}</DisclosurePill>
          <h2 style={titleStyle}>{t('title')}</h2>
        </div>
        <p style={subtitleStyle}>{t('subtitle')}</p>
        <div>
          <Link
            href={`/${locale}/studio`}
            aria-label={t('ctaAria')}
            data-testid="studio-cross-promo-cta"
            style={ctaStyle}
            className="studio-cross-promo-cta"
          >
            {t('cta')}
          </Link>
        </div>
      </div>
      <style>{`
        .studio-cross-promo-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(236, 72, 153, 0.35);
        }
        .studio-cross-promo-cta:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.45);
        }
        @media (prefers-reduced-motion: reduce) {
          .studio-cross-promo-cta {
            transition: none;
          }
          .studio-cross-promo-cta:hover {
            transform: none;
          }
        }
      `}</style>
    </section>
  );
}
