import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { defaultLocale, locales } from '@/shared/lib/i18n/config';
import { createAdminClientExt } from '@/shared/lib/supabase/admin-ext';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return [{ locale: defaultLocale }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Atlas' });
  const languages = Object.fromEntries(locales.map((l) => [l, `/${l}/atlas`] as const)) as Record<
    string,
    string
  >;
  return {
    title: t('landing.meta_title'),
    description: t('landing.meta_description'),
    alternates: {
      canonical: `/${locale}/atlas`,
      languages,
    },
  };
}

interface ListedColonia {
  readonly slug: string;
  readonly label: string;
  readonly alcaldia: string | null;
}

async function fetchPublishedColonias(): Promise<ReadonlyArray<ListedColonia>> {
  const supabase = createAdminClientExt();

  const { data: publishedRows, error: wikiErr } = await supabase
    .from('colonia_wiki_entries')
    .select('colonia_id, published')
    .eq('published', true);
  if (wikiErr) return [];
  const publishedIds = new Set<string>();
  for (const row of publishedRows ?? []) {
    if (row.colonia_id) publishedIds.add(row.colonia_id);
  }
  if (publishedIds.size === 0) return [];

  const { data: slugRows, error: slugErr } = await supabase
    .from('zone_slugs')
    .select('zone_id, slug, source_label')
    .eq('scope_type', 'colonia')
    .in('zone_id', Array.from(publishedIds))
    .order('source_label', { ascending: true })
    .limit(500);
  if (slugErr) return [];

  const rows = (slugRows ?? []) as ReadonlyArray<{
    zone_id: string;
    slug: string;
    source_label: string;
  }>;

  return rows.map((row) => ({
    slug: row.slug,
    label: row.source_label,
    alcaldia: null,
  }));
}

export default async function AtlasLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Atlas' });
  const colonias = await fetchPublishedColonias();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <nav
        aria-label={t('landing.breadcrumb_label')}
        className="text-xs text-[color:var(--color-text-secondary)]"
      >
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:underline">
              DesarrollosMX
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('landing.breadcrumb_atlas')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-[color:var(--color-text-primary)]">
          {t('landing.title')}
        </h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('landing.subtitle')}</p>
      </header>

      {colonias.length === 0 ? (
        <div
          role="status"
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-sm text-[color:var(--color-text-secondary)]"
        >
          {t('landing.empty')}
        </div>
      ) : (
        <section aria-label={t('landing.section_label')}>
          <p className="mb-4 text-xs text-[color:var(--color-text-muted)]">
            {t('landing.count', { count: colonias.length })}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {colonias.map((colonia) => (
              <li key={colonia.slug}>
                <Link
                  href={`/${locale}/atlas/${colonia.slug}`}
                  className="block rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-4 transition hover:border-[color:var(--color-accent)]"
                >
                  <span className="block text-sm font-medium text-[color:var(--color-text-primary)]">
                    {colonia.label}
                  </span>
                  <span className="block text-xs text-[color:var(--color-text-muted)]">
                    {colonia.slug}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-xs text-[color:var(--color-text-muted)]">
        {t('landing.methodology_note')}
      </footer>
    </main>
  );
}
