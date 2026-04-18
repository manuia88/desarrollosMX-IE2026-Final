import type {
  CheckoutInput,
  ConnectInput,
  PaymentProvider,
  SubscriptionInput,
  WebhookEvent,
} from './provider';
import { NotImplementedPaymentError } from './provider';

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';

  async createCheckout(_opts: CheckoutInput): Promise<{ url: string; session_id: string }> {
    throw new NotImplementedPaymentError(this.name, 'createCheckout');
  }

  async createSubscription(
    _opts: SubscriptionInput,
  ): Promise<{ subscription_id: string; status: string }> {
    throw new NotImplementedPaymentError(this.name, 'createSubscription');
  }

  async createConnectAccount(
    _opts: ConnectInput,
  ): Promise<{ account_id: string; onboarding_url: string }> {
    throw new NotImplementedPaymentError(this.name, 'createConnectAccount');
  }

  async handleWebhook(_body: unknown, _signature: string): Promise<WebhookEvent> {
    throw new NotImplementedPaymentError(this.name, 'handleWebhook');
  }
}
