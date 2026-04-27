// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Waitlist join orchestration: priority score + founders cohort assignment +
// idempotent insert (lower(email) unique) + welcome email trigger.

import { sendWelcomeEmail } from '@/features/dmx-studio/lib/resend';
import { type AdminSupabase, getCohortPosition } from './founders-cohort';
import type { StudioWaitlistRole } from './priority-scoring';
import { calculatePriorityScore } from './priority-scoring';

export interface JoinWaitlistInput {
  readonly email: string;
  readonly name?: string | undefined;
  readonly phone?: string | undefined;
  readonly role: StudioWaitlistRole;
  readonly city?: string | undefined;
  readonly countryCode: string;
  readonly utmSource?: string | undefined;
  readonly utmMedium?: string | undefined;
  readonly utmCampaign?: string | undefined;
  readonly currentUserId?: string | null | undefined;
  readonly currentLeadsCount?: number | null | undefined;
  readonly currentClosedDealsCount?: number | null | undefined;
  readonly source?: string | undefined;
}

export interface JoinWaitlistResult {
  readonly id: string;
  readonly createdAt: string;
  readonly foundersCohortEligible: boolean;
  readonly foundersCohortPosition: number | null;
  readonly priorityScore: number;
  readonly alreadyExisted: boolean;
}

export async function joinWaitlist(
  supabase: AdminSupabase,
  input: JoinWaitlistInput,
): Promise<JoinWaitlistResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const isExistingUser = typeof input.currentUserId === 'string' && input.currentUserId.length > 0;

  // 1. Check if email already on waitlist (idempotent ON CONFLICT DO NOTHING).
  const { data: existing, error: existingError } = await supabase
    .from('studio_waitlist')
    .select('id, created_at, founders_cohort_eligible, founders_cohort_position, priority_score')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (existingError) {
    throw new Error(`waitlist lookup failed: ${existingError.message}`);
  }

  if (existing) {
    return {
      id: existing.id,
      createdAt: existing.created_at,
      foundersCohortEligible: existing.founders_cohort_eligible,
      foundersCohortPosition: existing.founders_cohort_position ?? null,
      priorityScore: existing.priority_score,
      alreadyExisted: true,
    };
  }

  // 2. Compute priority score + founders cohort eligibility.
  const priorityScore = calculatePriorityScore({
    role: input.role,
    currentLeadsCount: input.currentLeadsCount ?? null,
    currentClosedDealsCount: input.currentClosedDealsCount ?? null,
    isExistingUser,
  });

  const cohortPosition = await getCohortPosition(supabase);
  const foundersCohortEligible = cohortPosition !== null;

  // 3. INSERT row.
  const { data: inserted, error: insertError } = await supabase
    .from('studio_waitlist')
    .insert({
      email: normalizedEmail,
      name: input.name ?? null,
      phone: input.phone ?? null,
      role: input.role,
      city: input.city ?? null,
      country_code: input.countryCode,
      current_user_id: input.currentUserId ?? null,
      current_leads_count: input.currentLeadsCount ?? null,
      current_closed_deals_count: input.currentClosedDealsCount ?? null,
      priority_score: priorityScore,
      founders_cohort_eligible: foundersCohortEligible,
      founders_cohort_position: cohortPosition,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      source: input.source ?? null,
    })
    .select('id, created_at, founders_cohort_eligible, founders_cohort_position, priority_score')
    .single();

  if (insertError) {
    // Race condition: someone else inserted same email between our SELECT and INSERT.
    // Re-read and return alreadyExisted.
    const { data: raceRow } = await supabase
      .from('studio_waitlist')
      .select('id, created_at, founders_cohort_eligible, founders_cohort_position, priority_score')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (raceRow) {
      return {
        id: raceRow.id,
        createdAt: raceRow.created_at,
        foundersCohortEligible: raceRow.founders_cohort_eligible,
        foundersCohortPosition: raceRow.founders_cohort_position ?? null,
        priorityScore: raceRow.priority_score,
        alreadyExisted: true,
      };
    }
    throw new Error(`waitlist insert failed: ${insertError.message}`);
  }

  // 4. Trigger welcome email (mock in CI/dev/test, Resend STUB in production
  // until L-NEW-RESEND-INSTALL approved). Failure must not block signup.
  try {
    await sendWelcomeEmail({
      to: normalizedEmail,
      name: input.name,
      foundersCohortEligible: inserted.founders_cohort_eligible,
      position: inserted.founders_cohort_position ?? null,
    });
  } catch (err) {
    // Email failures must not break signup UX.
    console.warn('[waitlist] welcome email send failed', {
      email: normalizedEmail,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    id: inserted.id,
    createdAt: inserted.created_at,
    foundersCohortEligible: inserted.founders_cohort_eligible,
    foundersCohortPosition: inserted.founders_cohort_position ?? null,
    priorityScore: inserted.priority_score,
    alreadyExisted: false,
  };
}
