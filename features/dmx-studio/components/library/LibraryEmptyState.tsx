'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.4 — Library empty state.
// Hero centered: title + subtitle + CTA a /studio-app/projects/new.

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card, IconCircle } from '@/shared/ui/primitives/canon';

export interface LibraryEmptyStateProps {
  readonly locale: string;
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '24px',
  color: '#FFFFFF',
  letterSpacing: '-0.01em',
};

const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream-2)',
  fontSize: '14px',
  lineHeight: 1.55,
  maxWidth: '420px',
  textAlign: 'center',
};

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '42px',
  padding: '0 22px',
  borderRadius: 'var(--canon-radius-pill)',
  background: 'linear-gradient(90deg, #6366F1, #EC4899)',
  color: '#FFFFFF',
  fontFamily: 'var(--font-body)',
  fontSize: '13.5px',
  fontWeight: 600,
  textDecoration: 'none',
  boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
};

const sparklesIcon = (
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
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

export function LibraryEmptyState({ locale }: LibraryEmptyStateProps) {
  const t = useTranslations('Studio.library');

  return (
    <Card
      variant="elevated"
      className="flex flex-col items-center gap-5 px-8 py-16 text-center"
      data-testid="library-empty-state"
    >
      <IconCircle tone="violet" size="lg" icon={sparklesIcon} />
      <h2 style={titleStyle}>{t('emptyTitle')}</h2>
      <p style={subtitleStyle}>{t('emptySubtitle')}</p>
      <Link
        href={`/${locale}/studio-app/projects/new`}
        style={ctaStyle}
        data-testid="library-empty-state-cta"
      >
        {t('emptyCta')}
      </Link>
    </Card>
  );
}
