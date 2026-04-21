// FASE 11.J.2 — DMX Wrapped landing page (Spotify-style cards stack).
//
// RSC: user logged → personalizado; else → anon snapshot nacional.
// i18n namespace `Newsletter.wrapped.*`. Zero UUIDs en UI (resolveZoneLabelSync ya
// aplicado al momento de construir cards).

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  buildAnonWrapped,
  buildPersonalizedWrapped,
} from '@/features/newsletter/lib/wrapped-builder';
import type { WrappedCard } from '@/features/newsletter/types';
import { locales, localeToCountry } from '@/shared/lib/i18n/config';
import { createClient } from '@/shared/lib/supabase/server';

interface PageProps {
  readonly params: Promise<{ readonly locale: string; readonly year: string }>;
}

const MIN_YEAR = 2024;

function parseYear(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  if (n < MIN_YEAR) return null;
  if (n > new Date().getUTCFullYear()) return null;
  return n;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, year } = await params;
  const t = await getTranslations({ locale, namespace: 'Newsletter' });
  const yearNum = parseYear(year);
  const title = yearNum ? t('wrapped.page.title', { year: String(yearNum) }) : 'DMX Wrapped';
  const description = yearNum
    ? t('wrapped.page.meta_description', { year: String(yearNum) })
    : 'DMX Wrapped';
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/wrapped/${year}`] as const),
  ) as Record<string, string>;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/wrapped/${year}`,
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

export default async function WrappedYearPage({ params }: PageProps) {
  const { locale, year } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Newsletter' });

  const yearNum = parseYear(year);
  if (yearNum === null) {
    notFound();
  }

  const countryCode =
    locale in localeToCountry ? localeToCountry[locale as keyof typeof localeToCountry] : 'MX';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const snapshot =
    user !== null
      ? await buildPersonalizedWrapped({
          userId: user.id,
          year: yearNum,
          countryCode,
        })
      : await buildAnonWrapped({
          year: yearNum,
          countryCode,
        });

  const cards: readonly WrappedCard[] = snapshot.cards;

  return (
    <main
      className="min-h-screen bg-[color:var(--color-surface-base,#0a0a0a)] text-white"
      aria-label={t('wrapped.aria.landing', { year: String(yearNum) })}
    >
      <div className="mx-auto max-w-5xl px-6 py-12">
        <nav aria-label={t('wrapped.breadcrumb')} className="mb-8 text-xs text-white/60">
          <ol className="flex items-center gap-2">
            <li>
              <Link href={`/${locale}`} className="hover:underline">
                DesarrollosMX
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-white">
              {t('wrapped.breadcrumb')}
            </li>
          </ol>
        </nav>

        <header className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl">
            {t('wrapped.hero.title', { year: String(yearNum) })}
          </h1>
          <p className="mt-4 text-lg text-white/70 md:text-xl">{t('wrapped.hero.subtitle')}</p>
        </header>

        <section
          aria-label={t('wrapped.aria.cards_list')}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 motion-reduce:gap-3"
        >
          {cards.map((card) => {
            const key = `${card.kind}-${card.title}-${card.value}`;
            return (
              <article
                key={key}
                className="rounded-[var(--radius-lg)] border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 shadow-lg backdrop-blur transition hover:border-white/30 motion-reduce:transition-none"
              >
                {card.emoji ? (
                  <div aria-hidden="true" className="mb-3 text-4xl">
                    {card.emoji}
                  </div>
                ) : null}
                <p className="text-xs uppercase tracking-wide text-white/60">{card.title}</p>
                <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
                {card.subtext ? <p className="mt-1 text-sm text-white/70">{card.subtext}</p> : null}
              </article>
            );
          })}
        </section>

        <footer className="mt-16 text-center">
          <Link
            href={`/${locale}/indices`}
            className="inline-block rounded-full bg-white px-6 py-3 font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            {t('wrapped.cta.explore_indices')}
          </Link>
          <p className="mt-6 text-xs text-white/40">
            {t('wrapped.footer.generated_at', {
              date: new Date(snapshot.generated_at).toISOString().slice(0, 10),
            })}
          </p>
        </footer>
      </div>
    </main>
  );
}
