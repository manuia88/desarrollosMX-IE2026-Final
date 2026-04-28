// ADR-059 — Querétaro city expansion (FASE 14.1) — landing public canon ADR-050.
// Server component. Hero + KPIs + Map placeholder + CTA + synthBadge.
// i18n keys consumidos directo via getQroI18n() — sub-agente 5 mergea Cities.queretaro
// namespace a messages/{es-MX,en-US}.json en bloque paralelo.

import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import {
  calculateQueretaroIEScores,
  getQroI18n,
  QRO_ZONES_CANON,
} from '@/features/cities/queretaro';
import { locales } from '@/shared/lib/i18n/config';
import { BlurText, FadeUp } from '@/shared/ui/motion';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const i18n = getQroI18n(locale);
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/queretaro`] as const),
  ) as Record<string, string>;

  return {
    title: i18n.heroTitle,
    description: i18n.heroSubtitle,
    alternates: {
      canonical: `/${locale}/queretaro`,
      languages,
    },
    openGraph: {
      title: i18n.heroTitle,
      description: i18n.heroSubtitle,
      type: 'website',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: i18n.heroTitle,
      description: i18n.heroSubtitle,
    },
  };
}

export default async function QueretaroLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const i18n = getQroI18n(locale);

  const allScores = calculateQueretaroIEScores();
  const pulseByZone = new Map(
    allScores.filter((s) => s.scoreType === 'pulse').map((s) => [s.scopeId, s.scoreValue]),
  );
  const top5Zones = QRO_ZONES_CANON.toSorted(
    (a, b) => (pulseByZone.get(b.scopeId) ?? 0) - (pulseByZone.get(a.scopeId) ?? 0),
  ).slice(0, 5);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: 'Querétaro',
    description: i18n.heroSubtitle,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'MX',
      addressRegion: 'Querétaro',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 20.5888,
      longitude: -100.3899,
    },
  };

  return (
    <main
      aria-label={i18n.heroTitle}
      className="relative overflow-hidden"
      style={{ background: 'var(--canon-bg)', minHeight: '100vh' }}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD SEO canon
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-6xl px-6 pt-8 text-xs"
        style={{ color: 'var(--canon-cream-2)' }}
      >
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:underline">
              DesarrollosMX
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" style={{ color: 'var(--canon-cream)' }}>
            {i18n.name}
          </li>
        </ol>
      </nav>

      <section
        aria-labelledby="qro-hero-title"
        className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-20 text-center md:py-28"
      >
        <FadeUp delay={0}>
          <DisclosurePill tone="violet">{i18n.synthBadge}</DisclosurePill>
        </FadeUp>

        <BlurText
          as="h1"
          className="font-[var(--font-display)] text-4xl font-extrabold leading-tight tracking-tight md:text-6xl"
          gradientWords={['Querétaro', 'Bajío', 'hub']}
          gradientItalic={false}
          style={{ color: 'var(--canon-cream)' }}
        >
          {i18n.heroTitle}
        </BlurText>

        <FadeUp delay={0.15}>
          <p
            id="qro-hero-title"
            className="mx-auto max-w-2xl text-base md:text-lg"
            style={{ color: 'var(--canon-cream-2)', lineHeight: 'var(--leading-relaxed)' }}
          >
            {i18n.heroSubtitle}
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <Button asChild variant="primary" size="lg" aria-label={i18n.ctaPrimary}>
            <Link href={`/${locale}/indices`}>{i18n.ctaPrimary}</Link>
          </Button>
        </FadeUp>
      </section>

      <section aria-labelledby="qro-kpi-title" className="mx-auto max-w-6xl px-6 pb-16">
        <FadeUp delay={0}>
          <h2
            id="qro-kpi-title"
            className="mb-6 font-[var(--font-display)] text-2xl font-bold tracking-tight md:text-3xl"
            style={{ color: 'var(--canon-cream)' }}
          >
            {i18n.kpiTitle}
          </h2>
        </FadeUp>

        <ul
          aria-label={i18n.zonesLabel}
          className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 lg:grid-cols-3"
        >
          {top5Zones.map((zone) => {
            const pulse = pulseByZone.get(zone.scopeId) ?? 0;
            const zoneName = locale === 'en-US' ? zone.nameEn : zone.nameEs;
            return (
              <li key={zone.scopeId}>
                <Card variant="elevated" hoverable style={{ padding: '20px' }}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3
                        className="font-[var(--font-display)] text-lg font-semibold"
                        style={{ color: 'var(--canon-cream)' }}
                      >
                        {zoneName}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--canon-cream-2)' }}>
                        {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                      </p>
                    </div>
                    <output
                      className="font-[var(--font-display)] text-3xl font-extrabold tabular-nums"
                      style={{
                        backgroundImage: 'linear-gradient(90deg, #6366F1, #EC4899)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                      }}
                      aria-label={`Pulse score ${pulse} ${zoneName}`}
                    >
                      {pulse}
                    </output>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="qro-map-title" className="mx-auto max-w-6xl px-6 pb-16">
        <FadeUp delay={0}>
          <h2
            id="qro-map-title"
            className="mb-6 font-[var(--font-display)] text-2xl font-bold tracking-tight md:text-3xl"
            style={{ color: 'var(--canon-cream)' }}
          >
            {i18n.mapTitle}
          </h2>
        </FadeUp>

        <Card
          variant="recessed"
          aria-label={i18n.mapTitle}
          data-stub="qro-map-placeholder"
          style={{
            padding: '48px 24px',
            minHeight: '320px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* STUB ADR-018 — Mapbox GL polygons activación L-NEW-CITIES-MAP-POLYGONS H2 */}
          <div className="flex flex-col items-center gap-3 text-center">
            <DisclosurePill tone="indigo">Mapbox GL · próximamente</DisclosurePill>
            <p style={{ color: 'var(--canon-cream-2)' }} className="max-w-md text-sm">
              {i18n.disclaimer}
            </p>
          </div>
        </Card>
      </section>

      <section aria-labelledby="qro-disclaimer-title" className="mx-auto max-w-6xl px-6 pb-20">
        <Card
          variant="default"
          aria-labelledby="qro-disclaimer-title"
          style={{ padding: '20px 24px' }}
        >
          <h3
            id="qro-disclaimer-title"
            className="mb-2 text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--canon-cream)' }}
          >
            {i18n.synthBadge}
          </h3>
          <p className="text-sm" style={{ color: 'var(--canon-cream-2)' }}>
            {i18n.disclaimer}
          </p>
        </Card>
      </section>
    </main>
  );
}
