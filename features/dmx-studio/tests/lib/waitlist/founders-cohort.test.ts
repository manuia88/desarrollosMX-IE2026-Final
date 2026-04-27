// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Founders cohort eligibility unit tests.

import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  FOUNDERS_COHORT_LIMIT,
  isFounderEligible,
} from '@/features/dmx-studio/lib/waitlist/founders-cohort';
import type { Database } from '@/shared/types/database';

function buildSupabaseWithCount(count: number): SupabaseClient<Database> {
  // Mock chain: from(...).select(..., { count, head:true }).eq(...) -> { count, error: null }
  const eq = vi.fn().mockResolvedValue({ count, error: null });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as SupabaseClient<Database>;
}

describe('isFounderEligible', () => {
  it('returns true when fewer than 50 eligible rows exist', async () => {
    const supabase = buildSupabaseWithCount(FOUNDERS_COHORT_LIMIT - 1);
    const eligible = await isFounderEligible(supabase);
    expect(eligible).toBe(true);
  });

  it('returns false when 50 or more eligible rows exist', async () => {
    const supabase = buildSupabaseWithCount(FOUNDERS_COHORT_LIMIT);
    const eligible = await isFounderEligible(supabase);
    expect(eligible).toBe(false);
  });
});
