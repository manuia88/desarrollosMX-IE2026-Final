// DMX Studio dentro DMX único entorno (ADR-054). Stripe wrapper minimal types.
// STUB ADR-018 — activar L-NEW-STRIPE-SDK-INSTALL: hasta entonces tipamos lo
// estrictamente necesario para que el resto del stack (tRPC + API + DB) sea
// type-safe. Cuando se instale `stripe` SDK, sustituir estos shapes por
// `import type Stripe from 'stripe'` y eliminar este archivo.

export type StripeSubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

export interface StripeCustomer {
  readonly id: string;
  readonly object: 'customer';
  readonly email: string | null;
  readonly metadata: Record<string, string>;
  readonly created: number;
}

export interface StripeCheckoutSession {
  readonly id: string;
  readonly object: 'checkout.session';
  readonly url: string | null;
  readonly customer: string | null;
  readonly subscription: string | null;
  readonly mode: 'subscription' | 'payment' | 'setup';
  readonly status: 'open' | 'complete' | 'expired' | null;
  readonly metadata: Record<string, string>;
  readonly success_url: string;
  readonly cancel_url: string;
}

export interface StripeBillingPortalSession {
  readonly id: string;
  readonly object: 'billing_portal.session';
  readonly url: string;
  readonly customer: string;
  readonly return_url: string;
}

export interface StripeSubscriptionItem {
  readonly id: string;
  readonly price: { readonly id: string };
}

export interface StripeSubscription {
  readonly id: string;
  readonly object: 'subscription';
  readonly customer: string;
  readonly status: StripeSubscriptionStatus;
  readonly current_period_start: number;
  readonly current_period_end: number;
  readonly cancel_at_period_end: boolean;
  readonly items: { readonly data: readonly StripeSubscriptionItem[] };
  readonly metadata: Record<string, string>;
}

export interface StripeInvoice {
  readonly id: string;
  readonly object: 'invoice';
  readonly customer: string;
  readonly subscription: string | null;
  readonly status: string | null;
  readonly attempt_count: number;
}

export type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed';

export interface StripeWebhookEvent {
  readonly id: string;
  readonly object: 'event';
  readonly type: StripeWebhookEventType | string;
  readonly created: number;
  readonly data: {
    readonly object:
      | StripeCheckoutSession
      | StripeSubscription
      | StripeInvoice
      | Record<string, unknown>;
  };
}

export interface CreateCheckoutSessionParams {
  readonly customer?: string;
  readonly customer_email?: string;
  readonly mode: 'subscription' | 'payment' | 'setup';
  readonly success_url: string;
  readonly cancel_url: string;
  readonly line_items: ReadonlyArray<{
    readonly price: string;
    readonly quantity: number;
  }>;
  readonly metadata?: Record<string, string>;
  readonly subscription_data?: {
    readonly metadata?: Record<string, string>;
  };
  readonly client_reference_id?: string;
}

export interface CreateBillingPortalSessionParams {
  readonly customer: string;
  readonly return_url: string;
}

export interface CreateCustomerParams {
  readonly email?: string;
  readonly name?: string;
  readonly metadata?: Record<string, string>;
}

export interface UpdateSubscriptionParams {
  readonly cancel_at_period_end?: boolean;
  readonly metadata?: Record<string, string>;
}
