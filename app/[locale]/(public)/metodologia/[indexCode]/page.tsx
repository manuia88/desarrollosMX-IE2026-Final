import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MethodologyDetailClient } from '@/features/indices-publicos/components/MethodologyDetailClient';
import {
  INDEX_CODES,
  type IndexCode,
  isIndexCode,
} from '@/features/indices-publicos/lib/index-registry-helpers';

type Props = {
  params: Promise<{ locale: string; indexCode: string }>;
};

export function generateStaticParams() {
  return INDEX_CODES.map((indexCode) => ({ indexCode }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, indexCode } = await params;
  if (!isIndexCode(indexCode)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: 'IndicesPublic.methodology' });
  return {
    title: t('detail_title', { code: indexCode }),
    description: t('detail_meta_description', { code: indexCode }),
  };
}

export default async function MetodologiaDetailPage({ params }: Props) {
  const { locale, indexCode } = await params;
  setRequestLocale(locale);

  if (!isIndexCode(indexCode)) {
    notFound();
  }
  const code: IndexCode = indexCode;

  const t = await getTranslations('IndicesPublic');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: t('methodology.detail_title', { code }),
    description: t('methodology.detail_meta_description', { code }),
    inLanguage: locale,
    about: t(`indices.${code}.name`),
  };

  return (
    <main
      style={{
        padding: 'var(--space-8, 2rem)',
        maxWidth: 960,
        margin: '0 auto',
      }}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD SEO markup rendered server-side only
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header style={{ marginBottom: 'var(--space-6, 1.5rem)' }}>
        <h1
          style={{
            fontSize: 'var(--text-3xl, 2rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {t('methodology.detail_title', { code })}
        </h1>
      </header>

      <MethodologyDetailClient indexCode={code} />
    </main>
  );
}
