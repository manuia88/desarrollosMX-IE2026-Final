// FASE 14.F.12 Sprint 11+12 BIBLIA — Premium/Basic video limit checker tests (Modo A).
// Mocks supabase admin chain studio_usage_logs.select.eq.eq.eq.eq with count-only head:true.

import { describe, expect, it, vi } from 'vitest';
import {
  checkVideoLimitByCategory,
  type VideoCategory,
} from '@/features/dmx-studio/lib/usage/limit-checker';
import type { createAdminClient } from '@/shared/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

interface BuildSupabaseOptions {
  readonly count: number | null;
  readonly error?: { message: string } | null;
}

function buildSupabaseMock(opts: BuildSupabaseOptions): AdminClient {
  const eqLevel4 = vi.fn().mockResolvedValue({ count: opts.count, error: opts.error ?? null });
  const eqLevel3 = vi.fn().mockReturnValue({ eq: eqLevel4 });
  const eqLevel2 = vi.fn().mockReturnValue({ eq: eqLevel3 });
  const eqLevel1 = vi.fn().mockReturnValue({ eq: eqLevel2 });
  const select = vi.fn().mockReturnValue({ eq: eqLevel1 });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as AdminClient;
}

describe('checkVideoLimitByCategory — premium category', () => {
  it('returns ok=true with remaining quota when usage < limit', async () => {
    const supabase = buildSupabaseMock({ count: 1 });
    const result = await checkVideoLimitByCategory(supabase, 'user-uuid-1', 'founder', 'premium');
    // founder premium limit = 2
    expect(result.ok).toBe(true);
    expect(result.limit).toBe(2);
    expect(result.used).toBe(1);
    expect(result.remaining).toBe(1);
    expect(result.category).toBe<VideoCategory>('premium');
  });

  it('returns ok=false when used == limit (exactly at cap)', async () => {
    const supabase = buildSupabaseMock({ count: 5 });
    const result = await checkVideoLimitByCategory(supabase, 'user-uuid-2', 'pro', 'premium');
    // pro premium limit = 5
    expect(result.ok).toBe(false);
    expect(result.limit).toBe(5);
    expect(result.used).toBe(5);
    expect(result.remaining).toBe(0);
  });

  it('returns ok=false when used > limit (exceeded)', async () => {
    const supabase = buildSupabaseMock({ count: 25 });
    const result = await checkVideoLimitByCategory(supabase, 'user-uuid-3', 'agency', 'premium');
    // agency premium limit = 20
    expect(result.ok).toBe(false);
    expect(result.limit).toBe(20);
    expect(result.used).toBe(25);
    expect(result.remaining).toBe(0); // clamped to 0
  });

  it('returns ok=true with full remaining when zero usage', async () => {
    const supabase = buildSupabaseMock({ count: 0 });
    const result = await checkVideoLimitByCategory(supabase, 'user-uuid-4', 'agency', 'premium');
    expect(result.ok).toBe(true);
    expect(result.used).toBe(0);
    expect(result.remaining).toBe(20);
  });
});

describe('checkVideoLimitByCategory — basic category', () => {
  it('basic and premium categories tracked separately per plan', async () => {
    // basic founder limit = 3, used = 2, remaining = 1
    const supabase = buildSupabaseMock({ count: 2 });
    const result = await checkVideoLimitByCategory(supabase, 'user-uuid-5', 'founder', 'basic');
    expect(result.ok).toBe(true);
    expect(result.limit).toBe(3);
    expect(result.used).toBe(2);
    expect(result.remaining).toBe(1);
    expect(result.category).toBe<VideoCategory>('basic');
  });

  it('handles null count from supabase as zero usage', async () => {
    const supabase = buildSupabaseMock({ count: null });
    const result = await checkVideoLimitByCategory(supabase, 'user-uuid-6', 'pro', 'basic');
    // pro basic limit = 10, count null → used 0
    expect(result.used).toBe(0);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(10);
  });
});

describe('checkVideoLimitByCategory — error handling', () => {
  it('throws when supabase query returns error', async () => {
    const supabase = buildSupabaseMock({
      count: null,
      error: { message: 'rls_violation' },
    });
    await expect(
      checkVideoLimitByCategory(supabase, 'user-uuid-err', 'founder', 'premium'),
    ).rejects.toThrow(/rls_violation/);
  });
});
