import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PERSONA_TYPES, type PersonaType } from '@/features/preview-ux/types';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PreviewHub' });
  const title = t('meta_title');
  const description = t('meta_description');
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

const PERSONA_ORDER: readonly PersonaType[] = PERSONA_TYPES;
const PERSONA_ICON: Readonly<Record<PersonaType, string>> = {
  comprador: '◐',
  asesor: '◑',
  developer: '◒',
  masterbroker: '◓',
};

export default async function PreviewHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('PreviewHub');

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
      }}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD SEO markup rendered server-side only
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header style={{ marginBottom: 'var(--space-8, 2rem)', textAlign: 'center' }}>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-accent-strong)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: 0,
          }}
        >
          {t('eyebrow')}
        </p>
        <h1
          style={{
            fontSize: 'var(--text-4xl, 2.5rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: 'var(--color-text-primary)',
            marginTop: 'var(--space-2, 0.5rem)',
            marginBottom: 0,
          }}
        >
          {t('title')}
        </h1>
        <p
          style={{
            marginTop: 'var(--space-4, 1rem)',
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            maxWidth: 720,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {t('subtitle')}
        </p>
      </header>

      <section
        aria-label={t('title')}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-5, 1.25rem)',
        }}
      >
        {PERSONA_ORDER.map((persona) => (
          <Link
            key={persona}
            href={`/${locale}/preview/${persona}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3, 0.75rem)',
              padding: 'var(--space-5, 1.25rem)',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg, 0.75rem)',
              textDecoration: 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{ fontSize: '2rem', color: 'var(--color-accent-strong)' }}
            >
              {PERSONA_ICON[persona]}
            </span>
            <h2
              style={{
                fontSize: 'var(--text-xl, 1.25rem)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              {t(`personas.${persona}.title`)}
            </h2>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              {t(`personas.${persona}.description`)}
            </p>
            <span
              style={{
                marginTop: 'auto',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                color: 'var(--color-accent-strong)',
              }}
            >
              {t('cta_open_preview')}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
