// FASE 17.STRIPE — Saldo IA Stripe Checkout + webhook event handler.
// Authority: ADR-062 + plan FASE_17 addendum v3 + biblia v5 N+7.
//
// Decisiones canon (founder 2026-04-29):
// - Stripe Checkout standalone (NO Stripe Connect — Pack es DMX cobrando directo).
// - Endpoint webhook separado /api/webhooks/stripe-credits con secret propio
//   STRIPE_CREDITS_WEBHOOK_SECRET (cascade-resilient, rotación independiente).
// - Product/Price IDs en env vars (no hardcoded, founder rota sin redeploy).
// - Idempotencia: stripe_payment_id UNIQUE check antes de grant credits
//   (webhook puede llegar duplicado per Stripe retry policy).

import { TRPCError } from '@trpc/server';
import type Stripe from 'stripe';
import {
  AI_CREDITS_PACK_25,
  AI_CREDITS_PACK_25_USD_AMOUNT,
  getAiCreditsPack25PriceId,
} from '@/features/document-intel/lib/stripe-credits-products';
import {
  ensureFullyQualifiedUrl,
  getStripeSDK,
  isStripeStubMode,
  resolveAppOrigin,
} from '@/shared/lib/stripe/sdk';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface CreateCreditsCheckoutInput {
  readonly userId: string;
  readonly userEmail: string | null;
  readonly desarrolladoraId: string;
  readonly successPath?: string;
  readonly cancelPath?: string;
}

export interface CreateCreditsCheckoutResult {
  readonly url: string;
  readonly sessionId: string;
  readonly stub: boolean;
}

const DEFAULT_SUCCESS_PATH = '/es-MX/desarrolladores/inventario/documentos/ai?credits_charged=true';
const DEFAULT_CANCEL_PATH = '/es-MX/desarrolladores/inventario/documentos/ai?credits_canceled=true';

export async function createCreditsCheckoutSession(
  input: CreateCreditsCheckoutInput,
): Promise<CreateCreditsCheckoutResult> {
  const origin = resolveAppOrigin();
  const successUrl = ensureFullyQualifiedUrl(input.successPath ?? DEFAULT_SUCCESS_PATH, origin);
  const cancelUrl = ensureFullyQualifiedUrl(input.cancelPath ?? DEFAULT_CANCEL_PATH, origin);

  if (isStripeStubMode()) {
    const stubSessionId = `cs_test_credits_stub_${Date.now()}`;
    return {
      url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}stub_session=${stubSessionId}`,
      sessionId: stubSessionId,
      stub: true,
    };
  }

  const stripe = getStripeSDK();
  const priceId = getAiCreditsPack25PriceId();

  const metadata: Record<string, string> = {
    product_type: 'ai_credits_pack',
    pack_key: AI_CREDITS_PACK_25.key,
    desarrolladora_id: input.desarrolladoraId,
    user_id: input.userId,
    credits_added_usd: String(AI_CREDITS_PACK_25.creditsAddedUsd),
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    ...(input.userEmail ? { customer_email: input.userEmail } : {}),
    metadata,
    payment_intent_data: { metadata },
  });

  if (!session.url) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'stripe_checkout_session_url_missing',
    });
  }

  return {
    url: session.url,
    sessionId: session.id,
    stub: false,
  };
}

// ---- Webhook event handler ---------------------------------------------------

export interface CreditsWebhookResult {
  readonly ok: boolean;
  readonly handled: boolean;
  readonly eventType: string;
  readonly desarrolladoraId?: string;
  readonly amountUsd?: number;
  readonly stripePaymentId?: string;
  readonly idempotentSkip?: boolean;
  readonly error?: string;
}

export async function handleCreditsWebhookEvent(
  event: Stripe.Event,
): Promise<CreditsWebhookResult> {
  const eventType = event.type;

  if (eventType !== 'checkout.session.completed' && eventType !== 'payment_intent.succeeded') {
    return { ok: true, handled: false, eventType };
  }

  const dataObject = event.data.object as unknown as Record<string, unknown>;
  const metadata = (dataObject.metadata ?? {}) as Record<string, string>;
  const productType = metadata.product_type;

  if (productType !== 'ai_credits_pack') {
    return { ok: true, handled: false, eventType };
  }

  const desarrolladoraId = metadata.desarrolladora_id;
  const userId = metadata.user_id ?? null;
  const packKey = metadata.pack_key ?? AI_CREDITS_PACK_25.key;
  const creditsAddedRaw = Number(metadata.credits_added_usd ?? AI_CREDITS_PACK_25_USD_AMOUNT);
  const creditsAddedUsd = Number.isFinite(creditsAddedRaw)
    ? creditsAddedRaw
    : AI_CREDITS_PACK_25_USD_AMOUNT;

  if (!desarrolladoraId) {
    sentry.captureException(new Error('credits_webhook_missing_desarrolladora_id'), {
      tags: { feature: 'document-intel', op: 'credits-webhook' },
      extra: { eventType, eventId: event.id },
    });
    return { ok: false, handled: false, eventType, error: 'missing_desarrolladora_id' };
  }

  const stripePaymentId =
    eventType === 'checkout.session.completed'
      ? ((dataObject.payment_intent as string | null) ?? event.id)
      : ((dataObject.id as string | null) ?? event.id);

  if (!stripePaymentId) {
    return { ok: false, handled: false, eventType, error: 'missing_payment_id' };
  }

  const supabase = createAdminClient();

  // Idempotencia: skip si ya existe transaction con este stripe_payment_id
  const { data: existingTx } = await supabase
    .from('ai_credit_transactions')
    .select('id')
    .eq('stripe_payment_id', stripePaymentId)
    .maybeSingle();

  if (existingTx) {
    return {
      ok: true,
      handled: true,
      eventType,
      desarrolladoraId,
      amountUsd: creditsAddedUsd,
      stripePaymentId,
      idempotentSkip: true,
    };
  }

  // Snapshot actual + grant credits
  const { data: snapshot, error: snapshotErr } = await supabase
    .from('dev_ai_credits')
    .select('balance_usd, total_purchased_usd, packs_purchased_count')
    .eq('desarrolladora_id', desarrolladoraId)
    .maybeSingle();

  if (snapshotErr) {
    return { ok: false, handled: false, eventType, error: snapshotErr.message };
  }

  if (!snapshot) {
    const { error: insertErr } = await supabase
      .from('dev_ai_credits')
      .insert({ desarrolladora_id: desarrolladoraId, balance_usd: 0 });
    if (insertErr && insertErr.code !== '23505') {
      return { ok: false, handled: false, eventType, error: insertErr.message };
    }
  }

  const baseSnapshot = snapshot ?? {
    balance_usd: 0,
    total_purchased_usd: 0,
    packs_purchased_count: 0,
  };

  const newBalance = Number((Number(baseSnapshot.balance_usd) + creditsAddedUsd).toFixed(4));
  const newTotalPurchased = Number(
    (Number(baseSnapshot.total_purchased_usd ?? 0) + creditsAddedUsd).toFixed(4),
  );
  const newPacksCount = Number(baseSnapshot.packs_purchased_count ?? 0) + 1;
  const nowIso = new Date().toISOString();

  const { error: updErr } = await supabase
    .from('dev_ai_credits')
    .update({
      balance_usd: newBalance,
      total_purchased_usd: newTotalPurchased,
      packs_purchased_count: newPacksCount,
      last_purchase_at: nowIso,
      updated_at: nowIso,
    })
    .eq('desarrolladora_id', desarrolladoraId);

  if (updErr) {
    return { ok: false, handled: false, eventType, error: updErr.message };
  }

  const { error: txErr } = await supabase.from('ai_credit_transactions').insert({
    desarrolladora_id: desarrolladoraId,
    type: 'purchase',
    amount_usd: creditsAddedUsd,
    balance_after_usd: newBalance,
    stripe_payment_id: stripePaymentId,
    description: `Stripe Checkout — ${AI_CREDITS_PACK_25.name}`,
    metadata: {
      pack_key: packKey,
      stripe_event_id: event.id,
      stripe_event_type: eventType,
      user_id: userId,
    },
  });

  if (txErr) {
    sentry.captureException(new Error(`credits_tx_insert_failed: ${txErr.message}`), {
      tags: { feature: 'document-intel', op: 'credits-webhook' },
      extra: { eventId: event.id, desarrolladoraId, stripePaymentId },
    });
    return { ok: false, handled: false, eventType, error: txErr.message };
  }

  return {
    ok: true,
    handled: true,
    eventType,
    desarrolladoraId,
    amountUsd: creditsAddedUsd,
    stripePaymentId,
  };
}
