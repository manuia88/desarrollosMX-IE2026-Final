import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildMagnetExodusRanking } from '@/features/scorecard-nacional/lib/magnet-exodus';
import type { MagnetExodusRow } from '@/features/scorecard-nacional/types';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  params: Promise<{ locale: string }>;
}

function computeLastClosedQuarterStart(today: Date = new Date()): string {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1; // 1-12
  const currentQuarter = Math.floor((month - 1) / 3) + 1;
  const lastQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  const lastQuarterYear = currentQuarter === 1 ? year - 1 : year;
  const startMonth = (lastQuarter - 1) * 3 + 1;
  return `${lastQuarterYear}-${String(startMonth).padStart(2, '0')}-01`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'ScorecardNacional.magnetExodus',
  });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/magnet-exodus`] as const),
  ) as Record<string, string>;

  return {
    title: t('page.title'),
    description: t('page.meta_description'),
    alternates: {
      canonical: `/${locale}/indices/magnet-exodus`,
      languages,
    },
    openGraph: {
      title: t('page.title'),
      description: t('page.meta_description'),
      type: 'website',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('page.title'),
      description: t('page.meta_description'),
    },
    robots: { index: true, follow: true },
  };
}

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function formatPct(pct: number): string {
  return `${(pct * 100).toFixed(1)}%`;
}

function LeaderboardTable({
  rows,
  tierLabel,
  headerLabels,
}: {
  readonly rows: readonly MagnetExodusRow[];
  readonly tierLabel: string;
  readonly headerLabels: {
    readonly rank: string;
    readonly zone: string;
    readonly inflow: string;
    readonly outflow: string;
    readonly net: string;
    readonly pct: string;
  };
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)]">
      <table className="w-full text-sm">
        <caption className="sr-only">{tierLabel}</caption>
        <thead className="bg-[color:var(--color-surface-muted)] text-left text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
          <tr>
            <th scope="col" className="px-3 py-2">
              {headerLabels.rank}
            </th>
            <th scope="col" className="px-3 py-2">
              {headerLabels.zone}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {headerLabels.inflow}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {headerLabels.outflow}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {headerLabels.net}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {headerLabels.pct}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.scope_type}:${r.zone_id}`}
              className="border-t border-[color:var(--color-border-subtle)]"
            >
              <td className="px-3 py-2 font-medium">{r.rank}</td>
              <td className="px-3 py-2">{r.zone_label}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.inflow}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.outflow}</td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold">
                {formatSigned(r.net_flow)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatPct(r.net_flow_pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function MagnetExodusPage({ params }: PageProps) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'ScorecardNacional.magnetExodus',
  });

  const periodDate = computeLastClosedQuarterStart();
  const ranking = await buildMagnetExodusRanking('MX', periodDate, { limit: 10 });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: t('page.title'),
    description: t('page.meta_description'),
    inLanguage: locale,
    creator: {
      '@type': 'Organization',
      name: 'DesarrollosMX',
      url: `/${locale}`,
    },
    temporalCoverage: ranking.period_date,
    spatialCoverage: {
      '@type': 'Country',
      name: 'MX',
    },
  };

  const headerLabels = {
    rank: t('table.rank'),
    zone: t('table.zone'),
    inflow: t('table.inflow'),
    outflow: t('table.outflow'),
    net: t('table.net_flow'),
    pct: t('table.net_flow_pct'),
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
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
            <Link href={`/${locale}/indices`} className="hover:underline">
              {t('breadcrumb')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('page.title')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-[color:var(--color-text-primary)]">
          {t('hero.title')}
        </h1>
        <p className="text-base text-[color:var(--color-text-secondary)]">{t('hero.subtitle')}</p>
        <p className="text-xs text-[color:var(--color-text-secondary)]">
          {t('hero.period_label')}: {ranking.period_date}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="space-y-3">
          <h2 className="text-xl font-semibold text-[color:var(--color-text-primary)]">
            {t('tier_magnet')}
          </h2>
          {ranking.top_magnets.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-secondary)]">{t('empty')}</p>
          ) : (
            <LeaderboardTable
              rows={ranking.top_magnets}
              tierLabel={t('tier_magnet')}
              headerLabels={headerLabels}
            />
          )}
        </article>

        <article className="space-y-3">
          <h2 className="text-xl font-semibold text-[color:var(--color-text-primary)]">
            {t('tier_exodus')}
          </h2>
          {ranking.top_exodus.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-secondary)]">{t('empty')}</p>
          ) : (
            <LeaderboardTable
              rows={ranking.top_exodus}
              tierLabel={t('tier_exodus')}
              headerLabels={headerLabels}
            />
          )}
        </article>
      </section>

      {ranking.prose_md !== null && ranking.prose_md.length > 0 ? (
        <section
          aria-label={t('prose_label')}
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] p-6 text-sm leading-relaxed text-[color:var(--color-text-primary)]"
        >
          {ranking.prose_md}
        </section>
      ) : null}

      <nav
        aria-label={t('breadcrumb')}
        className="flex flex-wrap gap-3 border-t border-[color:var(--color-border-subtle)] pt-6 text-sm"
      >
        <Link
          href={`/${locale}/scorecard-nacional`}
          className="text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:underline"
        >
          {t('cta_scorecard')}
        </Link>
        <Link
          href={`/${locale}/indices/flujos`}
          className="text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:underline"
        >
          /indices/flujos
        </Link>
        <Link
          href={`/${locale}/indices/alpha`}
          className="text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:underline"
        >
          /indices/alpha
        </Link>
      </nav>
    </main>
  );
}
