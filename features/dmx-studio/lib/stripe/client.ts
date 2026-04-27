// DMX Studio dentro DMX único entorno (ADR-054). Stripe SDK wrapper STUB.
// STUB ADR-018 — activar L-NEW-STRIPE-SDK-INSTALL.
// 4 señales: comentario inline + fail-fast cuando se intenta usar live key sin
// SDK instalado + tests deterministas con mock IDs + L-NEW pendiente.
//
// Diseño: cuando STRIPE_SECRET_KEY no está set o es 'sk_test_stub', el wrapper
// devuelve mock IDs deterministas (cs_test_*, cus_test_*, sub_test_*) que se
// persisten en BD igual que IDs reales. Esto permite cablear el stack
// completo (UI -> tRPC -> wrapper -> DB) sin gastar credits Stripe.
// Cuando STRIPE_SECRET_KEY=sk_live_* o sk_test_real_*, el wrapper lanza un
// error explícito hasta que el SDK se instale via L-NEW-STRIPE-SDK-INSTALL.

import { createHash, createHmac, randomUUID } from 'node:crypto';
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

function liveModeNotInstalled(op: string): never {
  const err = new Error(
    `Stripe SDK not installed — install via L-NEW-STRIPE-SDK-INSTALL approval (op=${op})`,
  );
  sentry.captureException(err, {
    tags: { feature: 'dmx-studio.stripe', op, mode: 'live-blocked' },
  });
  throw err;
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

function buildLiveBlockedClient(): StudioStripeClient {
  return {
    checkout: {
      sessions: {
        create: () => liveModeNotInstalled('checkout.sessions.create'),
        retrieve: () => liveModeNotInstalled('checkout.sessions.retrieve'),
      },
    },
    billingPortal: {
      sessions: {
        create: () => liveModeNotInstalled('billingPortal.sessions.create'),
      },
    },
    customers: {
      create: () => liveModeNotInstalled('customers.create'),
      retrieve: () => liveModeNotInstalled('customers.retrieve'),
    },
    subscriptions: {
      update: () => liveModeNotInstalled('subscriptions.update'),
      cancel: () => liveModeNotInstalled('subscriptions.cancel'),
    },
    webhooks: {
      constructEvent: () => liveModeNotInstalled('webhooks.constructEvent'),
    },
  };
}

let cachedClient: StudioStripeClient | null = null;

export function getStripe(): StudioStripeClient {
  if (cachedClient) return cachedClient;
  cachedClient = isStubMode() ? buildStubClient() : buildLiveBlockedClient();
  return cachedClient;
}

// Test-only: clear cached singleton between tests.
export function __resetStripeClientForTests(): void {
  cachedClient = null;
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
