// DMX Studio dentro DMX único entorno (ADR-054). Stripe webhook event dispatcher.
// STUB ADR-018 — activar L-NEW-STRIPE-SDK-INSTALL.
// Firma verificación: usa HMAC sha256 hex del rawBody contra el secret cuando
// está configurado; cuando no hay secret, acepta el payload (útil dev local).
// Cuando se instale el SDK real, sustituir constructEvent por
// `stripe.webhooks.constructEvent(rawBody, sig, secret)`.

import {
  getStudioPlanByPriceId,
  STUDIO_PLANS,
  type StudioPlanKey,
} from '@/features/dmx-studio/lib/stripe-products';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Json } from '@/shared/types/database';
import { getStripe } from './client';
import type {
  StripeCheckoutSession,
  StripeInvoice,
  StripeSubscription,
  StripeWebhookEvent,
} from './types';

export interface HandleWebhookResult {
  readonly ok: boolean;
  readonly eventType: string;
  readonly subscriptionId?: string;
  readonly handled: boolean;
  readonly error?: string;
}

function isCheckoutSession(value: unknown): value is StripeCheckoutSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { object?: unknown }).object === 'checkout.session'
  );
}

function isSubscription(value: unknown): value is StripeSubscription {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { object?: unknown }).object === 'subscription'
  );
}

function isInvoice(value: unknown): value is StripeInvoice {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { object?: unknown }).object === 'invoice'
  );
}

function unixToIso(seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

async function logAudit(args: {
  readonly action: string;
  readonly recordId: string | null;
  readonly meta: Record<string, Json>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('audit_log').insert({
      action: args.action,
      record_id: args.recordId,
      table_name: 'studio_subscriptions',
      meta: args.meta,
    });
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.stripe', op: 'webhook.auditLog' },
      extra: { action: args.action, record_id: args.recordId ?? '' },
    });
  }
}

async function handleCheckoutSessionCompleted(
  event: StripeWebhookEvent,
): Promise<HandleWebhookResult> {
  const session = event.data.object;
  if (!isCheckoutSession(session)) {
    return { ok: false, eventType: event.type, handled: false, error: 'invalid_session_payload' };
  }
  const userId = session.metadata.user_id ?? '';
  const planKey = session.metadata.plan_key ?? '';
  const subscriptionId = session.subscription ?? '';
  const customerId = session.customer ?? '';
  const organizationId = session.metadata.organization_id ?? null;

  if (!userId || !subscriptionId || !customerId) {
    return {
      ok: false,
      eventType: event.type,
      handled: false,
      error: 'missing_user_or_subscription',
    };
  }

  // Resolve canon price/plan from the session subscription. The wrapper stub
  // doesn't return a full subscription expansion; in real Stripe we'd fetch
  // sub.items.data[0].price.id. Best-effort: fall back to plan_key metadata.
  const fallbackPlan = planKey
    ? getStudioPlanByPriceId(planKeyToPriceIdViaCanon(planKey) ?? '')
    : undefined;
  const planFromSession = fallbackPlan ?? null;
  const stripePriceId = planFromSession?.priceId ?? planKeyToPriceIdViaCanon(planKey) ?? '';
  const videosPerMonthLimit = planFromSession?.videosPerMonth ?? 0;

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from('studio_subscriptions')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      plan_key: planKey || planFromSession?.key || 'pro',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: stripePriceId,
      status: 'active',
      current_period_start: unixToIso(event.created),
      current_period_end: unixToIso(event.created + 60 * 60 * 24 * 30),
      cancel_at_period_end: false,
      videos_per_month_limit: videosPerMonthLimit,
      videos_used_this_period: 0,
      meta: { stripe_event_id: event.id, source: 'checkout.session.completed' } satisfies Record<
        string,
        Json
      >,
    })
    .select('id')
    .single();

  if (error) {
    sentry.captureException(error, {
      tags: { feature: 'dmx-studio.stripe', op: 'webhook.checkoutCompleted.insert' },
    });
    return { ok: false, eventType: event.type, handled: false, error: error.message };
  }

  await logAudit({
    action: 'studio.subscription.created',
    recordId: inserted?.id ?? null,
    meta: {
      stripe_event_id: event.id,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      plan_key: planKey,
      user_id: userId,
    },
  });

  return { ok: true, eventType: event.type, subscriptionId, handled: true };
}

function isStudioPlanKey(value: string): value is StudioPlanKey {
  return value === 'pro' || value === 'foto' || value === 'agency';
}

function planKeyToPriceIdViaCanon(planKey: string): string | undefined {
  if (!isStudioPlanKey(planKey)) return undefined;
  return STUDIO_PLANS[planKey].priceId;
}

async function handleSubscriptionUpdated(event: StripeWebhookEvent): Promise<HandleWebhookResult> {
  const sub = event.data.object;
  if (!isSubscription(sub)) {
    return {
      ok: false,
      eventType: event.type,
      handled: false,
      error: 'invalid_subscription_payload',
    };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from('studio_subscriptions')
    .update({
      status: sub.status,
      current_period_start: unixToIso(sub.current_period_start),
      current_period_end: unixToIso(sub.current_period_end),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);

  if (error) {
    sentry.captureException(error, {
      tags: { feature: 'dmx-studio.stripe', op: 'webhook.subscriptionUpdated' },
    });
    return { ok: false, eventType: event.type, handled: false, error: error.message };
  }

  await logAudit({
    action: 'studio.subscription.updated',
    recordId: null,
    meta: {
      stripe_event_id: event.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      cancel_at_period_end: sub.cancel_at_period_end,
    },
  });

  return { ok: true, eventType: event.type, subscriptionId: sub.id, handled: true };
}

async function handleSubscriptionDeleted(event: StripeWebhookEvent): Promise<HandleWebhookResult> {
  const sub = event.data.object;
  if (!isSubscription(sub)) {
    return {
      ok: false,
      eventType: event.type,
      handled: false,
      error: 'invalid_subscription_payload',
    };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from('studio_subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);

  if (error) {
    sentry.captureException(error, {
      tags: { feature: 'dmx-studio.stripe', op: 'webhook.subscriptionDeleted' },
    });
    return { ok: false, eventType: event.type, handled: false, error: error.message };
  }

  await logAudit({
    action: 'studio.subscription.canceled',
    recordId: null,
    meta: { stripe_event_id: event.id, stripe_subscription_id: sub.id },
  });

  return { ok: true, eventType: event.type, subscriptionId: sub.id, handled: true };
}

async function handleInvoicePaymentFailed(event: StripeWebhookEvent): Promise<HandleWebhookResult> {
  const invoice = event.data.object;
  if (!isInvoice(invoice)) {
    return { ok: false, eventType: event.type, handled: false, error: 'invalid_invoice_payload' };
  }
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    return { ok: true, eventType: event.type, handled: false };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from('studio_subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    sentry.captureException(error, {
      tags: { feature: 'dmx-studio.stripe', op: 'webhook.paymentFailed' },
    });
    return { ok: false, eventType: event.type, handled: false, error: error.message };
  }

  await logAudit({
    action: 'studio.subscription.payment_failed',
    recordId: null,
    meta: {
      stripe_event_id: event.id,
      stripe_subscription_id: subscriptionId,
      attempt_count: invoice.attempt_count,
    },
  });

  return { ok: true, eventType: event.type, subscriptionId, handled: true };
}

export async function handleStripeWebhook(args: {
  readonly rawBody: string;
  readonly signature: string;
  readonly secret?: string;
}): Promise<HandleWebhookResult> {
  const { rawBody, signature, secret } = args;
  const stripe = getStripe();

  let event: StripeWebhookEvent;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret ?? '');
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.stripe', op: 'webhook.constructEvent' },
    });
    const message = err instanceof Error ? err.message : 'invalid_signature';
    return { ok: false, eventType: 'unknown', handled: false, error: message };
  }

  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutSessionCompleted(event);
    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event);
    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event);
    case 'invoice.payment_failed':
      return handleInvoicePaymentFailed(event);
    default:
      await logAudit({
        action: `studio.subscription.event.${event.type}`,
        recordId: null,
        meta: { stripe_event_id: event.id, event_type: event.type, ignored: true },
      });
      return { ok: true, eventType: event.type, handled: false };
  }
}
