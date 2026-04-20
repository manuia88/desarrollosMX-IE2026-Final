// AVM MVP I01 — feature registry tier gating.
// Ref: FASE_08 §BLOQUE 8.D.4 + 03.10 §feature_registry + ADR-008 monetization.
//
// Binding formal con tabla `feature_registry` se completa en FASE 23. Este
// module es la fuente programática que tanto el endpoint como la UI consumen
// hasta que feature_registry.code='avm_estimate' reciba el binding final.

export type AvmTier = 'free' | 'pro' | 'enterprise';

export interface AvmQuota {
  readonly quota: number; // -1 = unlimited
  readonly period: 'month';
  readonly upgrade_url: string;
}

export const AVM_FEATURE_CODE = 'public.indices.avm_estimate' as const;

export const AVM_TIERS: Readonly<Record<AvmTier, AvmQuota>> = {
  free: {
    quota: 5,
    period: 'month',
    upgrade_url: '/estimate#pricing',
  },
  pro: {
    quota: -1,
    period: 'month',
    upgrade_url: '/estimate#pricing',
  },
  enterprise: {
    quota: -1,
    period: 'month',
    upgrade_url: '/estimate#pricing',
  },
};
