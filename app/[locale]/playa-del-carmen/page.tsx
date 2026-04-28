import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PLAYA_ZONES_CANON } from '@/features/cities/playa-del-carmen';
import { locales } from '@/shared/lib/i18n/config';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

interface PageProps {
  readonly params: Promise<{ readonly locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Cities.playaDelCarmen' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/playa-del-carmen`] as const),
  ) as Record<string, string>;

  return {
    title: t('heroTitle'),
    description: t('heroSubtitle'),
    alternates: {
      canonical: `/${locale}/playa-del-carmen`,
      languages,
    },
    openGraph: {
      title: t('heroTitle'),
      description: t('heroSubtitle'),
      type: 'website',
      locale,
    },
  };
}

export default async function PlayaDelCarmenLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Cities.playaDelCarmen' });

  const localeIsEn = locale.startsWith('en');
  const topZones = PLAYA_ZONES_CANON.slice(0, 5);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
      <header className="flex flex-col gap-4">
        <DisclosurePill tone="amber" aria-label={t('synthBadge')}>
          {t('synthBadge')}
        </DisclosurePill>
        <h1
          aria-label={t('heroTitle')}
          className="font-[var(--font-heading)] text-4xl font-extrabold tracking-tight text-[color:var(--canon-cream)] md:text-5xl"
          style={{
            backgroundImage: 'linear-gradient(90deg, #6366f1, #ec4899)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t('heroTitle')}
        </h1>
        <p className="max-w-2xl text-base text-[color:var(--canon-cream-2)] md:text-lg">
          {t('heroSubtitle')}
        </p>
      </header>

      <section aria-labelledby="playa-kpis-heading" className="flex flex-col gap-4">
        <h2
          id="playa-kpis-heading"
          className="font-[var(--font-heading)] text-2xl font-semibold text-[color:var(--canon-cream)]"
        >
          {t('kpiTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topZones.map((zone) => (
            <Card
              key={zone.scope_id}
              variant="elevated"
              hoverable
              className="flex flex-col gap-3 p-6"
            >
              <span className="text-xs uppercase tracking-wider text-[color:var(--canon-cream-2)]">
                {t('zonesLabel')}
              </span>
              <h3 className="font-[var(--font-heading)] text-xl font-semibold text-[color:var(--canon-cream)]">
                {localeIsEn ? zone.name_en : zone.name_es}
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-sm text-[color:var(--canon-cream-2)]">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider opacity-70">lat</dt>
                  <dd
                    className="font-[var(--font-body)] tabular-nums"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {zone.lat.toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider opacity-70">lng</dt>
                  <dd
                    className="font-[var(--font-body)] tabular-nums"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {zone.lng.toFixed(4)}
                  </dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="playa-map-heading" className="flex flex-col gap-4">
        <h2
          id="playa-map-heading"
          className="font-[var(--font-heading)] text-2xl font-semibold text-[color:var(--canon-cream)]"
        >
          {t('mapTitle')}
        </h2>
        <section
          id="playa-map"
          aria-label={t('mapTitle')}
          data-mapbox-zones="playa-del-carmen"
          data-zone-count={PLAYA_ZONES_CANON.length}
          className="flex min-h-[320px] items-center justify-center rounded-[var(--canon-radius-lg)] border border-[color:var(--canon-border)] text-sm text-[color:var(--canon-cream-2)]"
          style={{
            background: 'var(--surface-recessed)',
            boxShadow: 'var(--shadow-canon-rest)',
          }}
        >
          {t('mapTitle')}
        </section>
      </section>

      <section className="flex flex-col items-start gap-4">
        <Button asChild variant="primary" size="lg">
          <Link href={`/${locale}/desarrollos?city=playa-del-carmen`}>{t('ctaPrimary')}</Link>
        </Button>
        <p className="max-w-2xl text-xs text-[color:var(--canon-cream-2)] opacity-80">
          {t('disclaimer')}
        </p>
      </section>
    </main>
  );
}
