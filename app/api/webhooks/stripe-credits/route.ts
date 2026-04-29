// FASE 17.STRIPE — Webhook handler Stripe Checkout AI credits.
// Authority: ADR-062 + plan FASE_17 addendum v3.
//
// Decisión canon (founder 2026-04-29):
// Endpoint separado /api/webhooks/stripe-credits con secret propio
// STRIPE_CREDITS_WEBHOOK_SECRET. NO compartir con Studio (cascade-resilient).
// Idempotencia delegada a handleCreditsWebhookEvent (UNIQUE check stripe_payment_id).

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { handleCreditsWebhookEvent } from '@/features/document-intel/lib/stripe-credits';
import { getStripeSDK, isStripeStubMode } from '@/shared/lib/stripe/sdk';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'document-intel.stripe-credits', op: 'webhook.readBody' },
    });
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const signature = request.headers.get('stripe-signature') ?? '';
  const secret = process.env.STRIPE_CREDITS_WEBHOOK_SECRET ?? '';

  if (!secret) {
    sentry.captureException(new Error('stripe_credits_webhook_secret_missing'), {
      tags: { feature: 'document-intel.stripe-credits' },
    });
    return NextResponse.json({ error: 'webhook_secret_missing' }, { status: 503 });
  }

  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  if (isStripeStubMode()) {
    return NextResponse.json({ error: 'webhook_unavailable_in_stub_mode' }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeSDK();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'document-intel.stripe-credits', op: 'webhook.constructEvent' },
    });
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    const result = await handleCreditsWebhookEvent(event);

    if (!result.ok) {
      return NextResponse.json(
        { error: 'webhook_failed', message: result.error ?? 'unknown' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      received: true,
      eventType: result.eventType,
      handled: result.handled,
      idempotentSkip: result.idempotentSkip ?? false,
      desarrolladoraId: result.desarrolladoraId ?? null,
      amountUsd: result.amountUsd ?? null,
      stripePaymentId: result.stripePaymentId ?? null,
    });
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'document-intel.stripe-credits', op: 'webhook.handle' },
      extra: { eventId: event.id, eventType: event.type },
    });
    return NextResponse.json(
      {
        error: 'webhook_failed',
        message: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 },
    );
  }
}
