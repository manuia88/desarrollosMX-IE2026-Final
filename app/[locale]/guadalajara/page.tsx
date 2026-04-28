// FASE 14.1 — Guadalajara city expansion (ADR-059 §Step 4).
// Server component público. Hero + KPIs + Map placeholder + CTA + DisclosurePill synth.
// Canon ADR-050 visual + ADR-018 transparency disclosure (synth data flag).

import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { GDL_ZONES_CANON } from '@/features/cities/guadalajara/data-loader';
import { GDL_I18N_EN_US, GDL_I18N_ES_MX } from '@/features/cities/guadalajara/i18n-keys';
import { defaultLocale, locales } from '@/shared/lib/i18n/config';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

interface PageProps {
  readonly params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return [{ locale: defaultLocale }];
}

function getCityCopy(locale: string): Readonly<Record<string, string>> {
  return locale === 'en-US' ? GDL_I18N_EN_US : GDL_I18N_ES_MX;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getCityCopy(locale);
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/guadalajara`] as const),
  ) as Record<string, string>;
  return {
    title: copy['Cities.guadalajara.heroTitle'],
    description: copy['Cities.guadalajara.heroSubtitle'],
    alternates: {
      canonical: `/${locale}/guadalajara`,
      languages,
    },
  };
}

const heroTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 'clamp(34px, 5vw, 52px)',
  letterSpacing: '-0.02em',
  lineHeight: 1.05,
  color: '#FFFFFF',
};

const heroSubtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream-2)',
  fontSize: '15.5px',
  lineHeight: 1.55,
  maxWidth: 720,
};

const sectionTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '22px',
  letterSpacing: '-0.01em',
  color: 'var(--canon-cream)',
};

const zoneLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  fontSize: '14px',
  color: 'var(--canon-cream)',
};

const zoneMetaStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11.5px',
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.01em',
};

const disclaimerStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--canon-cream-2)',
  lineHeight: 1.5,
  maxWidth: 720,
};

const TOP_5_ZONES = GDL_ZONES_CANON.slice(0, 5);

export default async function GuadalajaraLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getCityCopy(locale);

  return (
    <main
      aria-label={copy['Cities.guadalajara.heroTitle']}
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)', minHeight: '100vh' }}
    >
      <header className="flex flex-col gap-4">
        <DisclosurePill tone="amber" aria-label={copy['Cities.guadalajara.synthBadge']}>
          {copy['Cities.guadalajara.synthBadge']}
        </DisclosurePill>
        <h1 style={heroTitleStyle}>{copy['Cities.guadalajara.heroTitle']}</h1>
        <p style={heroSubtitleStyle}>{copy['Cities.guadalajara.heroSubtitle']}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild variant="primary" size="lg">
            <Link
              href={`/${locale}/desarrollos?city=guadalajara`}
              aria-label={copy['Cities.guadalajara.ctaPrimary']}
            >
              {copy['Cities.guadalajara.ctaPrimary']}
            </Link>
          </Button>
        </div>
      </header>

      <section aria-labelledby="gdl-kpi-title" className="flex flex-col gap-4">
        <h2 id="gdl-kpi-title" style={sectionTitleStyle}>
          {copy['Cities.guadalajara.kpiTitle']}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOP_5_ZONES.map((zone) => (
            <Card key={zone.slug} variant="elevated" className="flex flex-col gap-2 p-5">
              <span style={zoneLabelStyle}>{zone.name_es}</span>
              <span style={zoneMetaStyle}>
                {zone.lat.toFixed(4)}°, {zone.lng.toFixed(4)}°
              </span>
              <span style={zoneMetaStyle}>{zone.scope_id}</span>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="gdl-map-title" className="flex flex-col gap-4">
        <h2 id="gdl-map-title" style={sectionTitleStyle}>
          {copy['Cities.guadalajara.mapTitle']}
        </h2>
        <Card variant="recessed" className="flex flex-col gap-3 p-6">
          <p style={zoneMetaStyle} aria-live="polite">
            {copy['Cities.guadalajara.zonesLabel']}: {GDL_ZONES_CANON.length}
          </p>
          <ul
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
          >
            {GDL_ZONES_CANON.map((zone) => (
              <li key={zone.slug} style={zoneMetaStyle}>
                <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)', marginRight: 6 }}>
                  ●
                </span>
                {zone.name_es}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <footer className="flex flex-col gap-3">
        <DisclosurePill tone="amber">{copy['Cities.guadalajara.synthBadge']}</DisclosurePill>
        <p style={disclaimerStyle}>{copy['Cities.guadalajara.disclaimer']}</p>
      </footer>
    </main>
  );
}
