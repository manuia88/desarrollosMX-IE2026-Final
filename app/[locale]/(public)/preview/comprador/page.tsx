import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RankingTable } from '@/features/indices-publicos/components/RankingTable';
import { PulseSimulator } from '@/features/preview-ux/components/comprador/PulseSimulator';
import { ScoresGrid } from '@/features/preview-ux/components/comprador/ScoresGrid';
import { TimelineChart } from '@/features/preview-ux/components/comprador/TimelineChart';
import { PreviewCta } from '@/features/preview-ux/components/PreviewCta';
import { PreviewPageTracker } from '@/features/preview-ux/components/PreviewPageTracker';
import { getNarvarteMock } from '@/features/preview-ux/lib/mock-data-provider';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PreviewComprador' });
  const title = t('meta_title');
  const description = t('meta_description');
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PreviewCompradorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('PreviewComprador');
  const tShared = await getTranslations('PreviewShared');

  const narvarte = getNarvarteMock();
  const zoneLabel = resolveZoneLabelSync({
    scopeType: narvarte.scopeType,
    scopeId: narvarte.scopeId,
  });

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

      <PreviewPageTracker persona="comprador" />

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
          <PreviewCta persona="comprador" ctaId="hero_primary" href={`#matches`} variant="primary">
            {t('hero.cta_primary')}
          </PreviewCta>
        </div>
      </header>

      <section
        aria-labelledby="lifestyle-heading"
        style={{
          padding: 'var(--space-6, 1.5rem)',
          borderRadius: 'var(--radius-lg, 0.75rem)',
          background: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4, 1rem)',
        }}
      >
        <h2
          id="lifestyle-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.lifestyle.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          {t('flow.lifestyle.description')}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.lifestyle.profile_summary')}
        </p>
        <ul
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2, 0.5rem)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {(['chip_stage', 'chip_budget', 'chip_priority'] as const).map((key) => (
            <li
              key={key}
              style={{
                padding: 'var(--space-2, 0.5rem) var(--space-3, 0.75rem)',
                borderRadius: 'var(--radius-full, 999px)',
                background: 'var(--color-accent-soft)',
                color: 'var(--color-accent-strong)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium, 500)',
              }}
            >
              {t(`flow.lifestyle.${key}`)}
            </li>
          ))}
        </ul>
      </section>

      <section
        id="matches"
        aria-labelledby="matches-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="matches-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.matches.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          {t('flow.matches.description')}
        </p>
        <RankingTable rows={narvarte.topMatches} scopeType="colonia" searchable={false} />
      </section>

      <section
        aria-labelledby="highlight-heading"
        style={{
          padding: 'var(--space-6, 1.5rem)',
          borderRadius: 'var(--radius-lg, 0.75rem)',
          border: '1px solid var(--color-border-subtle)',
          background: 'var(--color-surface-elevated)',
          boxShadow: 'var(--shadow-soft)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5, 1.25rem)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 'var(--space-3, 0.75rem)',
          }}
        >
          <div>
            <h2
              id="highlight-heading"
              style={{
                margin: 0,
                fontSize: 'var(--text-2xl, 1.5rem)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                color: 'var(--color-text-primary)',
              }}
            >
              {t('flow.highlight.title')}
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              {t('flow.highlight.description')}
            </p>
          </div>
          <span
            style={{
              padding: 'var(--space-1, 0.25rem) var(--space-3, 0.75rem)',
              borderRadius: 'var(--radius-full, 999px)',
              background: 'var(--color-accent-soft)',
              color: 'var(--color-accent-strong)',
              fontSize: 'var(--text-xs, 0.75rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {zoneLabel}
          </span>
        </div>

        <p style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          {tShared('narvarte.summary')}
        </p>

        <h3
          style={{
            margin: 0,
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {t('flow.highlight.scores_heading')}
        </h3>

        <ScoresGrid scores={narvarte.scores} />
      </section>

      <section
        aria-labelledby="pulse-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="pulse-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.pulse.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          {t('flow.pulse.description')}
        </p>
        <PulseSimulator
          pulse={narvarte.pulse}
          drivers={narvarte.causal.drivers}
          conclusionKey={narvarte.causal.conclusion}
        />
      </section>

      <section
        aria-labelledby="timeline-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="timeline-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.timeline.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          {t('flow.timeline.description')}
        </p>
        <TimelineChart points={narvarte.timeline} />
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
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-accent-strong)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 'var(--font-weight-semibold, 600)',
          }}
        >
          {t('cta_final.eyebrow')}
        </p>
        <h2
          id="cta-final-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('cta_final.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', maxWidth: 520 }}>
          {t('cta_final.subtitle')}
        </p>
        <PreviewCta persona="comprador" ctaId="cta_final" href={`/${locale}/auth/signup`}>
          {t('cta_final.label')}
        </PreviewCta>
      </section>
    </main>
  );
}
