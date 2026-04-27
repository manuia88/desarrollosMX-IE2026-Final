// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Founders cohort eligibility: primeros 50 waitlist signups con
// founders_cohort_eligible=true.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export const FOUNDERS_COHORT_LIMIT = 50 as const;

export type AdminSupabase = SupabaseClient<Database>;

export interface FoundersCohortStatus {
  readonly eligible: boolean;
  readonly used: number;
  readonly remaining: number;
  readonly total: typeof FOUNDERS_COHORT_LIMIT;
}

async function countEligible(supabase: AdminSupabase): Promise<number> {
  const { count, error } = await supabase
    .from('studio_waitlist')
    .select('id', { count: 'exact', head: true })
    .eq('founders_cohort_eligible', true);
  if (error) {
    throw new Error(`founders-cohort countEligible failed: ${error.message}`);
  }
  return count ?? 0;
}

export async function isFounderEligible(supabase: AdminSupabase): Promise<boolean> {
  const used = await countEligible(supabase);
  return used < FOUNDERS_COHORT_LIMIT;
}

// Returns the cohort position the next eligible signup would receive, or null
// if the cohort is already full.
export async function getCohortPosition(supabase: AdminSupabase): Promise<number | null> {
  const used = await countEligible(supabase);
  if (used >= FOUNDERS_COHORT_LIMIT) return null;
  return used + 1;
}

export async function getFoundersCohortStatus(
  supabase: AdminSupabase,
): Promise<FoundersCohortStatus> {
  const used = await countEligible(supabase);
  const remaining = Math.max(FOUNDERS_COHORT_LIMIT - used, 0);
  return {
    eligible: used < FOUNDERS_COHORT_LIMIT,
    used,
    remaining,
    total: FOUNDERS_COHORT_LIMIT,
  };
}
