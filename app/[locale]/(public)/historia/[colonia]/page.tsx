import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  buildCausalTimeline,
  type IndexCode,
  isIndexCode,
} from '@/features/scorecard-nacional/lib/causal-timeline';
import { locales } from '@/shared/lib/i18n/config';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  params: Promise<{ locale: string; colonia: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const HISTORIA_FALLBACK_INDEX: IndexCode = 'DMX-MOM';

function resolveIndexCodeFromParam(raw: string | string[] | undefined): IndexCode {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (typeof candidate === 'string' && isIndexCode(candidate)) return candidate;
  return HISTORIA_FALLBACK_INDEX;
}

interface PulseCurrentRow {
  readonly pulse_score: number | null;
  readonly period_date: string;
}

async function fetchLatestPulse(zoneId: string): Promise<PulseCurrentRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('zone_pulse_scores')
    .select('pulse_score, period_date')
    .eq('scope_id', zoneId)
    .order('period_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as PulseCurrentRow;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, colonia } = await params;
  const t = await getTranslations({ locale, namespace: 'ScorecardNacional' });
  const title = t('historia.title', { colonia });
  const description = t('historia.meta_description', { colonia });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/historia/${colonia}`] as const),
  ) as Record<string, string>;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/historia/${colonia}`,
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

export default async function HistoriaColoniaPage({ params, searchParams }: PageProps) {
  const { locale, colonia } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ScorecardNacional' });

  const resolvedSearchParams = (await searchParams) ?? {};
  const indexCode = resolveIndexCodeFromParam(resolvedSearchParams.indice);

  // Public render: zero LLM cost. Consume raw data + deterministic stub.
  const bundle = await buildCausalTimeline(colonia, 'MX', 12, { indexCode }).catch(() => null);
  if (!bundle || bundle.entries.length === 0) {
    notFound();
  }

  const pulse = await fetchLatestPulse(colonia);

  const latestPeriod = bundle.entries[bundle.entries.length - 1]?.period_date ?? null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t('historia.title', { colonia: bundle.zone_label }),
    inLanguage: locale,
    datePublished: bundle.entries[0]?.period_date ?? null,
    dateModified: latestPeriod,
    publisher: {
      '@type': 'Organization',
      name: 'DesarrollosMX',
    },
    about: {
      '@type': 'Place',
      name: bundle.zone_label,
    },
  };

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
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
            {bundle.zone_label}
          </li>
        </ol>
      </nav>

      <header className="space-y-4">
        <h1 className="text-4xl font-semibold text-[color:var(--color-text-primary)]">
          {t('historia.title', { colonia: bundle.zone_label })}
        </h1>
        <dl className="grid gap-4 sm:grid-cols-2">
          {pulse?.pulse_score !== null && pulse?.pulse_score !== undefined ? (
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-4">
              <dt className="text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
                {t('historia.pulse_current')}
              </dt>
              <dd className="mt-2 text-3xl font-semibold text-[color:var(--color-text-primary)]">
                {Math.round(pulse.pulse_score)}
                <span className="ml-1 text-sm text-[color:var(--color-text-secondary)]">/100</span>
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section aria-labelledby="narrative-heading" className="space-y-4">
        <h2
          id="narrative-heading"
          className="text-2xl font-semibold text-[color:var(--color-text-primary)]"
        >
          {t('historia.narrative_title')}
        </h2>
        <pre className="whitespace-pre-wrap rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5 font-sans text-sm leading-relaxed text-[color:var(--color-text-primary)]">
          {bundle.narrative_md}
        </pre>
      </section>

      <section aria-labelledby="timeline-heading" className="space-y-4">
        <h2
          id="timeline-heading"
          className="text-2xl font-semibold text-[color:var(--color-text-primary)]"
        >
          {t('historia.timeline_title')}
        </h2>
        <ol className="space-y-3">
          {bundle.entries.map((entry) => (
            <li
              key={`${entry.zone_id}-${entry.period_date}`}
              className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-4"
            >
              <article aria-label={entry.period_date}>
                <header className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[color:var(--color-text-primary)]">
                    {entry.period_date}
                  </h3>
                  <span className="text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
                    {entry.metric_id}
                  </span>
                </header>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-text-primary)]">
                  {entry.explanation_md}
                </p>
              </article>
            </li>
          ))}
        </ol>
      </section>

      {bundle.alpha_journey_md ? (
        <section aria-labelledby="alpha-heading" className="space-y-4">
          <h2
            id="alpha-heading"
            className="text-2xl font-semibold text-[color:var(--color-text-primary)]"
          >
            {t('historia.alpha_journey_title')}
          </h2>
          <pre className="whitespace-pre-wrap rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5 font-sans text-sm leading-relaxed text-[color:var(--color-text-primary)]">
            {bundle.alpha_journey_md}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
