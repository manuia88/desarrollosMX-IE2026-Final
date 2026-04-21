// FASE 11.J — Send orchestrator (cron).
//
// Orquesta envío mensual/anual: query subscribers → build bundle → render
// template → emailProvider.send → insert newsletter_deliveries audit.
//
// Paginación 500 por batch; fallos individuales NO tumban el batch (log +
// continuar). En CI siempre usa MockEmailProvider (enforcement via
// getEmailProvider()).
//
// Integración A/B: selectSubjectVariant() determina subject + variant
// metadata que se persiste en newsletter_deliveries.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import { type RenderMonthlyMoMResult, renderMonthlyMoMEmail } from '../templates/monthly-mom';
import { renderWrappedAnnual } from '../templates/wrapped-annual';
import type {
  NewsletterDeliveryStatus,
  NewsletterLocale,
  NewsletterPreferences,
  NewsletterSubscriberStatus,
} from '../types';
import { selectSubjectVariant } from './ab-testing';
import { getEmailProvider } from './email-provider';
import { buildMonthlyBundle } from './monthly-builder';
import { asRaw } from './raw-supabase';
import { mintUnsubscribeToken } from './tokens';

type Supabase = SupabaseClient<Database>;

const BATCH_SIZE = 500;

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.desarrollosmx.com';
}

// ---------- Monthly ----------

export interface SendMonthlyNewslettersOpts {
  readonly periodDate: string;
  readonly countryCode: string;
  readonly supabase?: Supabase;
  readonly limit?: number; // test knob
}

export interface SendBatchResult {
  readonly sent: number;
  readonly failed: number;
  readonly skipped: number;
}

interface SubscriberRow {
  readonly id: string;
  readonly email: string;
  readonly locale: NewsletterLocale;
  readonly status: NewsletterSubscriberStatus;
  readonly preferences: NewsletterPreferences;
  readonly user_id: string | null;
}

async function fetchActiveSubscribersBatch(
  supabase: Supabase,
  frequency: 'monthly' | 'quarterly' | 'annual',
  offset: number,
  limit: number,
): Promise<readonly SubscriberRow[]> {
  const { data, error } = await asRaw(supabase)
    .from('newsletter_subscribers')
    .select('id,email,locale,status,preferences,user_id')
    .eq('status', 'active')
    .eq('preferences->>frequency', frequency)
    .range(offset, offset + limit - 1);
  if (error || !data) return [];
  return data as ReadonlyArray<SubscriberRow>;
}

async function recordDelivery(
  supabase: Supabase,
  payload: {
    readonly subscriberId: string;
    readonly template: string;
    readonly subject: string;
    readonly subjectVariant: string | null;
    readonly abTestId: string | null;
    readonly providerMessageId: string | null;
    readonly status: NewsletterDeliveryStatus;
    readonly payloadSummary: Record<string, unknown>;
  },
): Promise<void> {
  await asRaw(supabase).from('newsletter_deliveries').insert({
    subscriber_id: payload.subscriberId,
    template: payload.template,
    subject: payload.subject,
    subject_variant: payload.subjectVariant,
    ab_test_id: payload.abTestId,
    provider_message_id: payload.providerMessageId,
    status: payload.status,
    payload_summary: payload.payloadSummary,
  });
}

async function sendOneMonthly(
  supabase: Supabase,
  subscriber: SubscriberRow,
  periodDate: string,
  countryCode: string,
): Promise<'sent' | 'failed' | 'skipped'> {
  try {
    const bundle = await buildMonthlyBundle({
      countryCode,
      periodDate,
      locale: subscriber.locale,
      ...(subscriber.preferences ? { subscriberPreferences: subscriber.preferences } : {}),
      supabase,
    });

    if (bundle.hero_top_five.length === 0) {
      return 'skipped';
    }

    const unsubscribeToken = mintUnsubscribeToken(subscriber.email, subscriber.id);
    const unsubscribeUrl = `${siteUrl()}/${subscriber.locale}/newsletter/unsubscribe/${encodeURIComponent(unsubscribeToken)}`;
    const preferencesUrl = `${siteUrl()}/${subscriber.locale}/newsletter/preferences`;

    // A/B subject (si hay experiment activo).
    const ab = await selectSubjectVariant({
      template: 'monthly-mom',
      periodDate,
      subscriberId: subscriber.id,
      supabase,
    });

    const rendered: RenderMonthlyMoMResult = renderMonthlyMoMEmail({
      bundle,
      subscriber: { email: subscriber.email },
      unsubscribeUrl,
      preferencesUrl,
      ...(ab.subject.length > 0 ? { subjectOverride: ab.subject } : {}),
    });

    const provider = getEmailProvider();
    const result = await provider.send({
      to: subscriber.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    await recordDelivery(supabase, {
      subscriberId: subscriber.id,
      template: 'monthly-mom',
      subject: rendered.subject,
      subjectVariant: ab.abTestId ? ab.variant : null,
      abTestId: ab.abTestId,
      providerMessageId: result.providerMessageId,
      status: result.accepted ? 'sent' : 'failed',
      payloadSummary: {
        period_date: periodDate,
        country_code: countryCode,
        hero_count: bundle.hero_top_five.length,
        provider: result.provider,
      },
    });

    return result.accepted ? 'sent' : 'failed';
  } catch (err) {
    console.error('[send-orchestrator] monthly send failed', {
      subscriberId: subscriber.id,
      message: err instanceof Error ? err.message : String(err),
    });
    try {
      await recordDelivery(supabase, {
        subscriberId: subscriber.id,
        template: 'monthly-mom',
        subject: '(failed)',
        subjectVariant: null,
        abTestId: null,
        providerMessageId: null,
        status: 'failed',
        payloadSummary: {
          period_date: periodDate,
          country_code: countryCode,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    } catch {
      // swallow — ya está loggeado arriba.
    }
    return 'failed';
  }
}

export async function sendMonthlyNewsletters(
  opts: SendMonthlyNewslettersOpts,
): Promise<SendBatchResult> {
  const supabase = opts.supabase ?? createAdminClient();
  const limit = opts.limit ?? BATCH_SIZE;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let offset = 0;

  while (true) {
    const batch = await fetchActiveSubscribersBatch(supabase, 'monthly', offset, limit);
    if (batch.length === 0) break;
    for (const subscriber of batch) {
      const outcome = await sendOneMonthly(supabase, subscriber, opts.periodDate, opts.countryCode);
      if (outcome === 'sent') sent += 1;
      else if (outcome === 'skipped') skipped += 1;
      else failed += 1;
    }
    if (batch.length < limit) break;
    offset += limit;
  }

  return { sent, failed, skipped };
}

// ---------- Annual wrapped ----------

export interface SendWrappedAnnualOpts {
  readonly year: number;
  readonly countryCode: string;
  readonly supabase?: Supabase;
  readonly limit?: number;
}

async function sendOneWrapped(
  supabase: Supabase,
  subscriber: SubscriberRow,
  year: number,
): Promise<'sent' | 'failed'> {
  try {
    const unsubscribeToken = mintUnsubscribeToken(subscriber.email, subscriber.id);
    const unsubscribeUrl = `${siteUrl()}/${subscriber.locale}/newsletter/unsubscribe/${encodeURIComponent(unsubscribeToken)}`;
    const wrappedUrl = `${siteUrl()}/${subscriber.locale}/wrapped/${year}`;

    const rendered = renderWrappedAnnual({
      locale: subscriber.locale,
      year,
      wrappedUrl,
      subscriberEmail: subscriber.email,
      unsubscribeUrl,
    });

    const provider = getEmailProvider();
    const result = await provider.send({
      to: subscriber.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    await recordDelivery(supabase, {
      subscriberId: subscriber.id,
      template: 'wrapped-annual',
      subject: rendered.subject,
      subjectVariant: null,
      abTestId: null,
      providerMessageId: result.providerMessageId,
      status: result.accepted ? 'sent' : 'failed',
      payloadSummary: {
        year,
        wrapped_url: wrappedUrl,
        provider: result.provider,
      },
    });

    return result.accepted ? 'sent' : 'failed';
  } catch (err) {
    console.error('[send-orchestrator] wrapped send failed', {
      subscriberId: subscriber.id,
      message: err instanceof Error ? err.message : String(err),
    });
    return 'failed';
  }
}

export async function sendWrappedAnnualNewsletters(
  opts: SendWrappedAnnualOpts,
): Promise<SendBatchResult> {
  const supabase = opts.supabase ?? createAdminClient();
  const limit = opts.limit ?? BATCH_SIZE;
  let sent = 0;
  let failed = 0;
  let offset = 0;

  while (true) {
    const batch = await fetchActiveSubscribersBatch(supabase, 'monthly', offset, limit);
    if (batch.length === 0) break;
    for (const subscriber of batch) {
      const outcome = await sendOneWrapped(supabase, subscriber, opts.year);
      if (outcome === 'sent') sent += 1;
      else failed += 1;
    }
    if (batch.length < limit) break;
    offset += limit;
  }

  return { sent, failed, skipped: 0 };
}
