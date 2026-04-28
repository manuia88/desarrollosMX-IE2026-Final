'use client';

// FASE 14.F.11 Sprint 10 BIBLIA Tarea 10.5 — Bug fix P1.1.
// Route-level error boundary canon (Next.js 16 App Router) para todo el subtree
// /studio-app. Captura errores server-side + client-side render y ofrece retry.
// ADR-050 canon: Card elevated, pill button, brand gradient solo en primary CTA,
// translateY-only hover, motion ≤ 850ms (default Card transition).

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect } from 'react';
import { Button, Card, IconCircle } from '@/shared/ui/primitives/canon';

export interface StudioAppRouteErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '24px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream-2)',
  fontSize: '14px',
  lineHeight: 1.55,
  maxWidth: '520px',
};

const codeStyle: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '11.5px',
  color: 'var(--canon-cream-2)',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-pill)',
  padding: '4px 10px',
  letterSpacing: '0.02em',
};

const supportHintStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream-2)',
  fontSize: '12.5px',
  lineHeight: 1.5,
};

const alertIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
  </svg>
);

export default function StudioAppRouteError({ error, reset }: StudioAppRouteErrorProps) {
  const t = useTranslations('Studio.routeError');
  const router = useRouter();
  const params = useParams();
  const localeRaw = params?.locale;
  const locale = typeof localeRaw === 'string' ? localeRaw : 'es-MX';

  useEffect(() => {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[Studio route error]', error.message, error.digest);
    }
  }, [error]);

  const handleGoDashboard = () => {
    router.push(`/${locale}/studio-app`);
  };

  return (
    <main
      role="alert"
      aria-live="assertive"
      data-testid="studio-route-error"
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col items-center justify-center gap-6 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <Card variant="elevated" className="flex flex-col items-center gap-5 px-8 py-12 text-center">
        <IconCircle tone="rose" size="lg" icon={alertIcon} />
        <h1 style={headingStyle}>{t('title')}</h1>
        <p style={subtitleStyle}>{t('description')}</p>
        {error.digest ? (
          <span style={codeStyle} data-testid="studio-route-error-code">
            {t('codeLabel')}: {error.digest}
          </span>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={reset}
            data-testid="studio-route-error-retry"
          >
            {t('retry')}
          </Button>
          <Button
            type="button"
            variant="glass"
            size="md"
            onClick={handleGoDashboard}
            data-testid="studio-route-error-go-dashboard"
          >
            {t('goDashboard')}
          </Button>
        </div>
        <p style={supportHintStyle}>{t('supportHint')}</p>
      </Card>
    </main>
  );
}
