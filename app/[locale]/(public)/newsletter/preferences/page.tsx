// BLOQUE 11.J.3 — Newsletter preferences page.
// /[locale]/newsletter/preferences?token=XXXX — permite al subscriber editar
// frecuencia, zonas y secciones sin login. Valida token server-side contra
// newsletter_subscribers; si no existe → 404 visible.
//
// Nota sobre kind del token: reusamos `unsubscribe_token_hash` como token de
// preferencias. Alternativa documentada para A: añadir `preferences_token_hash`
// → L-NN-NEWSLETTER-PREFERENCES-TOKEN-KIND en ADR follow-up.

import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NewsletterPreferencesForm } from '@/features/newsletter/components/NewsletterPreferencesForm';
import type { NewsletterPreferences, NewsletterSubscriberRow } from '@/features/newsletter/types';
import { locales } from '@/shared/lib/i18n/config';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<{ token?: string; saved?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Newsletter.preferences' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/newsletter/preferences`] as const),
  ) as Record<string, string>;
  return {
    title: t('page.title'),
    description: t('page.meta_description'),
    alternates: {
      canonical: `/${locale}/newsletter/preferences`,
      languages,
    },
    robots: { index: false, follow: false },
  };
}

const DEFAULT_PREFS: NewsletterPreferences = {
  frequency: 'monthly',
  zone_scope_ids: [],
  sections: {
    pulse: true,
    migration: true,
    causal: true,
    alpha: false,
    scorecard: true,
    streaks: true,
  },
};

async function hashTokenHex(token: string): Promise<string> {
  const enc = new TextEncoder().encode(token);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(buf);
  let out = '';
  for (const b of bytes) {
    out += b.toString(16).padStart(2, '0');
  }
  return out;
}

async function resolveSubscriberByToken(
  token: string,
): Promise<null | Pick<
  NewsletterSubscriberRow,
  'id' | 'email' | 'locale' | 'status' | 'preferences'
>> {
  const tokenHash = await hashTokenHex(token);
  const supabase = createAdminClient();
  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        or: (filter: string) => {
          limit: (n: number) => Promise<{
            data: ReadonlyArray<unknown> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
  const { data, error } = await sb
    .from('newsletter_subscribers')
    .select('id, email, locale, status, preferences')
    .or(`unsubscribe_token_hash.eq.${tokenHash},confirm_token_hash.eq.${tokenHash}`)
    .limit(1);
  if (error) return null;
  const rows = (data ?? []) as ReadonlyArray<
    Pick<NewsletterSubscriberRow, 'id' | 'email' | 'locale' | 'status' | 'preferences'>
  >;
  return rows[0] ?? null;
}

export default async function PreferencesPage({ params, searchParams }: PageProps) {
  await connection();
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Newsletter.preferences' });

  const token = query.token;
  if (!token || token.length < 20) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
        <h1 className="text-2xl font-semibold">{t('page.title')}</h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('token_missing')}</p>
        <Link href={`/${locale}`} className="text-sm underline">
          {t('back_home')}
        </Link>
      </main>
    );
  }

  const subscriber = await resolveSubscriberByToken(token);
  if (subscriber === null) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
        <h1 className="text-2xl font-semibold">{t('page.title')}</h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('token_invalid')}</p>
        <Link href={`/${locale}`} className="text-sm underline">
          {t('back_home')}
        </Link>
      </main>
    );
  }

  const initialPrefs: NewsletterPreferences = subscriber.preferences ?? DEFAULT_PREFS;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[color:var(--color-text-primary)]">
          {t('page.title')}
        </h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">
          {t('page.subtitle', { email: subscriber.email })}
        </p>
        {query.saved === '1' ? (
          <p role="status" className="text-sm text-[color:var(--color-success)]">
            {t('success_message')}
          </p>
        ) : null}
      </header>

      <NewsletterPreferencesForm token={token} initialPreferences={initialPrefs} />

      <p className="text-xs text-[color:var(--color-text-secondary)]">
        <Link href={`/${locale}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`}>
          {t('unsubscribe_link')}
        </Link>
      </p>
    </main>
  );
}
