import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FuturesCurveClient } from '@/features/futures-curve/components/FuturesCurveClient';
import type { ForwardCurve, FuturesScopeType } from '@/features/futures-curve/types';
import { isIndexCode } from '@/features/indices-publicos/lib/index-registry-helpers';
import { defaultLocale, locales } from '@/shared/lib/i18n/config';
import { calculateForwardCurve } from '@/shared/lib/intelligence-engine/futures/curve-calculator';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { INDEX_CODES, type IndexCode } from '@/shared/types/scores';

interface PageProps {
  params: Promise<{ locale: string; indexCode: string }>;
  searchParams: Promise<{ scope_ids?: string }>;
}

export function generateStaticParams() {
  return INDEX_CODES.map((indexCode) => ({ locale: defaultLocale, indexCode }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, indexCode } = await params;
  if (!isIndexCode(indexCode)) {
    return { title: 'DesarrollosMX' };
  }
  const t = await getTranslations({ locale, namespace: 'FuturesCurve' });
  const title = t('meta_title', { code: indexCode });
  const description = t('meta_description', { code: indexCode });

  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/${indexCode}/futuros`] as const),
  ) as Record<string, string>;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/indices/${indexCode}/futuros`,
      languages,
    },
  };
}

const MAX_SCOPES = 4;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FuturesCurvePage({ params, searchParams }: PageProps) {
  const { locale, indexCode } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  if (!isIndexCode(indexCode)) {
    notFound();
  }

  const typedCode: IndexCode = indexCode;
  const scopeIdsRaw = typeof sp.scope_ids === 'string' ? sp.scope_ids : '';
  const scopeIds = scopeIdsRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_REGEX.test(s))
    .slice(0, MAX_SCOPES);

  const t = await getTranslations({ locale, namespace: 'FuturesCurve' });

  let curves: ForwardCurve[] = [];
  if (scopeIds.length > 0) {
    try {
      const supabase = createAdminClient();
      const scopeType: FuturesScopeType = 'colonia';
      const results = await Promise.all(
        scopeIds.map((id) =>
          calculateForwardCurve({
            indexCode: typedCode,
            scopeType,
            scopeId: id,
            supabase,
          }).catch(() => null),
        ),
      );
      curves = results.filter((r): r is ForwardCurve => r !== null);
    } catch {
      curves = [];
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
              {t('breadcrumb_indices')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${locale}/indices/${typedCode}`} className="hover:underline">
              {typedCode}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('breadcrumb_futuros')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-[color:var(--color-text-primary)]">
          {t('title', { code: typedCode })}
        </h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('subtitle')}</p>
      </header>

      <FuturesCurveClient
        curves={curves}
        indexCode={typedCode}
        locale={locale}
        scopeIds={scopeIds}
      />

      <footer className="text-xs text-[color:var(--color-text-muted)]">
        {t('disclaimer_heuristic')}
      </footer>
    </main>
  );
}
