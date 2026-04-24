import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { loadLocalizedMarkdown, parseFaqEntries } from '@/shared/lib/content/load-markdown';
import { isLocale, locales } from '@/shared/lib/i18n/config';
import { MarkdownContentRenderer } from '@/shared/ui/molecules/MarkdownContentRenderer';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'FAQ' });
  const languages = Object.fromEntries(locales.map((l) => [l, `/${l}/faq`] as const)) as Record<
    string,
    string
  >;

  return {
    title: t('page_title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/faq`,
      languages,
    },
    openGraph: {
      title: t('page_title'),
      description: t('meta_description'),
      type: 'website',
      locale,
    },
    twitter: {
      card: 'summary',
      title: t('page_title'),
      description: t('meta_description'),
    },
  };
}

export default async function FaqPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'FAQ' });

  const content = await loadLocalizedMarkdown({
    section: 'faq',
    slug: 'faq',
    locale,
  });

  if (content === null) {
    notFound();
  }

  const entries = parseFaqEntries(content);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };

  return (
    <main
      style={{
        padding: 'var(--space-8, 2rem)',
        maxWidth: 860,
        margin: '0 auto',
      }}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD SEO markup rendered server-side from trusted strings
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label={t('breadcrumb')}
        style={{
          marginBottom: 'var(--space-5, 1.25rem)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <Link
          href={`/${locale}`}
          style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}
        >
          {t('back_home')}
        </Link>
        <span aria-hidden="true" style={{ margin: '0 var(--space-2, 0.5rem)' }}>
          /
        </span>
        <span>{t('breadcrumb')}</span>
      </nav>

      <header style={{ marginBottom: 'var(--space-6, 1.5rem)' }}>
        <h1
          style={{
            fontSize: 'var(--text-3xl, 2rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {t('page_title')}
        </h1>
        <p
          style={{
            marginTop: 'var(--space-3, 0.75rem)',
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            maxWidth: 720,
          }}
        >
          {t('intro')}
        </p>
      </header>

      <section aria-label={t('page_title')}>
        <dl>
          {entries.map((entry) => (
            <div key={entry.question} style={{ marginBottom: 'var(--space-6, 1.5rem)' }}>
              <dt
                style={{
                  fontSize: 'var(--text-xl, 1.25rem)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-2, 0.5rem)',
                }}
              >
                {entry.question}
              </dt>
              <dd style={{ margin: 0 }}>
                <MarkdownContentRenderer content={entry.answer} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
