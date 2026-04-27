// DMX Studio dentro DMX único entorno (ADR-054). Stripe billing portal helper.
// STUB ADR-018 — activar L-NEW-STRIPE-SDK-INSTALL.

import { getStripe } from './client';

export interface CreatePortalSessionInput {
  readonly customerId: string;
  readonly returnUrl: string;
}

export interface CreatePortalSessionResult {
  readonly url: string;
  readonly sessionId: string;
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

export async function createPortalSession(
  input: CreatePortalSessionInput,
): Promise<CreatePortalSessionResult> {
  if (!input.customerId) {
    throw new Error('createPortalSession: customerId required');
  }
  const stripe = getStripe();
  const origin = resolveAppOrigin();
  const returnUrl = ensureFullyQualifiedUrl(input.returnUrl, origin);
  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: returnUrl,
  });
  return { url: session.url, sessionId: session.id };
}
