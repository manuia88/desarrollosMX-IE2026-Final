import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FeasibilityCards } from '@/features/preview-ux/components/developer/FeasibilityCards';
import { HeatmapMock } from '@/features/preview-ux/components/developer/HeatmapMock';
import { MigrationDiagram } from '@/features/preview-ux/components/developer/MigrationDiagram';
import { PipelineTable } from '@/features/preview-ux/components/developer/PipelineTable';
import { PreviewCta } from '@/features/preview-ux/components/PreviewCta';
import { PreviewPageTracker } from '@/features/preview-ux/components/PreviewPageTracker';
import { getNarvarteMock, getPreviewMockData } from '@/features/preview-ux/lib/mock-data-provider';
import { AlphaZoneCard } from '@/features/trend-genome/components/AlphaZoneCard';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PreviewDeveloper' });
  const title = t('meta_title');
  const description = t('meta_description');
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PreviewDeveloperPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('PreviewDeveloper');

  const narvarte = getNarvarteMock();
  const bundle = getPreviewMockData('developer');
  const feasibility = bundle.feasibility;

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

      <PreviewPageTracker persona="developer" />

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
          <PreviewCta
            persona="developer"
            ctaId="hero_primary"
            href="#feasibility"
            variant="primary"
          >
            {t('hero.cta_primary')}
          </PreviewCta>
        </div>
      </header>

      <section
        aria-labelledby="map-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="map-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.map.title')}
        </h2>
        <HeatmapMock />
      </section>

      <section
        aria-labelledby="filters-heading"
        style={{
          padding: 'var(--space-5, 1.25rem)',
          borderRadius: 'var(--radius-lg, 0.75rem)',
          border: '1px solid var(--color-border-subtle)',
          background: 'var(--color-surface-elevated)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4, 1rem)',
        }}
      >
        <h2
          id="filters-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.filters.title')}
        </h2>
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-3, 0.75rem)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {(['price_range', 'typology', 'units'] as const).map((key) => (
            <li
              key={key}
              style={{
                padding: 'var(--space-3, 0.75rem) var(--space-4, 1rem)',
                borderRadius: 'var(--radius-md, 0.5rem)',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-surface-raised, #fff)',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs, 0.75rem)',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 4,
                }}
              >
                {t(`flow.filters.${key}`)}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                }}
              >
                {t(`flow.filters.${key}_value`)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="feasibility"
        aria-labelledby="feasibility-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="feasibility-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.feasibility.title')}
        </h2>
        <FeasibilityCards feasibility={feasibility} />
      </section>

      <section
        aria-labelledby="alpha-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 'var(--space-3, 0.75rem)',
          }}
        >
          <h2
            id="alpha-heading"
            style={{
              margin: 0,
              fontSize: 'var(--text-2xl, 1.5rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('flow.alpha.title')}
          </h2>
          <PreviewCta
            persona="developer"
            ctaId="alpha_subscribe"
            href={`/${locale}/auth/signup?role=developer&intent=alpha`}
            variant="ghost"
          >
            {t('flow.alpha.subscribe_cta')}
          </PreviewCta>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4, 1rem)',
          }}
        >
          {narvarte.alphaZones.map((zone) => (
            <AlphaZoneCard key={zone.zone_id} zone={zone} />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="migration-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="migration-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.migration.title')}
        </h2>
        <MigrationDiagram points={narvarte.migrationPoints} destScopeId={narvarte.scopeId} />
      </section>

      <section
        aria-labelledby="pipeline-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="pipeline-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.pipeline.title')}
        </h2>
        <PipelineTable projects={feasibility.pipelineProjects} />
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
          persona="developer"
          ctaId="cta_final"
          href={`/${locale}/auth/signup?role=developer`}
        >
          {t('cta_final.label')}
        </PreviewCta>
      </section>
    </main>
  );
}
