// BLOQUE 11.J.4 — Strava Segments streaks público.
// /[locale]/indices/streaks — top 10 zonas con más meses consecutivos de
// pulse > 80 en el país (MX por ahora).

import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { computeZoneStreaks } from '@/features/newsletter/lib/streaks-calculator';
import type { ZoneStreakRow } from '@/features/newsletter/types';
import { locales } from '@/shared/lib/i18n/config';
import { resolveZoneLabelSync, type ZoneScopeType } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  readonly params: Promise<{ locale: string }>;
}

const COUNTRY_CODE = 'MX';

function currentMonthStartIso(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function previousMonthStartIso(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const py = m === 0 ? y - 1 : y;
  const pm = m === 0 ? 12 : m;
  return `${py}-${String(pm).padStart(2, '0')}-01`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Newsletter.streaks' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/indices/streaks`] as const),
  ) as Record<string, string>;
  return {
    title: t('page.title'),
    description: t('page.meta_description'),
    alternates: {
      canonical: `/${locale}/indices/streaks`,
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

async function loadStreaks(): Promise<{
  readonly rows: ReadonlyArray<ZoneStreakRow>;
  readonly periodDate: string;
}> {
  const supabase = createAdminClient();
  const periodDate = previousMonthStartIso();
  const currentMonth = currentMonthStartIso();

  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (
          c: string,
          v: unknown,
        ) => {
          eq: (
            c: string,
            v: unknown,
          ) => {
            order: (
              c: string,
              o: { ascending: boolean },
            ) => {
              limit: (n: number) => Promise<{
                data: ReadonlyArray<ZoneStreakRow> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };
  };

  const { data } = await sb
    .from('zone_streaks')
    .select(
      'id, country_code, scope_type, scope_id, period_date, streak_length_months, current_pulse, rank_in_country, computed_at',
    )
    .eq('country_code', COUNTRY_CODE)
    .eq('period_date', periodDate)
    .order('rank_in_country', { ascending: true })
    .limit(10);

  const cached = Array.isArray(data) ? data : [];
  if (cached.length > 0) {
    return { rows: cached, periodDate };
  }

  // Fallback on-the-fly compute (graceful if cron hasn't run yet for the period).
  try {
    const computed = await computeZoneStreaks({
      countryCode: COUNTRY_CODE,
      periodDate,
    });
    return { rows: computed, periodDate };
  } catch {
    return { rows: [], periodDate: currentMonth };
  }
}

export default async function StreaksPage({ params }: PageProps) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Newsletter.streaks' });

  const { rows, periodDate } = await loadStreaks();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: t('page.title'),
    description: t('page.meta_description'),
    inLanguage: locale,
    temporalCoverage: periodDate,
    creator: {
      '@type': 'Organization',
      name: 'DesarrollosMX',
      url: `/${locale}`,
    },
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
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
        <h1 className="flex items-center gap-2 text-3xl font-semibold text-[color:var(--color-text-primary)]">
          <span aria-hidden="true" className="streaks-fire motion-reduce:animate-none">
            🔥
          </span>
          {t('hero.title')}
        </h1>
        <p className="text-base text-[color:var(--color-text-secondary)]">{t('hero.subtitle')}</p>
        <p className="text-xs text-[color:var(--color-text-secondary)]">
          {t('hero.period_label')}: {periodDate}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('empty')}</p>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)]">
          <table className="w-full text-sm" aria-label={t('aria_table')}>
            <thead className="bg-[color:var(--color-surface-muted)] text-left text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
              <tr>
                <th scope="col" className="px-3 py-2">
                  {t('table.rank')}
                </th>
                <th scope="col" className="px-3 py-2">
                  {t('table.zone')}
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  {t('table.streak_length')}
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  {t('table.current_pulse')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const label = resolveZoneLabelSync({
                  scopeType: row.scope_type as ZoneScopeType,
                  scopeId: row.scope_id,
                });
                return (
                  <tr
                    key={`${row.scope_type}:${row.scope_id}`}
                    className="border-t border-[color:var(--color-border-subtle)]"
                  >
                    <td className="px-3 py-2 font-medium">#{row.rank_in_country}</td>
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {row.streak_length_months} {t('table.months')}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.current_pulse.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .streaks-fire { animation: streaks-fire-pulse 2.4s ease-in-out infinite; display: inline-block; }
          @keyframes streaks-fire-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
        }
      `}</style>
    </main>
  );
}
