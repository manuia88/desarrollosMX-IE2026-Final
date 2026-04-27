'use client';

// FASE 14.F.4 Sprint 3 — UPGRADE 9 LATERAL: post-publish notice "Tu video matchea
// con N búsquedas activas" + STUB notification badge (Resend pendiente H2).
// ADR-050 canon: surface-elevated card + accent-violet (AI signal) + DisclosurePill.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { DisclosurePill } from '@/shared/ui/primitives/canon';

export interface MatchingBusquedasNoticeProps {
  readonly projectId: string;
}

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '14px 16px',
  borderRadius: 'var(--canon-radius-card, 16px)',
  background: 'var(--surface-elevated, var(--canon-bg-2))',
  border: '1px solid var(--canon-border-2)',
  boxShadow: 'var(--shadow-canon-spotlight, 0 12px 28px rgba(99, 102, 241, 0.18))',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontSize: '14px',
  fontWeight: 700,
  color: 'var(--canon-cream)',
};

const bigNumStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '24px',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  background: 'var(--gradient-ai, linear-gradient(90deg, #6366F1, #EC4899))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const bodyStyle: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: 'var(--canon-cream-2)',
  lineHeight: 1.5,
};

export function MatchingBusquedasNotice({ projectId }: MatchingBusquedasNoticeProps) {
  const t = useTranslations('Studio.projects.matchingBusquedas');
  const query = trpc.studio.crossFunctions.findMatchingBusquedas.useQuery(
    { projectId },
    { staleTime: 30_000 },
  );

  if (query.isLoading) {
    return (
      <div style={cardStyle} aria-live="polite" aria-busy="true">
        <p style={bodyStyle}>{t('loading')}</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return null;
  }

  const { count, notificationStub } = query.data;

  if (count === 0) {
    return (
      <div style={cardStyle} aria-live="polite" data-testid="matching-busquedas-empty">
        <header style={headerStyle}>
          <h3 style={titleStyle}>{t('title')}</h3>
        </header>
        <p style={bodyStyle}>{t('empty')}</p>
      </div>
    );
  }

  return (
    <div style={cardStyle} aria-live="polite" data-testid="matching-busquedas-notice">
      <header style={headerStyle}>
        <span role="img" aria-label={t('countAria', { count })} style={bigNumStyle}>
          {count}
        </span>
        <h3 style={titleStyle}>{count === 1 ? t('titleSingular') : t('titlePlural')}</h3>
      </header>
      <p style={bodyStyle}>{t('description', { count })}</p>
      {notificationStub ? (
        <DisclosurePill tone="amber">{t('notificationStub')}</DisclosurePill>
      ) : null}
    </div>
  );
}
