// F14.F.10 Sprint 9 BIBLIA — Photographer Stripe Foto plan checkout flow.
// Wrapper específico Plan Foto $67/mo: pre-empareja photographer profile metadata
// para que el webhook subscription.created detecte plan_key=foto y active features
// canon (photo_pack_50, no_branding, voice_narration_elevenlabs, copy_pack_basic).
// Usa createStudioCheckoutSessionOverride (B2B2C standalone, NO parte STUDIO_PLANS
// main tier post FASE 14.F.12).

import { createStudioCheckoutSessionOverride } from '@/features/dmx-studio/lib/stripe/checkout';
import { STUDIO_STRIPE_PRICE_FOTO_USD_67_LEGACY_PHOTOGRAPHER_B2B2C } from '@/features/dmx-studio/lib/stripe-products';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface CreatePhotoCheckoutInput {
  readonly userId: string;
  readonly userEmail: string | null;
  readonly successPath?: string;
  readonly cancelPath?: string;
}

export interface CreatePhotoCheckoutResult {
  readonly url: string;
  readonly sessionId: string;
  readonly customerId: string;
  readonly priceId: string;
}

export const PHOTOGRAPHER_DEFAULT_SUCCESS_PATH = '/studio-app/photographer/onboarding-success';
export const PHOTOGRAPHER_DEFAULT_CANCEL_PATH = '/studio-app/photographer/onboarding';

const PHOTO_PLAN_VIDEOS_PER_MONTH = 50;

export async function createPhotoCheckoutSession(
  input: CreatePhotoCheckoutInput,
): Promise<CreatePhotoCheckoutResult> {
  if (!input.userId) {
    throw new Error('createPhotoCheckoutSession: userId required');
  }

  const result = await createStudioCheckoutSessionOverride({
    userId: input.userId,
    userEmail: input.userEmail,
    priceId: STUDIO_STRIPE_PRICE_FOTO_USD_67_LEGACY_PHOTOGRAPHER_B2B2C,
    planKeyMetadata: 'foto',
    videosPerMonthLimit: PHOTO_PLAN_VIDEOS_PER_MONTH,
    successUrl: input.successPath ?? PHOTOGRAPHER_DEFAULT_SUCCESS_PATH,
    cancelUrl: input.cancelPath ?? PHOTOGRAPHER_DEFAULT_CANCEL_PATH,
  });

  // Defensive: ensure the wrapper actually used the Foto plan price (canon lock).
  if (result.priceId !== STUDIO_STRIPE_PRICE_FOTO_USD_67_LEGACY_PHOTOGRAPHER_B2B2C) {
    const err = new Error(
      `createPhotoCheckoutSession: expected priceId=${STUDIO_STRIPE_PRICE_FOTO_USD_67_LEGACY_PHOTOGRAPHER_B2B2C}, got=${result.priceId}`,
    );
    sentry.captureException(err, {
      tags: { feature: 'studio.photographer', op: 'stripe_foto.price_mismatch' },
    });
    throw err;
  }

  await annotateCustomerForPhotographer(input.userId, result.customerId);

  return result;
}

async function annotateCustomerForPhotographer(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('studio_users_extension')
    .update({
      meta: { stripe_customer_id: stripeCustomerId, intended_role: 'studio_photographer' },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    // Non-fatal: log + continue. Webhook subscription.created will still
    // associate plan_key=foto via subscription metadata.
    sentry.captureException(error, {
      tags: { feature: 'studio.photographer', op: 'stripe_foto.annotate_customer' },
    });
  }
}
