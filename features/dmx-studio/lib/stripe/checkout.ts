// DMX Studio dentro DMX único entorno (ADR-054). Stripe checkout helpers.
// STUB ADR-018 — activar L-NEW-STRIPE-SDK-INSTALL: el wrapper getStripe()
// retorna mock IDs deterministas que round-trip a través de la BD.

import {
  getStudioPlanByPriceId,
  STUDIO_PLANS,
  type StudioPlanKey,
} from '@/features/dmx-studio/lib/stripe-products';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { getStripe } from './client';
import type { StripeCheckoutSession, StripeCustomer } from './types';

export interface CreateStudioCheckoutInput {
  readonly userId: string;
  readonly userEmail: string | null;
  readonly planKey: StudioPlanKey;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly organizationId?: string | null;
}

export interface CreateStudioCheckoutResult {
  readonly url: string;
  readonly sessionId: string;
  readonly customerId: string;
  readonly priceId: string;
}

function ensureFullyQualifiedUrl(path: string, base: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const trimmedBase = base.replace(/\/$/, '');
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

function resolveAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  if (explicit) return explicit.replace(/\/$/, '');
  const vercelUrl = process.env.VERCEL_URL ?? '';
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export async function getOrCreateCustomer(args: {
  readonly userId: string;
  readonly userEmail: string | null;
}): Promise<StripeCustomer> {
  const stripe = getStripe();
  const admin = createAdminClient();

  const { data: existing, error: selectError } = await admin
    .from('studio_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', args.userId)
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    sentry.captureException(selectError, {
      tags: { feature: 'dmx-studio.stripe', op: 'getOrCreateCustomer.select' },
    });
    throw new Error(`getOrCreateCustomer: ${selectError.message}`);
  }

  if (existing?.stripe_customer_id) {
    return stripe.customers.retrieve(existing.stripe_customer_id);
  }

  const created = await stripe.customers.create(
    args.userEmail
      ? {
          email: args.userEmail,
          metadata: { user_id: args.userId, source: 'dmx-studio' },
        }
      : { metadata: { user_id: args.userId, source: 'dmx-studio' } },
  );
  return created;
}

export async function createStudioCheckoutSession(
  input: CreateStudioCheckoutInput,
): Promise<CreateStudioCheckoutResult> {
  const plan = STUDIO_PLANS[input.planKey];
  if (!plan) {
    throw new Error(`createStudioCheckoutSession: unknown planKey "${input.planKey}"`);
  }
  // Defensive double-check: plan.priceId must round-trip via STUDIO_PRICE_TO_PLAN.
  const roundTrip = getStudioPlanByPriceId(plan.priceId);
  if (!roundTrip || roundTrip.key !== input.planKey) {
    throw new Error('createStudioCheckoutSession: plan/price mismatch in canon');
  }

  const customer = await getOrCreateCustomer({
    userId: input.userId,
    userEmail: input.userEmail,
  });

  const origin = resolveAppOrigin();
  const successUrl = ensureFullyQualifiedUrl(input.successUrl, origin);
  const cancelUrl = ensureFullyQualifiedUrl(input.cancelUrl, origin);

  const stripe = getStripe();
  const session: StripeCheckoutSession = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    client_reference_id: input.userId,
    metadata: {
      user_id: input.userId,
      plan_key: plan.key,
      ...(input.organizationId ? { organization_id: input.organizationId } : {}),
    },
    subscription_data: {
      metadata: {
        user_id: input.userId,
        plan_key: plan.key,
        ...(input.organizationId ? { organization_id: input.organizationId } : {}),
      },
    },
  });

  if (!session.url) {
    throw new Error('createStudioCheckoutSession: stripe returned no checkout URL');
  }

  return {
    url: session.url,
    sessionId: session.id,
    customerId: customer.id,
    priceId: plan.priceId,
  };
}
