// DMX Studio dentro DMX único entorno (ADR-054). Stripe SDK wrapper.
// Modo dual:
// - Stub mode (STRIPE_SECRET_KEY ausente o 'sk_test_stub'): mock IDs deterministas
//   (cs_test_*, cus_test_*, sub_test_*) que round-trip a BD sin gastar credits.
//   Default en CI/dev/test.
// - Live mode (STRIPE_SECRET_KEY=sk_live_* o sk_test_*): usa SDK real Stripe v22.

import { createHash, createHmac, randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type {
  CreateBillingPortalSessionParams,
  CreateCheckoutSessionParams,
  CreateCustomerParams,
  StripeBillingPortalSession,
  StripeCheckoutSession,
  StripeCustomer,
  StripeSubscription,
  StripeWebhookEvent,
  UpdateSubscriptionParams,
} from './types';

export interface StudioStripeClient {
  readonly checkout: {
    readonly sessions: {
      create(params: CreateCheckoutSessionParams): Promise<StripeCheckoutSession>;
      retrieve(id: string): Promise<StripeCheckoutSession>;
    };
  };
  readonly billingPortal: {
    readonly sessions: {
      create(params: CreateBillingPortalSessionParams): Promise<StripeBillingPortalSession>;
    };
  };
  readonly customers: {
    create(params: CreateCustomerParams): Promise<StripeCustomer>;
    retrieve(id: string): Promise<StripeCustomer>;
  };
  readonly subscriptions: {
    update(id: string, params: UpdateSubscriptionParams): Promise<StripeSubscription>;
    cancel(id: string): Promise<StripeSubscription>;
  };
  readonly webhooks: {
    constructEvent(rawBody: string, signature: string, secret: string): StripeWebhookEvent;
  };
}

const STUB_SECRET_TOKENS = new Set(['', 'sk_test_stub']);

function isStubMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return STUB_SECRET_TOKENS.has(key);
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function nextThirtyDays(): number {
  return nowSeconds() + 60 * 60 * 24 * 30;
}

function mockId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

function captureLiveError(err: unknown, op: string): never {
  sentry.captureException(err, {
    tags: { feature: 'dmx-studio.stripe', op, mode: 'live' },
  });
  throw err;
}

function adaptCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer): StripeCustomer {
  if ('deleted' in customer && customer.deleted) {
    return {
      id: customer.id,
      object: 'customer',
      email: null,
      metadata: {},
      created: nowSeconds(),
    };
  }
  const live = customer as Stripe.Customer;
  return {
    id: live.id,
    object: 'customer',
    email: live.email ?? null,
    metadata: { ...(live.metadata ?? {}) } as Record<string, string>,
    created: live.created,
  };
}

function adaptSession(session: Stripe.Checkout.Session): StripeCheckoutSession {
  const customer =
    typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
  const subscription =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription?.id ?? null);
  return {
    id: session.id,
    object: 'checkout.session',
    url: session.url ?? null,
    customer,
    subscription,
    mode: session.mode as 'subscription' | 'payment' | 'setup',
    status: (session.status as 'open' | 'complete' | 'expired' | null) ?? null,
    metadata: { ...(session.metadata ?? {}) } as Record<string, string>,
    success_url: session.success_url ?? '',
    cancel_url: session.cancel_url ?? '',
  };
}

function adaptSubscription(sub: Stripe.Subscription): StripeSubscription {
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const items: Array<{ readonly id: string; readonly price: { readonly id: string } }> =
    sub.items.data.map((item) => ({
      id: item.id,
      price: { id: typeof item.price === 'string' ? item.price : item.price.id },
    }));
  // Stripe v22 schedule period fields can be on items; fall back to legacy fields.
  const periodStart =
    (sub as unknown as { current_period_start?: number }).current_period_start ??
    sub.items.data[0]?.current_period_start ??
    nowSeconds();
  const periodEnd =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    sub.items.data[0]?.current_period_end ??
    nextThirtyDays();
  return {
    id: sub.id,
    object: 'subscription',
    customer,
    status: sub.status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: sub.cancel_at_period_end,
    items: { data: items },
    metadata: { ...(sub.metadata ?? {}) } as Record<string, string>,
  };
}

function adaptPortalSession(s: Stripe.BillingPortal.Session): StripeBillingPortalSession {
  const customer = typeof s.customer === 'string' ? s.customer : s.customer;
  return {
    id: s.id,
    object: 'billing_portal.session',
    url: s.url,
    customer: customer as string,
    return_url: s.return_url ?? '',
  };
}

let cachedSdk: Stripe | null = null;

function getStripeSdk(): Stripe {
  if (cachedSdk) return cachedSdk;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY missing — cannot build live Stripe SDK client');
  }
  cachedSdk = new Stripe(key, { typescript: true });
  return cachedSdk;
}

function buildLiveClient(): StudioStripeClient {
  return {
    checkout: {
      sessions: {
        async create(params) {
          try {
            const sdk = getStripeSdk();
            const session = await sdk.checkout.sessions.create({
              ...(params.customer ? { customer: params.customer } : {}),
              ...(params.customer_email ? { customer_email: params.customer_email } : {}),
              mode: params.mode,
              success_url: params.success_url,
              cancel_url: params.cancel_url,
              line_items: params.line_items.map((li) => ({
                price: li.price,
                quantity: li.quantity,
              })),
              ...(params.client_reference_id
                ? { client_reference_id: params.client_reference_id }
                : {}),
              ...(params.metadata ? { metadata: params.metadata } : {}),
              ...(params.subscription_data ? { subscription_data: params.subscription_data } : {}),
            });
            return adaptSession(session);
          } catch (err) {
            return captureLiveError(err, 'checkout.sessions.create');
          }
        },
        async retrieve(id) {
          try {
            const sdk = getStripeSdk();
            const session = await sdk.checkout.sessions.retrieve(id);
            return adaptSession(session);
          } catch (err) {
            return captureLiveError(err, 'checkout.sessions.retrieve');
          }
        },
      },
    },
    billingPortal: {
      sessions: {
        async create(params) {
          try {
            const sdk = getStripeSdk();
            const session = await sdk.billingPortal.sessions.create({
              customer: params.customer,
              return_url: params.return_url,
            });
            return adaptPortalSession(session);
          } catch (err) {
            return captureLiveError(err, 'billingPortal.sessions.create');
          }
        },
      },
    },
    customers: {
      async create(params) {
        try {
          const sdk = getStripeSdk();
          const created = await sdk.customers.create({
            ...(params.email ? { email: params.email } : {}),
            ...(params.name ? { name: params.name } : {}),
            ...(params.metadata ? { metadata: params.metadata } : {}),
          });
          return adaptCustomer(created);
        } catch (err) {
          return captureLiveError(err, 'customers.create');
        }
      },
      async retrieve(id) {
        try {
          const sdk = getStripeSdk();
          const customer = await sdk.customers.retrieve(id);
          return adaptCustomer(customer);
        } catch (err) {
          return captureLiveError(err, 'customers.retrieve');
        }
      },
    },
    subscriptions: {
      async update(id, params) {
        try {
          const sdk = getStripeSdk();
          const sub = await sdk.subscriptions.update(id, {
            ...(typeof params.cancel_at_period_end === 'boolean'
              ? { cancel_at_period_end: params.cancel_at_period_end }
              : {}),
            ...(params.metadata ? { metadata: params.metadata } : {}),
          });
          return adaptSubscription(sub);
        } catch (err) {
          return captureLiveError(err, 'subscriptions.update');
        }
      },
      async cancel(id) {
        try {
          const sdk = getStripeSdk();
          const sub = await sdk.subscriptions.cancel(id);
          return adaptSubscription(sub);
        } catch (err) {
          return captureLiveError(err, 'subscriptions.cancel');
        }
      },
    },
    webhooks: {
      constructEvent(rawBody, signature, secret) {
        try {
          const sdk = getStripeSdk();
          const event = sdk.webhooks.constructEvent(rawBody, signature, secret);
          return event as unknown as StripeWebhookEvent;
        } catch (err) {
          sentry.captureException(err, {
            tags: { feature: 'dmx-studio.stripe', op: 'webhook.constructEvent' },
          });
          throw err;
        }
      },
    },
  };
}

function buildStubClient(): StudioStripeClient {
  const customerStore = new Map<string, StripeCustomer>();
  const subscriptionStore = new Map<string, StripeSubscription>();

  return {
    checkout: {
      sessions: {
        async create(params) {
          const sessionId = mockId('cs_test');
          const customerId = params.customer ?? mockId('cus_test');
          const subscriptionId = params.mode === 'subscription' ? mockId('sub_test') : null;
          const session: StripeCheckoutSession = {
            id: sessionId,
            object: 'checkout.session',
            url: `https://checkout.stripe.com/c/pay/${sessionId}#stub`,
            customer: customerId,
            subscription: subscriptionId,
            mode: params.mode,
            status: 'open',
            metadata: { ...(params.metadata ?? {}) },
            success_url: params.success_url,
            cancel_url: params.cancel_url,
          };
          return session;
        },
        async retrieve(id) {
          return {
            id,
            object: 'checkout.session',
            url: `https://checkout.stripe.com/c/pay/${id}#stub`,
            customer: mockId('cus_test'),
            subscription: mockId('sub_test'),
            mode: 'subscription',
            status: 'complete',
            metadata: {},
            success_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel',
          };
        },
      },
    },
    billingPortal: {
      sessions: {
        async create(params) {
          const sessionId = mockId('bps_test');
          return {
            id: sessionId,
            object: 'billing_portal.session',
            url: `https://billing.stripe.com/p/session/${sessionId}#stub`,
            customer: params.customer,
            return_url: params.return_url,
          };
        },
      },
    },
    customers: {
      async create(params) {
        const id = mockId('cus_test');
        const customer: StripeCustomer = {
          id,
          object: 'customer',
          email: params.email ?? null,
          metadata: { ...(params.metadata ?? {}) },
          created: nowSeconds(),
        };
        customerStore.set(id, customer);
        return customer;
      },
      async retrieve(id) {
        const cached = customerStore.get(id);
        if (cached) return cached;
        return {
          id,
          object: 'customer',
          email: null,
          metadata: {},
          created: nowSeconds(),
        };
      },
    },
    subscriptions: {
      async update(id, params) {
        const existing = subscriptionStore.get(id);
        const updated: StripeSubscription = {
          id,
          object: 'subscription',
          customer: existing?.customer ?? mockId('cus_test'),
          status: existing?.status ?? 'active',
          current_period_start: existing?.current_period_start ?? nowSeconds(),
          current_period_end: existing?.current_period_end ?? nextThirtyDays(),
          cancel_at_period_end:
            params.cancel_at_period_end ?? existing?.cancel_at_period_end ?? false,
          items: existing?.items ?? { data: [] },
          metadata: { ...(existing?.metadata ?? {}), ...(params.metadata ?? {}) },
        };
        subscriptionStore.set(id, updated);
        return updated;
      },
      async cancel(id) {
        const existing = subscriptionStore.get(id);
        const canceled: StripeSubscription = {
          id,
          object: 'subscription',
          customer: existing?.customer ?? mockId('cus_test'),
          status: 'canceled',
          current_period_start: existing?.current_period_start ?? nowSeconds(),
          current_period_end: existing?.current_period_end ?? nextThirtyDays(),
          cancel_at_period_end: true,
          items: existing?.items ?? { data: [] },
          metadata: existing?.metadata ?? {},
        };
        subscriptionStore.set(id, canceled);
        return canceled;
      },
    },
    webhooks: {
      constructEvent(rawBody, signature, secret) {
        if (secret) {
          const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
          if (signature !== expected) {
            const err = new Error('stripe.webhooks.constructEvent: invalid signature');
            sentry.captureException(err, {
              tags: { feature: 'dmx-studio.stripe', op: 'webhook.verify' },
            });
            throw err;
          }
        }
        try {
          const parsed = JSON.parse(rawBody) as StripeWebhookEvent;
          return parsed;
        } catch (err) {
          sentry.captureException(err, {
            tags: { feature: 'dmx-studio.stripe', op: 'webhook.parse' },
          });
          throw new Error('stripe.webhooks.constructEvent: invalid JSON payload');
        }
      },
    },
  };
}

let cachedClient: StudioStripeClient | null = null;

export function getStripe(): StudioStripeClient {
  if (cachedClient) return cachedClient;
  cachedClient = isStubMode() ? buildStubClient() : buildLiveClient();
  return cachedClient;
}

export function __resetStripeClientForTests(): void {
  cachedClient = null;
  cachedSdk = null;
}

// Helper exposed for the API webhook route to compute the canonical stub
// signature (sha256 hex of rawBody with the shared secret) when no real
// Stripe SDK is installed.
export function computeStubWebhookSignature(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function fingerprintRawBody(rawBody: string): string {
  return createHash('sha256').update(rawBody).digest('hex').slice(0, 16);
}
