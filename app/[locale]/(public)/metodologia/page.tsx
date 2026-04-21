import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MethodologyCard } from '@/features/indices-publicos/components/MethodologyCard';
import { INDEX_CODES } from '@/features/indices-publicos/lib/index-registry-helpers';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'IndicesPublic.methodology' });
  return {
    title: t('title'),
    description: t('meta_description'),
  };
}

export default async function MetodologiaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('IndicesPublic.methodology');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: t('title'),
    description: t('meta_description'),
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

      <header style={{ marginBottom: 'var(--space-8, 2rem)' }}>
        <h1
          style={{
            fontSize: 'var(--text-3xl, 2rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {t('title')}
        </h1>
        <p
          style={{
            marginTop: 'var(--space-3, 0.75rem)',
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            maxWidth: 720,
          }}
        >
          {t('subtitle')}
        </p>
      </header>

      <section
        aria-label={t('title')}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 'var(--space-5, 1.25rem)',
        }}
      >
        {INDEX_CODES.map((code) => (
          <MethodologyCard key={code} code={code} />
        ))}
      </section>
    </main>
  );
}
