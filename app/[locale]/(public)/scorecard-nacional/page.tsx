import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales } from '@/shared/lib/i18n/config';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface ArchiveRow {
  readonly report_id: string;
  readonly period_type: string;
  readonly period_date: string;
  readonly country_code: string;
  readonly pdf_url: string | null;
  readonly press_kit_url: string | null;
  readonly published_at: string | null;
}

async function fetchArchive(): Promise<readonly ArchiveRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('scorecard_national_reports')
    .select(
      'report_id, period_type, period_date, country_code, pdf_url, press_kit_url, published_at',
    )
    .eq('country_code', 'MX')
    .not('published_at', 'is', null)
    .order('period_date', { ascending: false })
    .limit(12);
  if (error) return [];
  return (data ?? []) as readonly ArchiveRow[];
}

function formatPeriod(
  periodDate: string,
  periodType: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const [yearStr, monthStr] = periodDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (periodType === 'quarterly') {
    const q = Math.floor((month - 1) / 3) + 1;
    return t('landing.period_quarterly', { q, year });
  }
  if (periodType === 'annual') {
    return t('landing.period_annual', { year });
  }
  return t('landing.period_monthly', {
    month: String(month).padStart(2, '0'),
    year,
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ScorecardNacional' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/scorecard-nacional`] as const),
  ) as Record<string, string>;
  const title = t('landing.title');
  const description = t('landing.meta_description');
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/scorecard-nacional`,
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
    robots: { index: true, follow: true },
  };
}

export default async function ScorecardLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ScorecardNacional' });
  const archive = await fetchArchive();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('landing.title'),
    description: t('landing.meta_description'),
    inLanguage: locale,
    publisher: {
      '@type': 'Organization',
      name: 'DesarrollosMX',
    },
    hasPart: archive.map((r) => ({
      '@type': 'Report',
      name: `DMX Scorecard ${r.report_id}`,
      datePublished: r.published_at ?? r.period_date,
      url: `/${locale}/scorecard-nacional/${r.report_id}`,
    })),
  };

  const latest = archive[0];

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD SEO
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label={t('breadcrumb')}
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
            {t('breadcrumb')}
          </li>
        </ol>
      </nav>

      <header className="space-y-4">
        <h1 className="text-4xl font-semibold text-[color:var(--color-text-primary)]">
          {t('landing.title')}
        </h1>
        <p className="text-lg text-[color:var(--color-text-secondary)]">{t('landing.subtitle')}</p>
        {latest?.pdf_url ? (
          <a
            href={latest.pdf_url}
            className="inline-flex items-center rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-accent)] px-5 py-3 text-sm font-medium text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
            aria-label={t('landing.hero_cta')}
          >
            {t('landing.hero_cta')}
          </a>
        ) : null}
      </header>

      <section aria-labelledby="archive-heading" className="space-y-4">
        <h2
          id="archive-heading"
          className="text-2xl font-semibold text-[color:var(--color-text-primary)]"
        >
          {t('landing.archive_title')}
        </h2>
        {archive.length === 0 ? (
          <p className="text-[color:var(--color-text-secondary)]">{t('landing.archive_empty')}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archive.map((r) => (
              <li
                key={r.report_id}
                className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5"
              >
                <article className="flex h-full flex-col gap-3" aria-label={r.report_id}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
                      {r.period_type}
                    </span>
                    <span className="text-xs text-[color:var(--color-text-secondary)]">
                      {r.country_code}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">
                    <Link
                      href={`/${locale}/scorecard-nacional/${r.report_id}`}
                      className="hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      {formatPeriod(r.period_date, r.period_type, t)}
                    </Link>
                  </h3>
                  <p className="text-sm text-[color:var(--color-text-secondary)]">{r.report_id}</p>
                  <div className="mt-auto flex flex-wrap gap-3 text-sm">
                    {r.pdf_url ? (
                      <a
                        href={r.pdf_url}
                        className="text-[color:var(--color-text-primary)] hover:underline"
                      >
                        {t('landing.download_pdf')}
                      </a>
                    ) : null}
                    {r.press_kit_url ? (
                      <a
                        href={r.press_kit_url}
                        className="text-[color:var(--color-text-secondary)] hover:underline"
                      >
                        {t('landing.download_press_kit')}
                      </a>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
