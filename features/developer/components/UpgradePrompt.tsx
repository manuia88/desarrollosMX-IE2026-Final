'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export type UpgradePlan = 'starter' | 'pro' | 'enterprise';

export type UpgradePromptProps = {
  readonly plan: UpgradePlan;
  readonly feature?: string;
};

// STUB ADR-018 — Stripe Checkout shipping FASE 23.
// L-NEW-FEATURE-GATE-STRIPE-CHECKOUT-WIRED — agendar wire to /api/stripe/checkout-session
export function UpgradePrompt({ plan, feature }: UpgradePromptProps) {
  const t = useTranslations('dev.featureGate.upgradePrompt');

  const onClick = useCallback(() => {
    // STUB — activar Stripe Checkout en FASE 23.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dmx:upgrade-intent', {
          detail: { plan, feature: feature ?? null },
        }),
      );
    }
  }, [plan, feature]);

  return (
    <Card className="flex flex-col gap-4 p-6 text-center">
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: 'linear-gradient(135deg, #6366F1, #EC4899)',
          color: '#fff',
        }}
        aria-hidden="true"
      >
        ★
      </div>
      <h3
        className="text-base font-semibold"
        style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
      >
        {t('title')}
      </h3>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--canon-cream-2)' }}>
        {t('freeNote', { plan })}
      </p>
      <button
        type="button"
        onClick={onClick}
        className="mx-auto rounded-full px-5 py-2 text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(90deg, #6366F1, #EC4899)' }}
      >
        {t('ctaUpgrade', { plan })}
      </button>
      <span
        className="mx-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
        style={{
          background: 'rgba(99,102,241,0.18)',
          color: '#a5b4fc',
        }}
        title={t('disclosureTitle')}
      >
        {t('disclosureBadge')}
      </span>
    </Card>
  );
}
