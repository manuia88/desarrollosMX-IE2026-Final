import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AgentsTable } from '@/features/preview-ux/components/masterbroker/AgentsTable';
import { KpiDashboard } from '@/features/preview-ux/components/masterbroker/KpiDashboard';
import { Leaderboard } from '@/features/preview-ux/components/masterbroker/Leaderboard';
import { TerritoryMap } from '@/features/preview-ux/components/masterbroker/TerritoryMap';
import { PreviewCta } from '@/features/preview-ux/components/PreviewCta';
import { PreviewPageTracker } from '@/features/preview-ux/components/PreviewPageTracker';
import { getNarvarteMock, getPreviewMockData } from '@/features/preview-ux/lib/mock-data-provider';
import { AlphaZoneCard } from '@/features/trend-genome/components/AlphaZoneCard';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PreviewMasterBroker' });
  const title = t('meta_title');
  const description = t('meta_description');
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PreviewMasterBrokerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('PreviewMasterBroker');

  const narvarte = getNarvarteMock();
  const bundle = getPreviewMockData('masterbroker');
  const agents = bundle.agents;

  // Alerts: first 2 alpha zones (highlighted as opportunities for the broker team).
  const alertZones = narvarte.alphaZones.slice(0, 2);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: t('meta_title'),
    description: t('meta_description'),
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    inLanguage: locale,
  };

  return (
    <main
      style={{
        padding: 'var(--space-8, 2rem)',
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-10, 3rem)',
      }}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD SEO markup rendered server-side only
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PreviewPageTracker persona="masterbroker" />

      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4, 1rem)',
          textAlign: 'center',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-accent-strong)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {t('hero.eyebrow')}
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--text-4xl, 2.5rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: 'var(--color-text-primary)',
            maxWidth: 820,
          }}
        >
          {t('hero.title')}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            maxWidth: 720,
          }}
        >
          {t('hero.subtitle')}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3, 0.75rem)' }}>
          <PreviewCta persona="masterbroker" ctaId="hero_primary" href="#agents" variant="primary">
            {t('hero.cta_primary')}
          </PreviewCta>
        </div>
      </header>

      <section
        id="agents"
        aria-labelledby="agents-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="agents-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.agents.title')}
        </h2>
        <AgentsTable agents={agents} />
      </section>

      <section
        aria-labelledby="territory-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="territory-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.territory.title')}
        </h2>
        <TerritoryMap agents={agents} />
      </section>

      <section
        aria-labelledby="kpis-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="kpis-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.kpis.title')}
        </h2>
        <KpiDashboard agents={agents} />
      </section>

      <section
        aria-labelledby="alerts-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="alerts-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.alerts.title')}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4, 1rem)',
          }}
        >
          {alertZones.map((zone) => (
            <div key={zone.zone_id} style={{ position: 'relative' }}>
              <AlphaZoneCard zone={zone} />
              <div
                style={{
                  position: 'absolute',
                  top: 'var(--space-3, 0.75rem)',
                  right: 'var(--space-3, 0.75rem)',
                }}
              >
                <PreviewCta
                  persona="masterbroker"
                  ctaId={`alpha_subscribe_${zone.zone_id}`}
                  href={`/${locale}/auth/signup?role=broker&intent=alpha`}
                  variant="ghost"
                >
                  ★
                </PreviewCta>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="leaderboard-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="leaderboard-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.leaderboard.title')}
        </h2>
        <Leaderboard agents={agents} limit={5} />
      </section>

      <section
        aria-labelledby="cta-final-heading"
        style={{
          padding: 'var(--space-8, 2rem)',
          borderRadius: 'var(--radius-lg, 0.75rem)',
          background: 'var(--color-accent-soft)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3, 0.75rem)',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <h2
          id="cta-final-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('cta_final.label')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', maxWidth: 520 }}>
          {t('cta_final.helper')}
        </p>
        <PreviewCta
          persona="masterbroker"
          ctaId="cta_final"
          href={`/${locale}/auth/signup?role=broker`}
        >
          {t('cta_final.label')}
        </PreviewCta>
      </section>
    </main>
  );
}
