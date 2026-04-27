// DMX Studio dentro DMX único entorno (ADR-054). Stripe webhook endpoint.
// STUB ADR-018 — activar L-NEW-STRIPE-SDK-INSTALL: cuando se instale el SDK
// real, sustituir el constructEvent stub (HMAC sha256) por
// stripe.webhooks.constructEvent estándar.

import { NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/features/dmx-studio/lib/stripe/webhook';
import { sentry } from '@/shared/lib/telemetry/sentry';

export async function POST(request: Request): Promise<Response> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.stripe', op: 'webhook.readBody' },
    });
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const signature = request.headers.get('stripe-signature') ?? '';
  const secret = process.env.STRIPE_STUDIO_WEBHOOK_SECRET ?? '';

  if (secret && !signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const result = await handleStripeWebhook({ rawBody, signature, secret });

  if (!result.ok) {
    if (
      result.error === 'stripe.webhooks.constructEvent: invalid signature' ||
      result.error === 'invalid_signature'
    ) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'webhook_failed', message: result.error ?? 'unknown' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    received: true,
    eventType: result.eventType,
    handled: result.handled,
    subscriptionId: result.subscriptionId ?? null,
  });
}
