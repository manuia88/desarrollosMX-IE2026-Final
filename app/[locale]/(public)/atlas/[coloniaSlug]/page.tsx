import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { WikiSectionList } from '@/features/atlas/components/WikiSectionList';
import { resolveColoniaIdBySlug } from '@/features/atlas/lib/slug-resolver';
import {
  ATLAS_CLIMATE_INDEX_CODE,
  ATLAS_SIMILAR_INDEX_CODE,
  WIKI_SECTION_KEYS,
  type WikiSection,
  type WikiSectionKey,
} from '@/features/atlas/types';
import { defaultLocale, locales } from '@/shared/lib/i18n/config';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  params: Promise<{ locale: string; coloniaSlug: string }>;
}

export function generateStaticParams() {
  return [{ locale: defaultLocale, coloniaSlug: 'placeholder' }];
}

interface JsonbSection {
  readonly heading?: unknown;
  readonly content_md?: unknown;
}

function parseSections(raw: unknown): ReadonlyArray<WikiSection> {
  if (!raw || typeof raw !== 'object') return [];
  const record = raw as Record<string, unknown>;
  const out: WikiSection[] = [];
  for (const key of WIKI_SECTION_KEYS) {
    const value = record[key] as JsonbSection | undefined;
    if (!value || typeof value !== 'object') continue;
    const heading = typeof value.heading === 'string' ? value.heading : null;
    const content = typeof value.content_md === 'string' ? value.content_md : null;
    if (!heading || !content) continue;
    out.push({ key: key as WikiSectionKey, heading, content_md: content });
  }
  return out;
}

interface WikiFetchResult {
  readonly label: string;
  readonly sections: ReadonlyArray<WikiSection>;
  readonly editedAt: string;
  readonly version: number;
  readonly coloniaId: string;
}

async function fetchWiki(slug: string): Promise<WikiFetchResult | null> {
  const supabase = createAdminClient();
  const resolution = await resolveColoniaIdBySlug(slug, supabase);
  if (!resolution) return null;

  const { data: wikiRow, error } = await supabase
    .from('colonia_wiki_entries')
    .select('version, sections, edited_at, colonia_id, published')
    .eq('colonia_id', resolution.colonia_id)
    .eq('published', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !wikiRow) return null;

  return {
    label: resolution.source_label,
    sections: parseSections(wikiRow.sections),
    editedAt: wikiRow.edited_at,
    version: wikiRow.version,
    coloniaId: wikiRow.colonia_id,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, coloniaSlug } = await params;
  const wiki = await fetchWiki(coloniaSlug);
  const t = await getTranslations({ locale, namespace: 'Atlas' });
  if (!wiki) {
    return { title: t('detail.meta_fallback_title') };
  }
  const title = t('detail.meta_title', { label: wiki.label });
  const description = t('detail.meta_description', { label: wiki.label });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/atlas/${coloniaSlug}`] as const),
  ) as Record<string, string>;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/atlas/${coloniaSlug}`,
      languages,
    },
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

export default async function AtlasColoniaPage({ params }: PageProps) {
  const { locale, coloniaSlug } = await params;
  setRequestLocale(locale);

  const wiki = await fetchWiki(coloniaSlug);
  if (!wiki) notFound();

  const t = await getTranslations({ locale, namespace: 'Atlas' });

  const similaresHref = `/${locale}/indices/${ATLAS_SIMILAR_INDEX_CODE}/similares?scope_id=${encodeURIComponent(
    wiki.coloniaId,
  )}`;
  const climaGemeloHref = `/${locale}/indices/${ATLAS_CLIMATE_INDEX_CODE}/clima-gemelo?scope_id=${encodeURIComponent(
    wiki.coloniaId,
  )}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t('detail.meta_title', { label: wiki.label }),
    inLanguage: locale,
    dateModified: wiki.editedAt,
    about: {
      '@type': 'Place',
      name: wiki.label,
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'MX',
      },
    },
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <nav
        aria-label={t('detail.breadcrumb_label')}
        className="text-xs text-[color:var(--color-text-secondary)]"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:underline">
              DesarrollosMX
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${locale}/atlas`} className="hover:underline">
              {t('detail.breadcrumb_atlas')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {wiki.label}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-4xl font-semibold text-[color:var(--color-text-primary)]">
          {wiki.label}
        </h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('detail.subtitle')}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
        <div>
          {wiki.sections.length === 0 ? (
            <div
              role="status"
              className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-sm text-[color:var(--color-text-secondary)]"
            >
              {t('detail.empty_sections')}
            </div>
          ) : (
            <WikiSectionList sections={wiki.sections} tocLabel={t('detail.toc_label')} />
          )}
        </div>

        <aside
          aria-label={t('detail.aside_label')}
          className="space-y-4 text-sm lg:sticky lg:top-24 lg:self-start"
        >
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-secondary)]">
              {t('detail.cross_links_heading')}
            </h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href={similaresHref}
                  className="text-[color:var(--color-accent)] hover:underline"
                >
                  {t('detail.cross_similares')}
                </Link>
              </li>
              <li>
                <Link
                  href={climaGemeloHref}
                  className="text-[color:var(--color-accent)] hover:underline"
                >
                  {t('detail.cross_clima_gemelo')}
                </Link>
              </li>
            </ul>
          </div>
          <p className="text-xs text-[color:var(--color-text-muted)]">
            {t('detail.edition_meta', { version: wiki.version })}
          </p>
        </aside>
      </div>

      <footer className="text-xs text-[color:var(--color-text-muted)]">
        {t('detail.methodology_note')}
      </footer>

      <script type="application/ld+json">{JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
    </main>
  );
}
