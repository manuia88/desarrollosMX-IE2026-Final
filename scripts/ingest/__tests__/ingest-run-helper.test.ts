import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../shared/types/database.ts';
import {
  createIngestRun,
  finalizeIngestRun,
  upsertWatermark,
  withIngestRun,
} from '../lib/ingest-run-helper.ts';

type RunRow = { id: string };

type InsertResult<T> = { data: T | null; error: { message: string } | null };

function makeInsertBuilder<T>(result: InsertResult<T>) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  return { insert, select, single };
}

function makeUpdateBuilder(error: { message: string } | null) {
  const eq = vi.fn().mockResolvedValue({ error });
  const update = vi.fn(() => ({ eq }));
  return { update, eq };
}

function makeUpsertBuilder(error: { message: string } | null) {
  const upsert = vi.fn().mockResolvedValue({ error });
  return { upsert };
}

type FromResult = {
  insert?: ReturnType<typeof makeInsertBuilder>['insert'];
  update?: ReturnType<typeof makeUpdateBuilder>['update'];
  upsert?: ReturnType<typeof makeUpsertBuilder>['upsert'];
};

function makeSupabaseMock(fromImpl: (table: string) => FromResult): SupabaseClient<Database> {
  const from = vi.fn(fromImpl);
  return { from } as unknown as SupabaseClient<Database>;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('ingest-run-helper — createIngestRun', () => {
  it('inserta row running y devuelve runId', async () => {
    const ib = makeInsertBuilder<RunRow>({ data: { id: 'run-123' }, error: null });
    const supabase = makeSupabaseMock(() => ({ insert: ib.insert }));

    const runId = await createIngestRun(supabase, {
      source: 'inegi_mgn',
      countryCode: 'MX',
      triggeredBy: 'cli:test',
      meta: { foo: 'bar' },
    });

    expect(runId).toBe('run-123');
    expect(ib.insert).toHaveBeenCalledWith({
      source: 'inegi_mgn',
      country_code: 'MX',
      status: 'running',
      triggered_by: 'cli:test',
      meta: { foo: 'bar' },
    });
  });

  it('throws cuando el insert devuelve error', async () => {
    const ib = makeInsertBuilder<RunRow>({ data: null, error: { message: 'boom' } });
    const supabase = makeSupabaseMock(() => ({ insert: ib.insert }));

    await expect(
      createIngestRun(supabase, { source: 'banxico', countryCode: 'MX', triggeredBy: 'cli' }),
    ).rejects.toThrow(/no se pudo crear ingest_runs/);
  });

  it('throws cuando data es null sin error (defensive)', async () => {
    const ib = makeInsertBuilder<RunRow>({ data: null, error: null });
    const supabase = makeSupabaseMock(() => ({ insert: ib.insert }));

    await expect(
      createIngestRun(supabase, { source: 'banxico', countryCode: 'MX', triggeredBy: 'cli' }),
    ).rejects.toThrow(/no se pudo crear ingest_runs/);
  });
});

describe('ingest-run-helper — finalizeIngestRun', () => {
  it('actualiza status=success con counts + duration', async () => {
    const ub = makeUpdateBuilder(null);
    const supabase = makeSupabaseMock(() => ({ update: ub.update }));
    const startedAtMs = Date.now() - 1500;

    await finalizeIngestRun(supabase, {
      runId: 'run-abc',
      status: 'success',
      counts: { inserted: 10, updated: 5, skipped: 2 },
      startedAtMs,
    });

    expect(ub.update).toHaveBeenCalledOnce();
    const call = (ub.update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(call).toMatchObject({
      status: 'success',
      rows_inserted: 10,
      rows_updated: 5,
      rows_skipped: 2,
      rows_dlq: 0,
      error: null,
    });
    expect(typeof call.duration_ms).toBe('number');
    expect(ub.eq).toHaveBeenCalledWith('id', 'run-abc');
  });

  it('persiste failed con mensaje de error', async () => {
    const ub = makeUpdateBuilder(null);
    const supabase = makeSupabaseMock(() => ({ update: ub.update }));

    await finalizeIngestRun(supabase, {
      runId: 'run-x',
      status: 'failed',
      counts: { inserted: 0, updated: 0, skipped: 0 },
      error: 'timeout 504',
      startedAtMs: Date.now(),
    });

    const call = (ub.update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(call).toMatchObject({ status: 'failed', error: 'timeout 504' });
  });

  it('persiste partial con dlq count', async () => {
    const ub = makeUpdateBuilder(null);
    const supabase = makeSupabaseMock(() => ({ update: ub.update }));

    await finalizeIngestRun(supabase, {
      runId: 'run-y',
      status: 'partial',
      counts: { inserted: 3, updated: 0, skipped: 0, dlq: 2 },
      startedAtMs: Date.now(),
    });

    const call = (ub.update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(call).toMatchObject({ status: 'partial', rows_dlq: 2 });
  });

  it('no throws cuando update falla (solo log)', async () => {
    const ub = makeUpdateBuilder({ message: 'update failed' });
    const supabase = makeSupabaseMock(() => ({ update: ub.update }));

    await expect(
      finalizeIngestRun(supabase, {
        runId: 'run-z',
        status: 'success',
        counts: { inserted: 0, updated: 0, skipped: 0 },
        startedAtMs: Date.now(),
      }),
    ).resolves.toBeUndefined();
  });
});

describe('ingest-run-helper — upsertWatermark', () => {
  it('upsert idempotente por source', async () => {
    const upb = makeUpsertBuilder(null);
    const supabase = makeSupabaseMock(() => ({ upsert: upb.upsert }));

    await upsertWatermark(supabase, {
      source: 'inegi_mgn',
      countryCode: 'MX',
      runId: 'run-1',
      lastSuccessfulPeriodEnd: '2020-12-31',
      expectedPeriodicity: 'yearly',
    });

    expect(upb.upsert).toHaveBeenCalledOnce();
    const [row, opts] = upb.upsert.mock.calls[0] as unknown as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(row).toMatchObject({
      source: 'inegi_mgn',
      country_code: 'MX',
      last_successful_run_id: 'run-1',
      last_successful_period_end: '2020-12-31',
      expected_periodicity: 'yearly',
    });
    expect(opts).toMatchObject({ onConflict: 'source' });
  });

  it('acepta period_end null y periodicity null', async () => {
    const upb = makeUpsertBuilder(null);
    const supabase = makeSupabaseMock(() => ({ upsert: upb.upsert }));

    await upsertWatermark(supabase, {
      source: 'banxico',
      countryCode: 'MX',
      runId: 'run-2',
    });

    const [row] = upb.upsert.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(row).toMatchObject({
      source: 'banxico',
      last_successful_period_end: null,
      expected_periodicity: null,
    });
  });
});

describe('ingest-run-helper — withIngestRun wrapper', () => {
  function makeFullMock(opts: {
    insertResult: InsertResult<RunRow>;
    updateError?: { message: string } | null;
    upsertError?: { message: string } | null;
  }) {
    const insertBuilder = makeInsertBuilder<RunRow>(opts.insertResult);
    const updateBuilder = makeUpdateBuilder(opts.updateError ?? null);
    const upsertBuilder = makeUpsertBuilder(opts.upsertError ?? null);

    const from = vi.fn((table: string) => {
      if (table === 'ingest_runs') {
        return { insert: insertBuilder.insert, update: updateBuilder.update };
      }
      if (table === 'ingest_watermarks') {
        return { upsert: upsertBuilder.upsert };
      }
      throw new Error(`unexpected table ${table}`);
    });

    return {
      supabase: { from } as unknown as SupabaseClient<Database>,
      insertBuilder,
      updateBuilder,
      upsertBuilder,
    };
  }

  it('happy path: ejecuta fn, actualiza success, upsert watermark', async () => {
    const m = makeFullMock({ insertResult: { data: { id: 'run-happy' }, error: null } });

    const result = await withIngestRun(
      m.supabase,
      {
        source: 'inegi_mgn',
        countryCode: 'MX',
        triggeredBy: 'cli:test',
        expectedPeriodicity: 'yearly',
      },
      async ({ runId }) => {
        expect(runId).toBe('run-happy');
        return {
          counts: { inserted: 7, updated: 1, skipped: 0 },
          lastSuccessfulPeriodEnd: '2020-12-31',
        };
      },
    );

    expect(result.status).toBe('success');
    expect(result.counts).toEqual({ inserted: 7, updated: 1, skipped: 0 });
    expect(result.error).toBeNull();
    expect(result.lastSuccessfulPeriodEnd).toBe('2020-12-31');

    const updateCall = (
      m.updateBuilder.update.mock.calls[0] as unknown as [Record<string, unknown>]
    )[0];
    expect(updateCall).toMatchObject({
      status: 'success',
      rows_inserted: 7,
      rows_updated: 1,
    });
    expect(m.upsertBuilder.upsert).toHaveBeenCalledOnce();
    const [watermarkRow] = m.upsertBuilder.upsert.mock.calls[0] as unknown as [
      Record<string, unknown>,
    ];
    expect(watermarkRow).toMatchObject({
      source: 'inegi_mgn',
      last_successful_period_end: '2020-12-31',
      expected_periodicity: 'yearly',
    });
  });

  it('exception path: marca failed, NO upsert watermark', async () => {
    const m = makeFullMock({ insertResult: { data: { id: 'run-fail' }, error: null } });

    const result = await withIngestRun(
      m.supabase,
      { source: 'banxico', countryCode: 'MX', triggeredBy: 'cli:test' },
      async () => {
        throw new Error('api 504');
      },
    );

    expect(result.status).toBe('failed');
    expect(result.error).toBe('api 504');
    expect(m.upsertBuilder.upsert).not.toHaveBeenCalled();

    const updateCall = (
      m.updateBuilder.update.mock.calls[0] as unknown as [Record<string, unknown>]
    )[0];
    expect(updateCall).toMatchObject({ status: 'failed', error: 'api 504' });
  });

  it('upsertWatermarkOnSuccess=false salta el watermark en success', async () => {
    const m = makeFullMock({ insertResult: { data: { id: 'run-skip-wm' }, error: null } });

    await withIngestRun(
      m.supabase,
      {
        source: 'inegi_census',
        countryCode: 'MX',
        triggeredBy: 'cli:test',
        upsertWatermarkOnSuccess: false,
      },
      async () => ({ counts: { inserted: 0, updated: 0, skipped: 0 } }),
    );

    expect(m.upsertBuilder.upsert).not.toHaveBeenCalled();
  });
});
