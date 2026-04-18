export const PAYMENT_PROVIDERS = {
  MX: {
    primary: 'stripe',
    secondary: 'mercadopago',
    connect: 'stripe_connect',
    methods: ['card', 'oxxo', 'spei', 'mercadopago_wallet'],
  },
  CO: {
    primary: 'mercadopago',
    secondary: 'wompi',
    connect: null,
    methods: ['card', 'pse', 'mercadopago_wallet', 'nequi'],
  },
  AR: {
    primary: 'mercadopago',
    secondary: null,
    connect: null,
    methods: ['card', 'mercadopago_wallet', 'rapipago', 'pagofacil'],
  },
  BR: {
    primary: 'mercadopago',
    secondary: 'stripe',
    connect: 'stripe_connect',
    methods: ['card', 'pix', 'boleto', 'mercadopago_wallet'],
  },
  CL: {
    primary: 'mercadopago',
    secondary: 'stripe',
    connect: 'stripe_connect',
    methods: ['card', 'webpay', 'mercadopago_wallet'],
  },
  US: {
    primary: 'stripe',
    secondary: null,
    connect: 'stripe_connect',
    methods: ['card', 'ach', 'apple_pay', 'google_pay'],
  },
} as const;

export type PaymentCountry = keyof typeof PAYMENT_PROVIDERS;
export type PaymentConfig = (typeof PAYMENT_PROVIDERS)[PaymentCountry];

export function getPaymentConfig(country: string): PaymentConfig | null {
  return (PAYMENT_PROVIDERS as Record<string, PaymentConfig>)[country] ?? null;
}
