import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MethodologyCard } from '@/features/indices-publicos/components/MethodologyCard';
import { RankingTable } from '@/features/indices-publicos/components/RankingTable';
import type { PitchCardData } from '@/features/preview-ux/components/asesor/PitchBuilder';
import { PitchBuilder } from '@/features/preview-ux/components/asesor/PitchBuilder';
import { ProfileTabs } from '@/features/preview-ux/components/asesor/ProfileTabs';
import { PreviewCta } from '@/features/preview-ux/components/PreviewCta';
import { PreviewPageTracker } from '@/features/preview-ux/components/PreviewPageTracker';
import { getNarvarteMock } from '@/features/preview-ux/lib/mock-data-provider';
import { CLIENT_PROFILES_MOCK } from '@/features/preview-ux/mock/client-profiles-mock';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PreviewAsesor' });
  const title = t('meta_title');
  const description = t('meta_description');
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PreviewAsesorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('PreviewAsesor');

  const narvarte = getNarvarteMock();
  const laura = CLIENT_PROFILES_MOCK[0];

  const topScoresSorted = [...narvarte.scores].sort((a, b) => b.value - a.value).slice(0, 3);
  const famScore = narvarte.scores.find((s) => s.code === 'FAM');
  const ipvScore = narvarte.scores.find((s) => s.code === 'IPV');
  const pitchCards: readonly PitchCardData[] = (laura?.proposedZones ?? []).map((zone) => ({
    scopeId: zone.scopeId,
    topScores: topScoresSorted,
    appreciation12m: ipvScore?.trend_pct_12m ?? 0,
    famPercentile: famScore?.percentile ?? 0,
  }));

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

  const objections = ['q1', 'q2', 'q3', 'q4'] as const;

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

      <PreviewPageTracker persona="asesor" />

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
          <PreviewCta persona="asesor" ctaId="hero_primary" href={`#profiles`} variant="primary">
            {t('hero.cta_primary')}
          </PreviewCta>
        </div>
      </header>

      <section
        id="profiles"
        aria-labelledby="profiles-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="profiles-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.profiles.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          {t('flow.profiles.description')}
        </p>
        <ProfileTabs profiles={CLIENT_PROFILES_MOCK} />
      </section>

      <section
        aria-labelledby="ranking-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="ranking-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.proposal.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          {t('flow.proposal.description')}
        </p>
        <RankingTable rows={narvarte.topMatches} scopeType="colonia" searchable={false} />
      </section>

      <section
        aria-labelledby="pitch-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="pitch-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.pitch.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          {t('flow.pitch.description')}
        </p>
        <PitchBuilder cards={pitchCards} />
      </section>

      <section
        aria-labelledby="pdf-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="pdf-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.pdf.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          {t('flow.pdf.description')}
        </p>
        <figure
          aria-label={t('flow.pdf.mock_label')}
          style={{
            position: 'relative',
            maxWidth: 520,
            margin: '0 auto',
            aspectRatio: '3 / 4',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            border: '1px solid var(--color-border-subtle)',
            background:
              'linear-gradient(180deg, var(--color-surface-elevated) 0%, var(--color-surface-raised) 100%)',
            boxShadow: 'var(--shadow-strong, 0 20px 40px rgba(15,23,42,0.12))',
            padding: 'var(--space-6, 1.5rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4, 1rem)',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 'var(--space-3, 0.75rem)',
              right: 'var(--space-3, 0.75rem)',
              padding: 'var(--space-1, 0.25rem) var(--space-3, 0.75rem)',
              borderRadius: 'var(--radius-full, 999px)',
              background: 'var(--color-accent-soft)',
              color: 'var(--color-accent-strong)',
              fontSize: 'var(--text-xs, 0.75rem)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 'var(--font-weight-semibold, 600)',
            }}
          >
            {t('flow.pdf.mock_label')}
          </span>
          <h3
            style={{
              margin: 0,
              marginTop: 'var(--space-6, 1.5rem)',
              fontSize: 'var(--text-xl, 1.25rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('flow.pdf.toc_heading')}
          </h3>
          <ol
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2, 0.5rem)',
              margin: 0,
              paddingLeft: '1.25rem',
              color: 'var(--color-text-primary)',
            }}
          >
            {(['toc_1', 'toc_2', 'toc_3', 'toc_4', 'toc_5'] as const).map((k) => (
              <li key={k} style={{ fontSize: 'var(--text-sm)' }}>
                {t(`flow.pdf.${k}`)}
              </li>
            ))}
          </ol>
        </figure>
      </section>

      <section
        aria-labelledby="objections-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="objections-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.objections.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          {t('flow.objections.description')}
        </p>
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4, 1rem)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {objections.map((k) => (
            <li
              key={k}
              style={{
                padding: 'var(--space-4, 1rem)',
                borderRadius: 'var(--radius-lg, 0.75rem)',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-surface-elevated)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2, 0.5rem)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {t(`flow.objections.${k}`)}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {t(`flow.objections.a${k.slice(1)}`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="methodology-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}
      >
        <h2
          id="methodology-heading"
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('flow.methodology.title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          {t('flow.methodology.description')}
        </p>
        <div style={{ maxWidth: 320 }}>
          <MethodologyCard code="FAM" />
        </div>
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
        <PreviewCta persona="asesor" ctaId="cta_final" href={`/${locale}/auth/signup?role=advisor`}>
          {t('cta_final.label')}
        </PreviewCta>
      </section>
    </main>
  );
}
