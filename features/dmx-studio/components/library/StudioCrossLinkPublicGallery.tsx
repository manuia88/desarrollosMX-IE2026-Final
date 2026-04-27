'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.4 — Cross-link banner galería pública futura.
// STUB — activar Sprint 7 H2.
// Banner muted informativo, NO link real (heuristic: "Sprint 7 H2" message).
// ADR-018 STUB compliance: no onClick, no href real, no destination active.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '16px',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream-2)',
  fontSize: '13px',
  lineHeight: 1.55,
};

const stubNoteStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream-2)',
  fontSize: '11px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const galleryIcon = (
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
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

export function StudioCrossLinkPublicGallery() {
  const t = useTranslations('Studio.library');

  // STUB — activar Sprint 7 H2: galería pública por slug del asesor todavía no
  // está disponible. Banner solo informativo, sin link activo. Cuando se active
  // se reemplaza este bloque por <Link href={`/${locale}/g/${slug}`} />.

  return (
    <Card
      variant="recessed"
      className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between"
      data-testid="library-cross-link-public-gallery"
      data-stub="sprint-7-h2"
    >
      <div className="flex items-start gap-4">
        <IconCircle tone="glass" size="md" icon={galleryIcon} />
        <div className="flex flex-col gap-1">
          <h3 style={titleStyle}>{t('publicGalleryComingTitle')}</h3>
          <p style={subtitleStyle}>{t('publicGalleryComingSubtitle')}</p>
          <span style={stubNoteStyle} data-testid="library-cross-link-stub-note">
            Sprint 7 H2
          </span>
        </div>
      </div>
      <DisclosurePill tone="violet" data-testid="library-cross-link-badge">
        {t('publicGalleryComingBadge')}
      </DisclosurePill>
    </Card>
  );
}
