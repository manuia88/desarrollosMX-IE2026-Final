import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { IndexDetailClient } from '@/features/indices-publicos/components/IndexDetailClient';
import {
  INDEX_CODES,
  type IndexCode,
  isIndexCode,
  isScopeType,
  type ScopeType,
} from '@/features/indices-publicos/lib/index-registry-helpers';
import { defaultLocale, locales } from '@/shared/lib/i18n/config';

interface PageProps {
  params: Promise<{ locale: string; indexCode: string }>;
  searchParams: Promise<{ scope_id?: string; scope_type?: string }>;
}

export function generateStaticParams() {
  return INDEX_CODES.map((indexCode) => ({ locale: defaultLocale, indexCode }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { locale, indexCode } = await params;
  const { scope_id } = await searchParams;
  if (!isIndexCode(indexCode)) {
    return { title: 'DesarrollosMX' };
  }
  const t = await getTranslations({ locale, namespace: 'IndicesPublic' });
  const name = t(`indices.${indexCode}.name`);
  const scopeLabel = scope_id ?? name;
  const title = t('detail.title', { code: indexCode, scope: scopeLabel });
  const description = t('detail.meta_description', {
    code: indexCode,
    scope: scopeLabel,
    country: t('page.country_label'),
  });

  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/${indexCode}`] as const),
  ) as Record<string, string>;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/indices/${indexCode}`,
      languages,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function IndexDetailPage({ params, searchParams }: PageProps) {
  const { locale, indexCode } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  if (!isIndexCode(indexCode)) {
    notFound();
  }

  const typedCode: IndexCode = indexCode;
  const scopeType: ScopeType =
    sp.scope_type && isScopeType(sp.scope_type) ? sp.scope_type : 'colonia';
  const scopeId = typeof sp.scope_id === 'string' && sp.scope_id.length > 0 ? sp.scope_id : null;

  const t = await getTranslations({ locale, namespace: 'IndicesPublic' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: t(`indices.${typedCode}.name`),
    description: t(`indices.${typedCode}.tagline`),
    identifier: typedCode,
    inLanguage: locale,
    license: `/${locale}/indices/metodologia`,
    creator: {
      '@type': 'Organization',
      name: 'DesarrollosMX',
      url: `/${locale}`,
    },
  };

  const shareUrl = `/${locale}/indices/${typedCode}${scopeId ? `?scope_id=${encodeURIComponent(scopeId)}` : ''}`;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD SEO
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-[color:var(--color-text-secondary)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:underline">
              DesarrollosMX
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${locale}/indices`} className="hover:underline">
              {t('page.title')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {typedCode}
          </li>
        </ol>
      </nav>

      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center text-[color:var(--color-text-secondary)]"
          >
            {t('page.loading')}
          </div>
        }
      >
        <IndexDetailClient
          indexCode={typedCode}
          scopeType={scopeType}
          scopeId={scopeId}
          locale={locale}
          shareUrl={shareUrl}
        />
      </Suspense>
    </main>
  );
}
