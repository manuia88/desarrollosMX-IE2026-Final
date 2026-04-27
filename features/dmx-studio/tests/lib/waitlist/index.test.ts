// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// joinWaitlist orchestration unit tests.
// Modo A: createCaller-style — supabase + email provider mocked, no real DB.

import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';

const sendWelcomeEmailMock = vi.fn(async () => ({
  providerMessageId: 'mock-id',
  provider: 'mock' as const,
  accepted: true,
  error: null,
}));

vi.mock('@/features/dmx-studio/lib/resend', () => ({
  sendWelcomeEmail: sendWelcomeEmailMock,
}));

interface MockSupabaseOptions {
  readonly existingRow?: {
    id: string;
    created_at: string;
    founders_cohort_eligible: boolean;
    founders_cohort_position: number | null;
    priority_score: number;
  } | null;
  readonly cohortUsedCount: number;
  readonly insertReturn?: {
    id: string;
    created_at: string;
    founders_cohort_eligible: boolean;
    founders_cohort_position: number | null;
    priority_score: number;
  };
}

function buildMockSupabase(opts: MockSupabaseOptions): SupabaseClient<Database> {
  // existing-row select chain: from('studio_waitlist').select(cols).eq('email', x).maybeSingle()
  const existingMaybeSingle = vi
    .fn()
    .mockResolvedValue({ data: opts.existingRow ?? null, error: null });
  const existingEq = vi.fn().mockReturnValue({ maybeSingle: existingMaybeSingle });
  // cohort count chain: from('studio_waitlist').select(cols, { count, head:true }).eq('founders_cohort_eligible', true)
  const cohortEq = vi.fn().mockResolvedValue({ count: opts.cohortUsedCount, error: null });
  // insert chain: from('studio_waitlist').insert(payload).select(cols).single()
  const insertSingle = vi.fn().mockResolvedValue({
    data: opts.insertReturn ?? null,
    error: null,
  });
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
  const insert = vi.fn().mockReturnValue({ select: insertSelect });

  // select() must dispatch based on call shape. We track call sequence per
  // from('studio_waitlist'):
  //   1st select(cols) → existing lookup (no count opts)
  //   2nd select(cols, { count: 'exact', head: true }) → cohort count
  let _selectCallIndex = 0;
  const select = vi.fn((_cols: string, options?: { count?: string; head?: boolean }) => {
    if (options?.count === 'exact') {
      _selectCallIndex += 1;
      return { eq: cohortEq };
    }
    _selectCallIndex += 1;
    return { eq: existingEq };
  });

  const from = vi.fn().mockReturnValue({ select, insert });

  return { from } as unknown as SupabaseClient<Database>;
}

beforeEach(() => {
  sendWelcomeEmailMock.mockClear();
});

afterEach(() => {
  vi.resetModules();
});

describe('joinWaitlist', () => {
  it('happy path: inserts new row + triggers welcome email', async () => {
    const supabase = buildMockSupabase({
      existingRow: null,
      cohortUsedCount: 0,
      insertReturn: {
        id: 'wait-1',
        created_at: '2026-04-27T12:00:00Z',
        founders_cohort_eligible: true,
        founders_cohort_position: 1,
        priority_score: 30,
      },
    });

    const { joinWaitlist } = await import('@/features/dmx-studio/lib/waitlist');
    const result = await joinWaitlist(supabase, {
      email: 'alice@example.com',
      name: 'Alice',
      role: 'asesor',
      countryCode: 'MX',
    });

    expect(result.id).toBe('wait-1');
    expect(result.alreadyExisted).toBe(false);
    expect(result.foundersCohortEligible).toBe(true);
    expect(result.foundersCohortPosition).toBe(1);
    expect(sendWelcomeEmailMock).toHaveBeenCalledTimes(1);
    expect(sendWelcomeEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alice@example.com',
        foundersCohortEligible: true,
        position: 1,
      }),
    );
  });

  it('duplicate email returns alreadyExisted=true and skips email', async () => {
    const supabase = buildMockSupabase({
      existingRow: {
        id: 'wait-existing',
        created_at: '2026-04-26T12:00:00Z',
        founders_cohort_eligible: false,
        founders_cohort_position: null,
        priority_score: 5,
      },
      cohortUsedCount: 0,
    });

    const { joinWaitlist } = await import('@/features/dmx-studio/lib/waitlist');
    const result = await joinWaitlist(supabase, {
      email: 'alice@example.com',
      role: 'asesor',
      countryCode: 'MX',
    });

    expect(result.id).toBe('wait-existing');
    expect(result.alreadyExisted).toBe(true);
    expect(sendWelcomeEmailMock).not.toHaveBeenCalled();
  });

  it('eligible founders cohort assigns next position when under limit', async () => {
    const supabase = buildMockSupabase({
      existingRow: null,
      cohortUsedCount: 12,
      insertReturn: {
        id: 'wait-13',
        created_at: '2026-04-27T13:00:00Z',
        founders_cohort_eligible: true,
        founders_cohort_position: 13,
        priority_score: 8,
      },
    });

    const { joinWaitlist } = await import('@/features/dmx-studio/lib/waitlist');
    const result = await joinWaitlist(supabase, {
      email: 'bob@example.com',
      role: 'broker',
      countryCode: 'MX',
    });

    expect(result.foundersCohortEligible).toBe(true);
    expect(result.foundersCohortPosition).toBe(13);
    expect(result.alreadyExisted).toBe(false);
  });
});
