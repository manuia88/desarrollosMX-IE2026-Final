// DMX Studio dentro DMX único entorno (ADR-054). Stripe checkout endpoint.
// STUB ADR-018 — activar L-NEW-STRIPE-SDK-INSTALL.

import { NextResponse } from 'next/server';
import { createStudioCheckoutSession } from '@/features/dmx-studio/lib/stripe/checkout';
import {
  type CreateStudioCheckoutInput,
  createStudioCheckoutInput,
} from '@/features/dmx-studio/schemas';
import { createClient } from '@/shared/lib/supabase/server';
import { sentry } from '@/shared/lib/telemetry/sentry';

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  let parsed: CreateStudioCheckoutInput;
  try {
    parsed = createStudioCheckoutInput.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_input', issues: err instanceof Error ? err.message : 'zod_error' },
      { status: 400 },
    );
  }

  try {
    const result = await createStudioCheckoutSession({
      userId: user.id,
      userEmail: user.email ?? null,
      planKey: parsed.planKey,
      successUrl: parsed.successPath,
      cancelUrl: parsed.cancelPath,
    });
    return NextResponse.json({ url: result.url, sessionId: result.sessionId });
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.stripe', op: 'api.checkout.create' },
    });
    return NextResponse.json(
      {
        error: 'checkout_failed',
        message: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 },
    );
  }
}
