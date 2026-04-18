import { getPaymentConfig } from './config';
import { MercadoPagoProvider } from './mercadopago';
import type { PaymentProvider } from './provider';
import { StripeProvider } from './stripe';
import { WompiProvider } from './wompi';

export type { PaymentConfig, PaymentCountry } from './config';
export { getPaymentConfig, PAYMENT_PROVIDERS } from './config';
export { MercadoPagoProvider } from './mercadopago';
export type {
  CheckoutInput,
  ConnectInput,
  PaymentProvider,
  SubscriptionInput,
  WebhookEvent,
} from './provider';
export { NotImplementedPaymentError } from './provider';
export { StripeProvider } from './stripe';
export { WompiProvider } from './wompi';

export function getPaymentProvider(providerName: string): PaymentProvider {
  switch (providerName) {
    case 'stripe':
    case 'stripe_connect':
      return new StripeProvider();
    case 'mercadopago':
      return new MercadoPagoProvider();
    case 'wompi':
      return new WompiProvider();
    default:
      throw new Error(`Unknown payment provider: ${providerName}`);
  }
}

export function getPrimaryProviderForCountry(country: string): PaymentProvider | null {
  const config = getPaymentConfig(country);
  if (!config) return null;
  return getPaymentProvider(config.primary);
}
