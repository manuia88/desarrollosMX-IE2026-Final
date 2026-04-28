'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { STUDIO_PLANS, type StudioPlanKey } from '@/features/dmx-studio/lib/stripe-products';
import { FadeUp, StaggerContainer } from '@/shared/ui/motion';
import { Button, Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

type BillingCycle = 'monthly' | 'annual';

interface PlanRow {
  readonly key: StudioPlanKey;
  readonly priceMxn: number;
  readonly highlighted: boolean;
  readonly featureKeys: ReadonlyArray<string>;
}

const PLAN_ROWS: ReadonlyArray<PlanRow> = [
  {
    key: 'founder',
    priceMxn: STUDIO_PLANS.founder.priceMxn,
    highlighted: false,
    featureKeys: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
  },
  {
    key: 'pro',
    priceMxn: STUDIO_PLANS.pro.priceMxn,
    highlighted: true,
    featureKeys: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
  },
  {
    key: 'agency',
    priceMxn: STUDIO_PLANS.agency.priceMxn,
    highlighted: false,
    featureKeys: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'],
  },
];

const ANNUAL_DISCOUNT = 0.2;

function effectivePriceMxn(monthlyMxn: number, cycle: BillingCycle): number {
  if (cycle === 'annual') {
    return Math.round(monthlyMxn * (1 - ANNUAL_DISCOUNT));
  }
  return monthlyMxn;
}

const NUMBER_STYLE: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 'var(--leading-tight)',
};

export interface PricingComparison3TierProps {
  readonly foundersEligible: boolean;
}

export function PricingComparison3Tier({ foundersEligible }: PricingComparison3TierProps) {
  const t = useTranslations('Studio.pricing');
  const tPlans = useTranslations('Studio.pricing.plans');
  const tErrors = useTranslations('Studio.errors');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [busyKey, setBusyKey] = useState<StudioPlanKey | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleStart(planKey: StudioPlanKey) {
    setBusyKey(planKey);
    setErrorMsg(null);
    try {
      // STUB ADR-018 — Stripe checkout endpoint /api/stripe/studio/checkout pendiente,
      // activar L-NEW-STUDIO-CHECKOUT-API en F14.F.2 wiring real Stripe price ids.
      const res = await fetch('/api/stripe/studio/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planKey, cycle }),
      });
      if (!res.ok) {
        throw new Error('checkout-failed');
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('checkout-no-url');
    } catch {
      setErrorMsg(tErrors('checkoutFailed'));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section
      id="pricing"
      aria-label={t('sectionLabel')}
      className="relative px-6 py-20"
      style={{ background: 'var(--canon-bg-2)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <FadeUp>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2
              className="font-[var(--font-display)] text-3xl font-extrabold tracking-tight md:text-4xl"
              style={{ color: 'var(--canon-cream)' }}
            >
              {t('title')}
            </h2>
            <p className="max-w-2xl text-sm" style={{ color: 'var(--canon-cream-2)' }}>
              {t('subtitle')}
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="flex flex-col items-center gap-3">
            <div
              role="tablist"
              aria-label={t('sectionLabel')}
              className="inline-flex items-center gap-1 p-1"
              style={{
                borderRadius: 'var(--canon-radius-pill)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--canon-border)',
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={cycle === 'monthly'}
                onClick={() => setCycle('monthly')}
                className="px-5 py-2 text-sm font-semibold transition-all"
                style={{
                  borderRadius: 'var(--canon-radius-pill)',
                  background: cycle === 'monthly' ? 'var(--canon-gradient)' : 'transparent',
                  color: cycle === 'monthly' ? '#ffffff' : 'var(--canon-cream-2)',
                }}
              >
                {t('toggleMonthly')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={cycle === 'annual'}
                onClick={() => setCycle('annual')}
                className="px-5 py-2 text-sm font-semibold transition-all"
                style={{
                  borderRadius: 'var(--canon-radius-pill)',
                  background: cycle === 'annual' ? 'var(--canon-gradient)' : 'transparent',
                  color: cycle === 'annual' ? '#ffffff' : 'var(--canon-cream-2)',
                }}
              >
                {t('toggleAnnual')}
              </button>
            </div>
            {cycle === 'annual' ? (
              <DisclosurePill tone="indigo">{t('annualSavingsLabel')}</DisclosurePill>
            ) : null}
          </div>
        </FadeUp>

        <StaggerContainer className="grid gap-6 md:grid-cols-3">
          {PLAN_ROWS.map((plan) => {
            const price = effectivePriceMxn(plan.priceMxn, cycle);
            const planName = tPlans(`${plan.key}.name`);
            const planTagline = tPlans(`${plan.key}.tagline`);
            const isPopular = plan.highlighted;
            return (
              <Card
                key={plan.key}
                variant={isPopular ? 'glow' : 'elevated'}
                className="flex flex-col gap-5 p-7"
                data-popular={isPopular ? 'true' : 'false'}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <IconCircle
                      tone={isPopular ? 'violet' : 'indigo'}
                      size="md"
                      icon={
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <title>{planName}</title>
                          <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
                        </svg>
                      }
                    />
                    <div className="flex flex-col">
                      <span
                        className="font-[var(--font-display)] text-lg font-bold"
                        style={{ color: 'var(--canon-cream)' }}
                      >
                        {planName}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--canon-cream-3)' }}>
                        {planTagline}
                      </span>
                    </div>
                  </div>
                  {isPopular ? (
                    <DisclosurePill tone="rose">{t('popularBadge')}</DisclosurePill>
                  ) : null}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-sm" style={{ color: 'var(--canon-cream-3)' }}>
                    {t('currencyPrefix')}
                  </span>
                  <span
                    className="text-5xl"
                    style={{ ...NUMBER_STYLE, color: 'var(--canon-cream)' }}
                    data-testid={`price-${plan.key}`}
                  >
                    {price.toLocaleString('es-MX')}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--canon-cream-2)' }}>
                    {t('perMonth')}
                  </span>
                </div>
                {cycle === 'annual' ? (
                  <span className="text-xs" style={{ color: 'var(--canon-cream-3)' }}>
                    {t('billedAnnually')}
                  </span>
                ) : null}

                <ul className="flex flex-col gap-2">
                  {plan.featureKeys.map((fk) => (
                    <li
                      key={fk}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: 'var(--canon-cream)' }}
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: 'var(--canon-indigo-2)' }}
                      />
                      <span>{tPlans(`${plan.key}.features.${fk}`)}</span>
                    </li>
                  ))}
                </ul>

                {foundersEligible ? (
                  <DisclosurePill tone="violet">{t('foundersCallout')}</DisclosurePill>
                ) : null}

                <Button
                  variant={isPopular ? 'primary' : 'glass'}
                  size="md"
                  onClick={() => handleStart(plan.key)}
                  disabled={busyKey !== null}
                  aria-label={`${t('ctaStart')} ${planName}`}
                >
                  {busyKey === plan.key ? t('ctaProcessing') : t('ctaStart')}
                </Button>
              </Card>
            );
          })}
        </StaggerContainer>

        {errorMsg ? (
          <div
            role="alert"
            className="mx-auto max-w-md rounded-[var(--canon-radius-inner)] border px-4 py-3 text-sm"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--canon-cream)',
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        <div className="flex justify-center">
          <DisclosurePill tone="amber">{t('disclosureLabel')}</DisclosurePill>
        </div>
      </div>
    </section>
  );
}
