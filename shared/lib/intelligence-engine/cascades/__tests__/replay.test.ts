import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { executeReplay, ReplayInputSchema } from '../replay';

function mockSupabase(zoneCount: number) {
  const logInsertSpy = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { id: 'log-uuid-1' }, error: null })),
    })),
  }));

  const from = vi.fn((table: string) => {
    if (table === 'zones') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ count: zoneCount, error: null })),
        })),
      };
    }
    if (table === 'cascade_replay_log') {
      return { insert: logInsertSpy };
    }
    return { select: vi.fn() };
  });
  return { client: { from } as unknown as SupabaseClient, logInsertSpy };
}

describe('ReplayInputSchema', () => {
  it('acepta input válido', () => {
    const r = ReplayInputSchema.safeParse({
      cascade_event: 'macro_updated',
      target_filter: { country: 'MX' },
      period_from: '2026-03-01',
      period_to: '2026-04-01',
      dry_run: true,
    });
    expect(r.success).toBe(true);
  });

  it('rechaza fecha mal formada', () => {
    const r = ReplayInputSchema.safeParse({
      cascade_event: 'macro_updated',
      period_from: '03/01/2026',
      period_to: '2026-04-01',
    });
    expect(r.success).toBe(false);
  });
});

describe('executeReplay', () => {
  it('dry_run con filter MX retorna conteo sin enqueue real', async () => {
    const { client, logInsertSpy } = mockSupabase(5);
    const result = await executeReplay(
      client,
      {
        cascade_event: 'macro_updated',
        target_filter: { country: 'MX' },
        period_from: '2026-03-01',
        period_to: '2026-04-01',
        dry_run: true,
      },
      'user-id-1',
    );
    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(true);
    expect(result.scores_affected.length).toBeGreaterThan(0);
    expect(result.jobs_enqueued).toBe(0);
    expect(logInsertSpy).toHaveBeenCalled();
  });

  it('geo_data_updated fgj retorna F01+N04+N09', async () => {
    const { client } = mockSupabase(10);
    const result = await executeReplay(
      client,
      {
        cascade_event: 'geo_data_updated',
        geo_source: 'fgj',
        target_filter: {},
        period_from: '2026-03-01',
        period_to: '2026-04-01',
        dry_run: true,
      },
      null,
    );
    expect(result.scores_affected).toEqual(['F01', 'N04', 'N09']);
  });

  it('cascade_event desconocido retorna scores vacío', async () => {
    const { client } = mockSupabase(0);
    const result = await executeReplay(
      client,
      {
        cascade_event: 'geo_data_updated',
        geo_source: 'unknown_source',
        target_filter: {},
        period_from: '2026-03-01',
        period_to: '2026-04-01',
        dry_run: true,
      },
      null,
    );
    expect(result.scores_affected).toEqual([]);
  });
});
