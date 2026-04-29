// FASE 17.STRIPE — Stripe SDK genérico cross-feature (ADR-062 + regla E.1).
// Wrapper compartido entre features (document-intel credits, future billing,
// future Connect F18). NO acoplado a un solo dominio.
//
// Modo dual canon:
// - Live mode: STRIPE_SECRET_KEY=sk_(test|live)_... → SDK real Stripe v22.
// - Stub mode: STRIPE_SECRET_KEY ausente o 'sk_test_stub' → IDs deterministas
//   round-trip BD para tests CI/dev sin gastar tokens.

import Stripe from 'stripe';

let cachedClient: Stripe | null = null;

function isStubMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return key === '' || key === 'sk_test_stub';
}

export function getStripeSDK(): Stripe {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey || isStubMode()) {
    throw new Error('STRIPE_SECRET_KEY missing or stub — live SDK required');
  }
  cachedClient = new Stripe(apiKey, {
    // biome-ignore lint/suspicious/noExplicitAny: Stripe apiVersion typed as opaque string union not exposed via SDK types
    apiVersion: '2024-12-18.acacia' as any,
    typescript: true,
  });
  return cachedClient;
}

export function isStripeStubMode(): boolean {
  return isStubMode();
}

export function resolveAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  if (explicit) return explicit.replace(/\/$/, '');
  const vercelUrl = process.env.VERCEL_URL ?? '';
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export function ensureFullyQualifiedUrl(path: string, base: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const trimmedBase = base.replace(/\/$/, '');
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}
