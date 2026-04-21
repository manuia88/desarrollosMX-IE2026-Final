// FASE 11.J.10 — Unsubscribe landing (server component).
//
// Verifica el token (sin consumir) + muestra form de confirmación 1-click.
// Form POST a /api/newsletter/unsubscribe/[token] via action endpoint.
// LFPDPPP + CAN-SPAM disclaimer en footer.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { verifyToken } from '@/features/newsletter/lib/tokens';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  readonly params: Promise<{ readonly locale: string; readonly token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, token } = await params;
  const t = await getTranslations({ locale, namespace: 'Newsletter' });
  const title = t('unsubscribe.page.title');
  const description = t('unsubscribe.page.meta_description');
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/newsletter/unsubscribe/${token}`] as const),
  ) as Record<string, string>;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${locale}/newsletter/unsubscribe/${token}`,
      languages,
    },
  };
}

export default async function UnsubscribeLandingPage({ params }: PageProps) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Newsletter' });

  const verified = verifyToken(token, 'unsubscribe');

  if (!verified) {
    return (
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="text-2xl font-semibold">{t('unsubscribe.invalid.title')}</h1>
        <p className="mt-4 text-sm text-[color:var(--color-text-secondary)]">
          {t('unsubscribe.invalid.body')}
        </p>
        <p className="mt-6">
          <Link href={`/${locale}`} className="text-sm underline">
            {t('unsubscribe.invalid.back_home')}
          </Link>
        </p>
      </main>
    );
  }

  const actionUrl = `/api/newsletter/unsubscribe/${encodeURIComponent(token)}`;

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-[color:var(--color-text-primary)]">
        {t('unsubscribe.title')}
      </h1>
      <p className="mt-3 text-sm text-[color:var(--color-text-secondary)]">
        {t('unsubscribe.body', { email: verified.email })}
      </p>

      <form
        method="post"
        action={actionUrl}
        className="mt-6 space-y-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5"
      >
        <label className="block text-sm">
          <span className="font-medium text-[color:var(--color-text-primary)]">
            {t('unsubscribe.reason_label')}
          </span>
          <textarea
            name="reason"
            maxLength={500}
            rows={3}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] p-2 text-sm"
            placeholder={t('unsubscribe.reason_placeholder')}
          />
        </label>
        <button
          type="submit"
          className="rounded-[var(--radius-md)] bg-[color:var(--color-surface-accent)] px-4 py-2 text-sm font-medium text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
        >
          {t('unsubscribe.confirm_cta')}
        </button>
      </form>

      <footer className="mt-8 text-xs text-[color:var(--color-text-secondary)]">
        {t('unsubscribe.compliance_note')}
      </footer>
    </main>
  );
}
