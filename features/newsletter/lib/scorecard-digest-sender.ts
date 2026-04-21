// BLOQUE 11.J.6 — Scorecard Newsletter sender.
//
// Orquesta envío masivo de digests Scorecard (preview o post-publish) a
// suscriptores activos con preferences.sections.scorecard=true.
//
// Provider: acepta EmailProviderAdapter inyectado (dependency injection).
// Si no se inyecta, usa defaultMockProvider local (L-NN-RESEND-INSTALL).
// SUB-AGENT A crea features/newsletter/lib/email-provider.ts con el
// MockEmailProvider canónico; este sender NO lo importa directamente para
// evitar race conditions entre sesiones CC paralelas. Post-integration, el
// cron route debe inyectar el provider canónico.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import {
  renderScorecardDigestPostEmail,
  renderScorecardDigestPreviewEmail,
} from '../templates/scorecard-digest-post';
import type {
  EmailSendInput,
  EmailSendResult,
  NewsletterLocale,
  NewsletterPreferences,
  NewsletterSubscriberStatus,
  ScorecardDigestBundle,
} from '../types';
import { buildScorecardDigest, type ScorecardDigestMode } from './scorecard-digest-builder';
// Re-export helper pulling from preview template lives adjacent; templates
// use renderScorecardDigestEmail naming — we import both renders explicitly
// from their own modules below.

export interface EmailProviderAdapter {
  send(input: EmailSendInput): Promise<EmailSendResult>;
}

export const defaultMockProvider: EmailProviderAdapter = {
  async send(input) {
    // Stub: loggea + acepta silenciosamente. L-NN-RESEND-INSTALL.
    void input;
    return {
      providerMessageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: 'mock',
      accepted: true,
      error: null,
    };
  },
};

interface SubscriberRow {
  readonly id: string;
  readonly email: string;
  readonly locale: NewsletterLocale;
  readonly status: NewsletterSubscriberStatus;
  readonly preferences: NewsletterPreferences;
  readonly unsubscribe_token_hash: string | null;
}

export interface SendScorecardDigestOptions {
  readonly reportId: string;
  readonly countryCode: string;
  readonly mode: ScorecardDigestMode;
  readonly supabase?: SupabaseClient<Database>;
  readonly provider?: EmailProviderAdapter;
  readonly siteUrl?: string;
  readonly dryRun?: boolean;
}

export interface SendScorecardDigestResult {
  readonly sent: number;
  readonly failed: number;
  readonly skipped: number;
  readonly reportId: string;
  readonly mode: ScorecardDigestMode;
  readonly dryRun: boolean;
}

// Fetch suscriptores con preferences.sections.scorecard=true agrupados por
// locale (para enviar digest en el idioma del subscriber). Status='active'.
// `newsletter_subscribers` / `newsletter_deliveries` aún no están en
// `shared/types/database.ts` (pending `npm run db:types` post merge de la
// migration de SUB-AGENT A). Narrow vía unknown para evitar errores de
// overload sin introducir `any`. L-NN-DB-TYPES-REGEN → resolver tras merge.
interface RawQueryResult<T = unknown> {
  readonly data: readonly T[] | null;
  readonly error: { message: string } | null;
}
interface RawSelectBuilder extends PromiseLike<RawQueryResult> {
  readonly select: (cols: string) => RawSelectBuilder;
  readonly eq: (col: string, value: unknown) => RawSelectBuilder;
  readonly gte: (col: string, value: unknown) => RawSelectBuilder;
  readonly lte: (col: string, value: unknown) => RawSelectBuilder;
}
interface RawTable {
  readonly select: (cols: string) => RawSelectBuilder;
  readonly insert: (
    payload: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
}
interface RawSupabase {
  readonly from: (table: string) => RawTable;
}

function asRaw(client: SupabaseClient<Database>): RawSupabase {
  return client as unknown as RawSupabase;
}

async function fetchEligibleSubscribers(
  client: SupabaseClient<Database>,
): Promise<readonly SubscriberRow[]> {
  const resp = await asRaw(client)
    .from('newsletter_subscribers')
    .select('id, email, locale, status, preferences, unsubscribe_token_hash')
    .eq('status', 'active');
  if (resp.error) {
    throw new Error(`scorecard_digest_sender: subscribers query failed: ${resp.error.message}`);
  }
  const rows = (resp.data ?? []) as unknown as readonly SubscriberRow[];
  return rows.filter((r) => {
    const sections = r.preferences?.sections;
    return sections?.scorecard === true;
  });
}

async function recordDelivery(
  client: SupabaseClient<Database>,
  payload: {
    subscriberId: string;
    template: 'scorecard-digest-preview' | 'scorecard-digest-post';
    subject: string;
    status: 'sent' | 'failed';
    providerMessageId: string | null;
    error?: string | null;
    reportId: string;
  },
): Promise<void> {
  const { error } = await asRaw(client)
    .from('newsletter_deliveries')
    .insert({
      subscriber_id: payload.subscriberId,
      template: payload.template,
      subject: payload.subject,
      status: payload.status,
      provider_message_id: payload.providerMessageId,
      bounced_reason: payload.error ?? null,
      payload_summary: {
        report_id: payload.reportId,
        sender: 'scorecard-digest-sender',
      },
    });
  if (error) {
    // Fallback log — no tumba el batch.
    console.error('[scorecard_digest_sender] delivery insert failed', {
      subscriberId: payload.subscriberId,
      error: error.message,
    });
  }
}

function renderFor(
  mode: ScorecardDigestMode,
  bundle: ScorecardDigestBundle,
  subscriber: SubscriberRow,
): { html: string; text: string; subject: string } {
  if (mode === 'preview') {
    return renderScorecardDigestPreviewEmail(bundle, subscriber);
  }
  return renderScorecardDigestPostEmail(bundle, subscriber);
}

export async function sendScorecardDigestPreviews(
  opts: Omit<SendScorecardDigestOptions, 'mode'>,
): Promise<SendScorecardDigestResult> {
  return sendScorecardDigest({ ...opts, mode: 'preview' });
}

export async function sendScorecardDigestPosts(
  opts: Omit<SendScorecardDigestOptions, 'mode'>,
): Promise<SendScorecardDigestResult> {
  return sendScorecardDigest({ ...opts, mode: 'post' });
}

export async function sendScorecardDigest(
  opts: SendScorecardDigestOptions,
): Promise<SendScorecardDigestResult> {
  const {
    reportId,
    countryCode,
    mode,
    supabase,
    provider = defaultMockProvider,
    siteUrl,
    dryRun = false,
  } = opts;
  void countryCode; // reservado para filtrar subscribers por país en H2

  const client = supabase ?? createAdminClient();
  const bundleBase = await buildScorecardDigest({
    reportId,
    mode,
    supabase: client,
    ...(siteUrl ? { siteUrl } : {}),
  });

  const subscribers = await fetchEligibleSubscribers(client);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const subscriber of subscribers) {
    if (!subscriber.email) {
      skipped += 1;
      continue;
    }

    // Re-bundle con locale del subscriber (CTA URL cambia idioma).
    const bundle = await buildScorecardDigest({
      reportId,
      mode,
      supabase: client,
      locale: subscriber.locale,
      ...(siteUrl ? { siteUrl } : {}),
    }).catch(() => bundleBase);

    const rendered = renderFor(mode, bundle, subscriber);

    if (dryRun) {
      sent += 1;
      continue;
    }

    try {
      const result = await provider.send({
        to: subscriber.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: [
          { name: 'template', value: `scorecard-digest-${mode}` },
          { name: 'report_id', value: reportId },
        ],
      });

      if (result.accepted) {
        sent += 1;
        await recordDelivery(client, {
          subscriberId: subscriber.id,
          template: mode === 'preview' ? 'scorecard-digest-preview' : 'scorecard-digest-post',
          subject: rendered.subject,
          status: 'sent',
          providerMessageId: result.providerMessageId,
          reportId,
        });
      } else {
        failed += 1;
        await recordDelivery(client, {
          subscriberId: subscriber.id,
          template: mode === 'preview' ? 'scorecard-digest-preview' : 'scorecard-digest-post',
          subject: rendered.subject,
          status: 'failed',
          providerMessageId: null,
          error: result.error,
          reportId,
        });
      }
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      await recordDelivery(client, {
        subscriberId: subscriber.id,
        template: mode === 'preview' ? 'scorecard-digest-preview' : 'scorecard-digest-post',
        subject: rendered.subject,
        status: 'failed',
        providerMessageId: null,
        error: message,
        reportId,
      });
    }
  }

  return { sent, failed, skipped, reportId, mode, dryRun };
}
