import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { loadLocalizedMarkdown } from '@/shared/lib/content/load-markdown';
import { isLocale, locales } from '@/shared/lib/i18n/config';
import { MarkdownContentRenderer } from '@/shared/ui/molecules/MarkdownContentRenderer';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Legal.privacidad' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/legal/privacidad`] as const),
  ) as Record<string, string>;

  return {
    title: t('page_title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/legal/privacidad`,
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

export default async function PrivacidadPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Legal' });

  const content = await loadLocalizedMarkdown({
    section: 'legal',
    slug: 'privacidad',
    locale,
  });

  if (content === null) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: t('privacidad.page_title'),
    description: t('privacidad.meta_description'),
    inLanguage: locale,
    dateModified: '2026-04-24',
    datePublished: '2026-04-24',
    version: '0.1',
    publisher: {
      '@type': 'Organization',
      name: 'DesarrollosMX',
    },
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
        aria-label={t('breadcrumb_legal')}
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
          {t('privacidad.back_home')}
        </Link>
        <span aria-hidden="true" style={{ margin: '0 var(--space-2, 0.5rem)' }}>
          /
        </span>
        <span>{t('privacidad.breadcrumb')}</span>
      </nav>

      <div
        role="note"
        aria-label={t('privacidad.draft_badge')}
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md, 0.5rem)',
          padding: 'var(--space-3, 0.75rem) var(--space-4, 1rem)',
          background: 'var(--color-surface-muted)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)',
          marginBottom: 'var(--space-6, 1.5rem)',
        }}
      >
        {t('privacidad.draft_badge')}
      </div>

      <article aria-label={t('privacidad.page_title')}>
        <MarkdownContentRenderer content={content} ariaLabel={t('privacidad.page_title')} />
      </article>
    </main>
  );
}
