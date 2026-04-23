import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SimilarColoniasList } from '@/features/genome/components/SimilarColoniasList';
import {
  INDEX_CODES,
  type IndexCode,
  isIndexCode,
} from '@/features/indices-publicos/lib/index-registry-helpers';
import { defaultLocale, locales } from '@/shared/lib/i18n/config';
import { findSimilarColonias } from '@/shared/lib/intelligence-engine/genome/similarity-engine';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  params: Promise<{ locale: string; indexCode: string }>;
  searchParams: Promise<{ scope_id?: string; min_liv?: string }>;
}

export function generateStaticParams() {
  return INDEX_CODES.map((indexCode) => ({ locale: defaultLocale, indexCode }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, indexCode } = await params;
  if (!isIndexCode(indexCode)) {
    return { title: 'DesarrollosMX' };
  }
  const t = await getTranslations({ locale, namespace: 'Genome' });
  const title = t('similares.meta_title', { code: indexCode });
  const description = t('similares.meta_description', { code: indexCode });

  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/${indexCode}/similares`] as const),
  ) as Record<string, string>;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/indices/${indexCode}/similares`,
      languages,
    },
  };
}

export default async function SimilarColoniasPage({ params, searchParams }: PageProps) {
  const { locale, indexCode } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  if (!isIndexCode(indexCode)) {
    notFound();
  }

  const typedCode: IndexCode = indexCode;
  const scopeId = typeof sp.scope_id === 'string' && sp.scope_id.length > 0 ? sp.scope_id : null;
  const minLivRaw = typeof sp.min_liv === 'string' ? Number.parseFloat(sp.min_liv) : Number.NaN;
  const minLiv =
    Number.isFinite(minLivRaw) && minLivRaw >= 0 && minLivRaw <= 100 ? minLivRaw : null;

  const t = await getTranslations({ locale, namespace: 'Genome' });

  let results: Awaited<ReturnType<typeof findSimilarColonias>> = [];
  if (scopeId) {
    try {
      const supabase = createAdminClient();
      results = await findSimilarColonias({
        coloniaId: scopeId,
        supabase,
        topN: 10,
        minSimilarity: 0.7,
        minDmxLiv: minLiv,
      });
    } catch {
      results = [];
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
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
              {t('similares.breadcrumb_indices')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/${locale}/indices/${typedCode}${scopeId ? `?scope_id=${encodeURIComponent(scopeId)}` : ''}`}
              className="hover:underline"
            >
              {typedCode}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('similares.breadcrumb_similares')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-[color:var(--color-text-primary)]">
          {t('similares.title')}
        </h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">
          {t('similares.subtitle')}
        </p>
      </header>

      {!scopeId ? (
        <div
          role="status"
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-sm text-[color:var(--color-text-secondary)]"
        >
          {t('similares.pick_scope_hint')}
        </div>
      ) : (
        <SimilarColoniasList
          indexCode={typedCode}
          locale={locale}
          results={results}
          sourceColoniaId={scopeId}
          minLiv={minLiv}
        />
      )}

      <footer className="text-xs text-[color:var(--color-text-muted)]">
        {t('similares.methodology_note')}
      </footer>
    </main>
  );
}
