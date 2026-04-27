'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.5 — Hard limit blocker (paywall canon).
// Renderable inline cuando un flow de creation debe bloquearse por límite alcanzado.
// CTA navega a customer portal (trpc.studio.subscriptions.getPortalUrl mutation) si hay
// stripe_customer_id; fallback a /studio#pricing.
// ADR-050 canon: Card spotlight, pill button gradient firma, motion ≤ 850ms.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, IconCircle } from '@/shared/ui/primitives/canon';

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '24px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  lineHeight: 1.55,
  color: 'var(--canon-cream-2)',
  maxWidth: '520px',
};

const lockIcon = (
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
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export interface UsageLimitBlockerProps {
  readonly testId?: string;
}

export function UsageLimitBlocker({ testId }: UsageLimitBlockerProps) {
  const t = useTranslations('Studio.usage');
  const portalMutation = trpc.studio.subscriptions.getPortalUrl.useMutation();

  const handleClick = (): void => {
    portalMutation.mutate(
      { returnPath: '/studio-app/usage' },
      {
        onSuccess: (data) => {
          if (typeof window !== 'undefined' && data?.url) {
            window.location.assign(data.url);
          }
        },
        onError: () => {
          if (typeof window !== 'undefined') window.location.assign('/studio#pricing');
        },
      },
    );
  };

  return (
    <Card
      variant="spotlight"
      role="alert"
      className="flex flex-col items-center gap-5 p-8 text-center"
      data-testid={testId ?? 'usage-limit-blocker'}
    >
      <IconCircle tone="rose" size="lg" icon={lockIcon} />
      <h2 style={titleStyle}>{t('blockerTitle')}</h2>
      <p style={subtitleStyle}>{t('blockerSubtitle')}</p>
      <Button
        variant="primary"
        size="md"
        onClick={handleClick}
        disabled={portalMutation.isPending}
        data-testid="usage-blocker-cta"
      >
        {t('blockerCta')}
      </Button>
    </Card>
  );
}
