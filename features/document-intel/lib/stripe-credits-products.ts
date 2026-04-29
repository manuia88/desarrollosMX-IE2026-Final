// FASE 17.STRIPE — Pack saldo IA $25 USD canon (ADR-062 monetización).
// Authority: ADR-062 + biblia v5 N+7 + plan FASE_17 addendum v3.
//
// Decisión canon "no anclar a un mismo punto" (founder 2026-04-29):
// Price ID en env var `STRIPE_PRICE_AI_CREDITS_PACK_25` — founder rota sin
// redeploy, separado de Studio prices (cascade-resilient).

export const AI_CREDITS_PACK_25_USD_AMOUNT = 25;

export const AI_CREDITS_PACK_25_PRICE_ID_ENV = 'STRIPE_PRICE_AI_CREDITS_PACK_25';

export interface CreditsPackDefinition {
  readonly key: 'pack_25_usd';
  readonly name: string;
  readonly priceUsd: number;
  readonly creditsAddedUsd: number;
  readonly description: string;
}

// Pack $25 USD = $25 saldo IA (markup 50% se aplica sobre cost real Anthropic
// en consume time, no sobre face value del Pack).
export const AI_CREDITS_PACK_25: CreditsPackDefinition = {
  key: 'pack_25_usd',
  name: 'Pack saldo IA — $25 USD',
  priceUsd: AI_CREDITS_PACK_25_USD_AMOUNT,
  creditsAddedUsd: AI_CREDITS_PACK_25_USD_AMOUNT,
  description:
    'Saldo IA $25 USD prepago — cubre ~500 unidades onboarding + ~30 actualizaciones LP futuras.',
};

export function getAiCreditsPack25PriceId(): string {
  const priceId = process.env[AI_CREDITS_PACK_25_PRICE_ID_ENV] ?? '';
  if (!priceId) {
    throw new Error(`${AI_CREDITS_PACK_25_PRICE_ID_ENV} env var missing`);
  }
  return priceId;
}

export function isAiCreditsPack25PriceConfigured(): boolean {
  const priceId = process.env[AI_CREDITS_PACK_25_PRICE_ID_ENV] ?? '';
  return priceId.length > 0;
}
