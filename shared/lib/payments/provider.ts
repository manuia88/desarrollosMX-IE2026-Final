export type CheckoutInput = {
  amount_minor: number;
  currency: string;
  customer_email: string;
  description: string;
  metadata?: Record<string, string>;
  success_url: string;
  cancel_url: string;
};

export type SubscriptionInput = {
  customer_id: string;
  plan_id: string;
  trial_days?: number;
  metadata?: Record<string, string>;
};

export type ConnectInput = {
  country_code: string;
  business_type: 'individual' | 'company';
  email: string;
  return_url: string;
  refresh_url: string;
};

export type WebhookEvent = {
  id: string;
  type: string;
  payload: unknown;
  received_at: string;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckout(opts: CheckoutInput): Promise<{ url: string; session_id: string }>;
  createSubscription(opts: SubscriptionInput): Promise<{ subscription_id: string; status: string }>;
  createConnectAccount(opts: ConnectInput): Promise<{ account_id: string; onboarding_url: string }>;
  handleWebhook(body: unknown, signature: string): Promise<WebhookEvent>;
}

export class NotImplementedPaymentError extends Error {
  constructor(provider: string, method: string) {
    super(`${provider}.${method} not implemented — stub until FASE 18`);
    this.name = 'NotImplementedPaymentError';
  }
}
