// FASE 11.J.11 — Admin Newsletter A/B dashboard (stub).
//
// Lista tests, muestra variant A/B + sample + open rates + winner.
// "Compute winner" via server action → triggers computeWinner().
// Requiere auth admin (mismo patrón que /admin/ingest/market).

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { computeWinner } from '@/features/newsletter/lib/ab-testing';
import { asRaw } from '@/features/newsletter/lib/raw-supabase';
import type { NewsletterAbTestRow } from '@/features/newsletter/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

interface PageProps {
  readonly params: Promise<{ readonly locale: string }>;
}

const ADMIN_ROLES = new Set(['superadmin', 'mb_admin']);

async function requireAdmin(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/admin/newsletter-ab`);
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ADMIN_ROLES.has(profile.rol)) {
    redirect(`/${locale}/`);
  }
}

async function computeWinnerAction(formData: FormData): Promise<void> {
  'use server';
  const abTestId = formData.get('ab_test_id');
  if (typeof abTestId !== 'string' || abTestId.length === 0) return;
  await computeWinner({ abTestId });
}

export default async function AdminNewsletterAbPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: 'Newsletter' });

  const supabase = asRaw(createAdminClient());
  const { data } = await supabase
    .from('newsletter_ab_tests')
    .select('*')
    .order('period_date', { ascending: false })
    .limit(50);

  const tests = (data ?? []) as ReadonlyArray<NewsletterAbTestRow>;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('ab.admin.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('ab.admin.subtitle')}</p>
      </header>

      {tests.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('ab.admin.empty')}</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[color:var(--color-surface-raised)] text-left">
            <tr>
              <th className="p-2">{t('ab.admin.col_template')}</th>
              <th className="p-2">{t('ab.admin.col_period')}</th>
              <th className="p-2">{t('ab.admin.col_subject_a')}</th>
              <th className="p-2">{t('ab.admin.col_subject_b')}</th>
              <th className="p-2">{t('ab.admin.col_sample')}</th>
              <th className="p-2">{t('ab.admin.col_rate_a')}</th>
              <th className="p-2">{t('ab.admin.col_rate_b')}</th>
              <th className="p-2">{t('ab.admin.col_winner')}</th>
              <th className="p-2">{t('ab.admin.col_action')}</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((row) => (
              <tr key={row.id} className="border-t border-[color:var(--color-border-subtle)]">
                <td className="p-2 font-mono text-xs">{row.template}</td>
                <td className="p-2">{row.period_date}</td>
                <td className="p-2 max-w-[200px] truncate">{row.variant_a_subject}</td>
                <td className="p-2 max-w-[200px] truncate">{row.variant_b_subject}</td>
                <td className="p-2">{row.sample_size}</td>
                <td className="p-2">
                  {row.variant_a_open_rate !== null
                    ? `${(row.variant_a_open_rate * 100).toFixed(2)}%`
                    : '—'}
                </td>
                <td className="p-2">
                  {row.variant_b_open_rate !== null
                    ? `${(row.variant_b_open_rate * 100).toFixed(2)}%`
                    : '—'}
                </td>
                <td className="p-2 font-semibold">{row.winner_variant ?? '—'}</td>
                <td className="p-2">
                  <form action={computeWinnerAction}>
                    <input type="hidden" name="ab_test_id" value={row.id} />
                    <button
                      type="submit"
                      className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] px-2 py-1 text-xs hover:bg-[color:var(--color-surface-hover)]"
                    >
                      {t('ab.admin.cta_compute_winner')}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
