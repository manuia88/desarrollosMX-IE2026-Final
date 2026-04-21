import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProTerminal } from './pro-terminal';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'IndicesPublic.pro' });
  return {
    title: t('title'),
    description: t('meta_description'),
  };
}

export default async function ProPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'IndicesPublic.pro' });

  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: t('title'),
    description: t('meta_description'),
    creator: { '@type': 'Organization', name: 'DesarrollosMX' },
    keywords: 'indices inmobiliarios, plusvalía, rankings, colonias, México',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  } as const;

  return (
    <main
      className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-8"
      style={{ color: 'var(--color-text-primary)' }}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD SEO payload
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
          {t('title')}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('subtitle')}</p>
      </header>
      <ProTerminal />
    </main>
  );
}
