// DMX Studio dentro DMX único entorno (ADR-054). Stripe billing portal endpoint.
// STUB ADR-018 — activar L-NEW-STRIPE-SDK-INSTALL.

import { NextResponse } from 'next/server';
import { createPortalSession } from '@/features/dmx-studio/lib/stripe/portal';
import { type StudioPortalInput, studioPortalInput } from '@/features/dmx-studio/schemas';
import { createAdminClient } from '@/shared/lib/supabase/admin';
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

  let parsed: StudioPortalInput;
  try {
    parsed = studioPortalInput.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_input', issues: err instanceof Error ? err.message : 'zod_error' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('studio_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    sentry.captureException(error, {
      tags: { feature: 'dmx-studio.stripe', op: 'api.portal.lookup' },
    });
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }

  const customerId = data?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: 'no_stripe_customer' }, { status: 412 });
  }

  try {
    const result = await createPortalSession({
      customerId,
      returnUrl: parsed.returnPath,
    });
    return NextResponse.json({ url: result.url });
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.stripe', op: 'api.portal.create' },
    });
    return NextResponse.json(
      {
        error: 'portal_failed',
        message: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 },
    );
  }
}
