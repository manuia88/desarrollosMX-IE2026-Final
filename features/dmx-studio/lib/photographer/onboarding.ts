// F14.F.10 Sprint 9 BIBLIA — Photographer onboarding helpers.
// Server-side helpers ejecutables desde tRPC routes / Server Actions / API routes.
// 1. startPhotographerOnboarding: ensure studio_users_extension role + insert
//    studio_photographers row idempotente con slug auto-generado.
// 2. setupCustomSlug: validar uniqueness y aplicar slug custom.
// Plan-gate (Foto $67) NO se enforça aquí — Stripe checkout lleva al user al plan.
// Esta función prepara la BD pre-checkout para que el webhook pueda emparejar
// user_id ↔ photographer profile.

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface PhotographerBusinessData {
  readonly businessName: string;
  readonly email: string;
  readonly phone?: string | null;
  readonly bio?: string | null;
  readonly website?: string | null;
  readonly specialityZones?: ReadonlyArray<string>;
  readonly yearsExperience?: number | null;
}

export interface StartPhotographerOnboardingResult {
  readonly photographerId: string;
  readonly slug: string;
  readonly created: boolean;
}

const PHOTOGRAPHER_ROLE = 'studio_photographer' as const;
const SLUG_RANDOM_LEN = 6;
const SLUG_MAX_LEN = 60;
const BUSINESS_NAME_MIN = 2;
const BUSINESS_NAME_MAX = 100;

export function generatePhotographerSlug(businessName: string): string {
  const base = businessName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LEN - SLUG_RANDOM_LEN - 1);
  const suffix = Math.random()
    .toString(36)
    .slice(2, 2 + SLUG_RANDOM_LEN);
  return `${base}-${suffix}`;
}

export function validateBusinessName(name: string): void {
  const trimmed = name.trim();
  if (trimmed.length < BUSINESS_NAME_MIN || trimmed.length > BUSINESS_NAME_MAX) {
    throw new Error(
      `business_name must be between ${BUSINESS_NAME_MIN} and ${BUSINESS_NAME_MAX} chars`,
    );
  }
}

export async function startPhotographerOnboarding(
  userId: string,
  businessData: PhotographerBusinessData,
): Promise<StartPhotographerOnboardingResult> {
  validateBusinessName(businessData.businessName);
  const supabase = createAdminClient();

  // Idempotency: if profile already exists return it without overwriting.
  const { data: existing, error: existingErr } = await supabase
    .from('studio_photographers')
    .select('id, slug')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingErr) {
    sentry.captureException(existingErr, {
      tags: { feature: 'studio.photographer', op: 'onboarding.select_existing' },
    });
    throw new Error(`startPhotographerOnboarding.select: ${existingErr.message}`);
  }

  // Always ensure studio_users_extension exists with photographer role.
  await ensurePhotographerRole(userId);

  if (existing) {
    return {
      photographerId: existing.id,
      slug: existing.slug,
      created: false,
    };
  }

  const slug = generatePhotographerSlug(businessData.businessName);

  const { data: inserted, error: insertErr } = await supabase
    .from('studio_photographers')
    .insert({
      user_id: userId,
      business_name: businessData.businessName,
      slug,
      email: businessData.email,
      phone: businessData.phone ?? null,
      bio: businessData.bio ?? null,
      website: businessData.website ?? null,
      speciality_zones: businessData.specialityZones ? [...businessData.specialityZones] : [],
      years_experience: businessData.yearsExperience ?? null,
    })
    .select('id, slug')
    .single();

  if (insertErr || !inserted) {
    sentry.captureException(insertErr ?? new Error('insert returned no row'), {
      tags: { feature: 'studio.photographer', op: 'onboarding.insert' },
    });
    throw new Error(
      `startPhotographerOnboarding.insert: ${insertErr?.message ?? 'no_row_returned'}`,
    );
  }

  return {
    photographerId: inserted.id,
    slug: inserted.slug,
    created: true,
  };
}

async function ensurePhotographerRole(userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: extension, error: selErr } = await supabase
    .from('studio_users_extension')
    .select('user_id, studio_role')
    .eq('user_id', userId)
    .maybeSingle();

  if (selErr) {
    sentry.captureException(selErr, {
      tags: { feature: 'studio.photographer', op: 'onboarding.ensure_role.select' },
    });
    throw new Error(`ensurePhotographerRole.select: ${selErr.message}`);
  }

  if (!extension) {
    const { error: insErr } = await supabase.from('studio_users_extension').insert({
      user_id: userId,
      studio_role: PHOTOGRAPHER_ROLE,
      onboarding_completed: false,
    });
    if (insErr) {
      sentry.captureException(insErr, {
        tags: { feature: 'studio.photographer', op: 'onboarding.ensure_role.insert' },
      });
      throw new Error(`ensurePhotographerRole.insert: ${insErr.message}`);
    }
    return;
  }

  if (extension.studio_role !== PHOTOGRAPHER_ROLE) {
    const { error: updErr } = await supabase
      .from('studio_users_extension')
      .update({ studio_role: PHOTOGRAPHER_ROLE, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (updErr) {
      sentry.captureException(updErr, {
        tags: { feature: 'studio.photographer', op: 'onboarding.ensure_role.update' },
      });
      throw new Error(`ensurePhotographerRole.update: ${updErr.message}`);
    }
  }
}

export interface SetupCustomSlugResult {
  readonly slug: string;
}

export async function setupCustomSlug(
  userId: string,
  slug: string,
): Promise<SetupCustomSlugResult> {
  if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 3 || slug.length > SLUG_MAX_LEN) {
    throw new Error('slug must be kebab-case 3-60 chars');
  }
  const supabase = createAdminClient();

  const { data: clash, error: clashErr } = await supabase
    .from('studio_photographers')
    .select('user_id')
    .eq('slug', slug)
    .neq('user_id', userId)
    .maybeSingle();

  if (clashErr) {
    sentry.captureException(clashErr, {
      tags: { feature: 'studio.photographer', op: 'onboarding.slug.clash_check' },
    });
    throw new Error(`setupCustomSlug.clash_check: ${clashErr.message}`);
  }

  if (clash) {
    throw new Error('slug_already_taken');
  }

  const { data, error } = await supabase
    .from('studio_photographers')
    .update({ slug, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('slug')
    .single();

  if (error || !data) {
    sentry.captureException(error ?? new Error('update returned no row'), {
      tags: { feature: 'studio.photographer', op: 'onboarding.slug.update' },
    });
    throw new Error(`setupCustomSlug.update: ${error?.message ?? 'no_row'}`);
  }

  return { slug: data.slug };
}

export async function acceptResellerTerms(
  userId: string,
): Promise<{ readonly acceptedAt: string }> {
  const supabase = createAdminClient();
  const acceptedAt = new Date().toISOString();
  const { error } = await supabase
    .from('studio_photographers')
    .update({ reseller_terms_accepted_at: acceptedAt, updated_at: acceptedAt })
    .eq('user_id', userId);

  if (error) {
    sentry.captureException(error, {
      tags: { feature: 'studio.photographer', op: 'onboarding.reseller_terms' },
    });
    throw new Error(`acceptResellerTerms: ${error.message}`);
  }

  return { acceptedAt };
}
