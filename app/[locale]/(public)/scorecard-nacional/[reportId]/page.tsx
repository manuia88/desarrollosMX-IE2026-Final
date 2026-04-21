import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { scorecardNationalReportRowSchema } from '@/features/scorecard-nacional/schemas/scorecard';
import { locales } from '@/shared/lib/i18n/config';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  params: Promise<{ locale: string; reportId: string }>;
}

interface HeroInsightShape {
  readonly headline?: unknown;
  readonly zone_label?: unknown;
  readonly value?: unknown;
  readonly unit?: unknown;
}

async function fetchReport(reportId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('scorecard_national_reports')
    .select('*')
    .eq('report_id', reportId)
    .not('published_at', 'is', null)
    .maybeSingle();
  if (error || !data) return null;
  const parsed = scorecardNationalReportRowSchema.safeParse(data);
  if (!parsed.success) return null;
  return parsed.data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, reportId } = await params;
  const t = await getTranslations({ locale, namespace: 'ScorecardNacional' });
  const title = t('detail.title', { reportId });
  const description = t('detail.meta_description', { reportId });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/scorecard-nacional/${reportId}`] as const),
  ) as Record<string, string>;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/scorecard-nacional/${reportId}`,
      languages,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ScorecardDetailPage({ params }: PageProps) {
  const { locale, reportId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ScorecardNacional' });

  const report = await fetchReport(reportId);
  if (!report) {
    notFound();
  }

  const heroInsights = Array.isArray(report.hero_insights)
    ? (report.hero_insights as readonly HeroInsightShape[])
    : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Report',
    name: `DMX Scorecard ${report.report_id}`,
    datePublished: report.published_at ?? report.period_date,
    inLanguage: locale,
    publisher: {
      '@type': 'Organization',
      name: 'DesarrollosMX',
    },
    ...(report.pdf_url ? { url: report.pdf_url } : {}),
  };

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-6 py-10">
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
          <li>
            <Link href={`/${locale}/scorecard-nacional`} className="hover:underline">
              {t('breadcrumb')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {report.report_id}
          </li>
        </ol>
      </nav>

      <header className="space-y-3">
        <span className="text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
          {report.period_type} · {report.country_code}
        </span>
        <h1 className="text-4xl font-semibold text-[color:var(--color-text-primary)]">
          {t('detail.title', { reportId: report.report_id })}
        </h1>
        <p className="text-base text-[color:var(--color-text-secondary)]">{report.period_date}</p>
      </header>

      {heroInsights.length > 0 ? (
        <section aria-labelledby="hero-insights-heading" className="space-y-4">
          <h2
            id="hero-insights-heading"
            className="text-2xl font-semibold text-[color:var(--color-text-primary)]"
          >
            {t('detail.hero_insights_title')}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {heroInsights.map((hi) => {
              const headline = typeof hi.headline === 'string' ? hi.headline : '';
              const zoneLabel = typeof hi.zone_label === 'string' ? hi.zone_label : '';
              const valueText = typeof hi.value === 'number' ? hi.value.toFixed(2) : '';
              const unit = typeof hi.unit === 'string' ? hi.unit : '';
              const stableKey = `${headline}|${zoneLabel}|${valueText}|${unit}`;
              return (
                <li
                  key={stableKey}
                  className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5"
                >
                  <p className="text-sm font-medium text-[color:var(--color-text-primary)]">
                    {headline}
                  </p>
                  {zoneLabel ? (
                    <p className="mt-2 text-xs text-[color:var(--color-text-secondary)]">
                      {zoneLabel}
                    </p>
                  ) : null}
                  {valueText ? (
                    <p className="mt-3 text-xl font-semibold text-[color:var(--color-text-primary)]">
                      {valueText}
                      {unit ? (
                        <span className="ml-1 text-xs text-[color:var(--color-text-secondary)]">
                          {unit}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {report.narrative_md ? (
        <section aria-labelledby="executive-summary-heading" className="space-y-4">
          <h2
            id="executive-summary-heading"
            className="text-2xl font-semibold text-[color:var(--color-text-primary)]"
          >
            {t('detail.executive_summary')}
          </h2>
          <pre className="whitespace-pre-wrap rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5 font-sans text-sm leading-relaxed text-[color:var(--color-text-primary)]">
            {report.narrative_md}
          </pre>
        </section>
      ) : null}

      <footer className="flex flex-wrap gap-4 border-t border-[color:var(--color-border-subtle)] pt-6 text-sm">
        {report.pdf_url ? (
          <a
            href={report.pdf_url}
            className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-accent)] px-4 py-2 font-medium text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          >
            {t('detail.cta_download')}
          </a>
        ) : null}
        {report.press_kit_url ? (
          <a
            href={report.press_kit_url}
            className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] px-4 py-2 text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          >
            Press Kit
          </a>
        ) : null}
      </footer>
    </main>
  );
}
