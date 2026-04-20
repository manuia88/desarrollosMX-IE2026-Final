import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearTierRequirementsCache, tierGate } from '../tier-gate';

function mockSupabase(
  rows: Array<{
    tier: number;
    min_projects: number;
    min_closed_ops: number;
    min_months_data: number;
    description: string;
  }> | null,
): SupabaseClient {
  const from = vi.fn(() => ({
    select: vi.fn(async () => ({ data: rows, error: rows ? null : new Error('no table') })),
  }));
  return { from } as unknown as SupabaseClient;
}

afterEach(() => {
  clearTierRequirementsCache();
});

describe('tierGate', () => {
  it('tier 1 pasa siempre sin consultar BD', async () => {
    const supabase = mockSupabase(null);
    const result = await tierGate(1, 'MX', supabase);
    expect(result).toEqual({ gated: false });
  });

  it('country != MX gated con country_unsupported', async () => {
    const supabase = mockSupabase(null);
    const result = await tierGate(2, 'CO', supabase);
    expect(result.gated).toBe(true);
    expect(result.reason).toBe('country_unsupported');
  });

  it('tier 2 MX usa threshold desde tier_requirements BD', async () => {
    const supabase = mockSupabase([
      { tier: 1, min_projects: 0, min_closed_ops: 0, min_months_data: 0, description: 'Día 1' },
      {
        tier: 2,
        min_projects: 20,
        min_closed_ops: 0,
        min_months_data: 1,
        description: '20 proyectos en zona',
      },
      {
        tier: 3,
        min_projects: 50,
        min_closed_ops: 0,
        min_months_data: 6,
        description: '50 proyectos 6 meses',
      },
      {
        tier: 4,
        min_projects: 100,
        min_closed_ops: 100,
        min_months_data: 12,
        description: '100 ventas 12m',
      },
    ]);
    const result = await tierGate(2, 'MX', supabase);
    expect(result.gated).toBe(true);
    expect(result.reason).toBe('tier_insufficient');
    expect(result.threshold).toBe(20);
    expect(result.requirement).toContain('20 proyectos');
  });

  it('cache evita segunda query para mismo country', async () => {
    const selectMock = vi.fn(async () => ({
      data: [
        {
          tier: 2,
          min_projects: 15,
          min_closed_ops: 0,
          min_months_data: 1,
          description: '15 proyectos',
        },
      ],
      error: null,
    }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const supabase = { from: fromMock } as unknown as SupabaseClient;
    await tierGate(2, 'MX', supabase);
    await tierGate(3, 'MX', supabase);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('fallback si BD error', async () => {
    const from = vi.fn(() => ({
      select: vi.fn(async () => ({ data: null, error: new Error('no table') })),
    }));
    const supabase = { from } as unknown as SupabaseClient;
    const result = await tierGate(2, 'MX', supabase);
    expect(result.gated).toBe(true);
    expect(result.threshold).toBe(10);
  });
});
