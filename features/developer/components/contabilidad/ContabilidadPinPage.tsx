'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon';

const PIN_SECTIONS = [
  'dashboard',
  'invoices',
  'payments',
  'reconciliation',
  'payouts',
  'reports',
] as const;

export function ContabilidadPinPage() {
  const t = useTranslations('dev.contabilidad');

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--canon-cream-2)' }}>
          {t('subtitle')}
        </p>
      </header>

      <Card className="space-y-4 p-6">
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.32)',
            color: '#fcd34d',
          }}
        >
          {t('phaseBanner')}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(['revenueMonth', 'commissionsPending', 'payoutsNext'] as const).map((kpi) => (
            <Card key={kpi} className="p-5" variant="recessed">
              <div
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ color: 'var(--canon-cream-3)' }}
              >
                {t(`kpis.${kpi}.label`)}
              </div>
              <div
                className="mt-2 text-3xl font-bold tabular-nums"
                style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
              >
                $0
              </div>
              <div className="mt-1 text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
                {t(`kpis.${kpi}.hint`)}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
          {t('sectionsTitle')}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PIN_SECTIONS.map((s) => (
            <li
              key={s}
              className="flex items-center justify-between rounded-xl px-4 py-3 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--canon-cream-2)',
              }}
            >
              <span>{t(`sections.${s}`)}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc' }}
              >
                {t('comingSoon')}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-2 p-6 text-sm" style={{ color: 'var(--canon-cream-2)' }}>
        <div className="font-semibold" style={{ color: 'var(--canon-cream)' }}>
          {t('onboardingTitle')}
        </div>
        <p>{t('onboardingBody')}</p>
        <a
          href="/docs/contabilidad-onboarding"
          className="inline-block rounded-full px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(90deg, #6366F1, #EC4899)' }}
        >
          {t('onboardingCta')}
        </a>
      </Card>

      <span
        className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
        style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc' }}
        title={t('disclosureTitle')}
      >
        {t('disclosureBadge')}
      </span>
    </div>
  );
}
