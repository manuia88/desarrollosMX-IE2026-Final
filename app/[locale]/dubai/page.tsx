// FASE 14.1 — Dubai landing page (ADR-059 §Step 6 + ADR-018 señal 3 STUB UI).
// Server component async + getTranslations('Cities.dubai').
// Disclosure visible: synthBadge + comingSoonBadge (señal 3 STUB UI).
// Multi-currency dual: USD primary + AED secondary via getDubaiPricing.
// Canon ADR-050 visual + buttons rounded-full obligatorio.

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DUBAI_ZONES_CANON } from '@/features/cities/dubai/data-loader';
import {
  AED_USD_PEG,
  type DubaiPricing,
  FALLBACK_USD_MXN_RATE,
} from '@/features/cities/dubai/multi-currency';
import { defaultLocale, locales } from '@/shared/lib/i18n/config';

interface PageProps {
  readonly params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return [{ locale: defaultLocale }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Cities.dubai' });
  const languages = Object.fromEntries(locales.map((l) => [l, `/${l}/dubai`] as const)) as Record<
    string,
    string
  >;
  return {
    title: t('heroTitle'),
    description: t('heroSubtitle'),
    alternates: {
      canonical: `/${locale}/dubai`,
      languages,
    },
    openGraph: {
      title: t('heroTitle'),
      description: t('heroSubtitle'),
      type: 'website',
      url: `/${locale}/dubai`,
    },
  };
}

const SAMPLE_USD_AMOUNT = 500_000;

function pricingFallback(amountUsd: number): DubaiPricing {
  return {
    usd: amountUsd,
    aed: amountUsd * AED_USD_PEG,
    mxn: amountUsd * FALLBACK_USD_MXN_RATE,
  };
}

export default async function DubaiLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Cities.dubai' });

  // Multi-currency dual display sample (USD primary, AED secondary).
  // fx_rates BD puede no estar populated en build → fallback explicit.
  const pricing = pricingFallback(SAMPLE_USD_AMOUNT);

  const zones = DUBAI_ZONES_CANON.slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-500/30">
            {t('comingSoonBadge')}
          </span>
          <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-500/30">
            {t('synthBadge')}
          </span>
        </div>
        <h1 className="font-bold text-4xl tracking-tight md:text-5xl">{t('heroTitle')}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t('heroSubtitle')}</p>
      </header>

      <section className="mb-12 rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-2xl">{t('kpiTitle')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-muted-foreground text-sm">{t('priceUsdLabel')}</p>
            <p className="font-bold text-3xl tabular-nums">
              ${pricing.usd.toLocaleString('en-US')}
            </p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-muted-foreground text-sm">{t('priceAedLabel')}</p>
            <p className="font-bold text-3xl tabular-nums">
              {pricing.aed.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-semibold text-2xl">{t('zonesLabel')}</h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {zones.map((zone) => (
            <li
              key={zone.slug}
              className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
            >
              <p className="font-semibold">{zone.name_en}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dubai-map-title" className="mb-12">
        <h2 id="dubai-map-title" className="mb-4 font-semibold text-2xl">
          {t('mapTitle')}
        </h2>
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed bg-muted/30 text-muted-foreground">
          <p>{t('comingSoonBadge')}</p>
        </div>
      </section>

      <section className="mb-12">
        <button
          type="button"
          disabled
          aria-label={t('ctaPrimary')}
          className="inline-flex cursor-not-allowed items-center rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 px-8 py-3 font-semibold text-white opacity-60"
        >
          {t('ctaPrimary')}
        </button>
      </section>

      <footer className="border-t pt-6 text-muted-foreground text-sm">
        <p>{t('disclaimer')}</p>
      </footer>
    </main>
  );
}
