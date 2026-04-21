import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Calculator, CalculatorInput, CalculatorOutput } from '../../base';
import {
  calculateAllIndicesForCDMXColonias,
  calculateAllIndicesForScope,
  calculateIndexForScope,
  INDEX_CALCULATORS,
  indexCodesForScope,
} from '../orchestrator';

const PERIOD = '2026-04-01';
const COUNTRY = 'MX';

// --- mock calculator factory ---
function makeCalc(scoreId: string, overrides: Partial<CalculatorOutput> = {}): Calculator {
  const run = vi.fn(
    async (_input: CalculatorInput): Promise<CalculatorOutput> => ({
      score_value: 75,
      score_label: `ie.index.${scoreId.toLowerCase()}.bueno`,
      components: { _meta: { circuit_breaker_triggered: false, shadow: false } },
      inputs_used: { scoreId },
      confidence: 'high',
      citations: [],
      provenance: {
        sources: [{ name: 'mock', count: 1 }],
        computed_at: new Date().toISOString(),
        calculator_version: '1.0.0',
      },
      ...overrides,
    }),
  );
  return {
    scoreId,
    version: '1.0.0',
    tier: 2,
    run,
  };
}

function makeFailingCalc(scoreId: string): Calculator {
  return {
    scoreId,
    version: '1.0.0',
    tier: 2,
    run: vi.fn(async () => {
      throw new Error(`fail_${scoreId}`);
    }),
  };
}

// --- mock supabase ---
interface MockSupabaseHandlers {
  readonly onUpsert?: (row: unknown) => void;
  readonly onUpdate?: (row: unknown) => void;
  readonly rankingRows?: readonly { id: string; value: number }[];
}

function buildQueryThenable<T>(
  data: T[],
  handlers?: MockSupabaseHandlers,
  count?: number,
): Record<string, unknown> {
  const result = { data, error: null, count: count ?? data.length };
  const qb: Record<string, unknown> = {};
  const self = () => qb;
  qb.select = self;
  qb.eq = self;
  qb.in = self;
  qb.lt = self;
  qb.gte = self;
  qb.lte = self;
  qb.neq = self;
  qb.gt = self;
  qb.order = self;
  qb.limit = self;
  qb.insert = (row: unknown) => {
    handlers?.onUpsert?.(row);
    return Promise.resolve({ data: null, error: null });
  };
  qb.upsert = (row: unknown) => {
    handlers?.onUpsert?.(row);
    return Promise.resolve({ data: null, error: null });
  };
  qb.update = (row: unknown) => {
    handlers?.onUpdate?.(row);
    return qb;
  };
  // biome-ignore lint/suspicious/noThenProperty: supabase-js query builder es thenable por diseño.
  qb.then = (onFulfilled: (v: { data: T[]; error: null; count: number }) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  qb.catch = (onRejected: (r: unknown) => unknown) => Promise.resolve(result).catch(onRejected);
  return qb;
}

function mockSupabase(handlers?: MockSupabaseHandlers): SupabaseClient {
  const upsertSpy = vi.fn();
  const updateSpy = vi.fn();
  const rankingRows = handlers?.rankingRows ?? [];
  const from = vi.fn((table: string) => {
    if (table === 'dmx_indices') {
      return buildQueryThenable(
        rankingRows as unknown as Array<Record<string, unknown>>,
        {
          onUpsert: (r) => {
            upsertSpy(r);
            handlers?.onUpsert?.(r);
          },
          onUpdate: (r) => {
            updateSpy(r);
            handlers?.onUpdate?.(r);
          },
        },
        rankingRows.length,
      );
    }
    if (table === 'zona_snapshots') {
      return buildQueryThenable([{ zone_id: 'z1' }, { zone_id: 'z2' }, { zone_id: 'z3' }]);
    }
    return buildQueryThenable([]);
  });
  const sb = { from, __upsertSpy: upsertSpy, __updateSpy: updateSpy } as unknown as SupabaseClient;
  return sb;
}

function getUpsertSpy(sb: SupabaseClient) {
  return (sb as unknown as { __upsertSpy: ReturnType<typeof vi.fn> }).__upsertSpy;
}

function getUpdateSpy(sb: SupabaseClient) {
  return (sb as unknown as { __updateSpy: ReturnType<typeof vi.fn> }).__updateSpy;
}

// Build un registry injectable con 15 mock calcs (14 zone + 1 project INV).
const ZONE_CODES = [
  'DMX-IPV',
  'DMX-IAB',
  'DMX-IDS',
  'DMX-IRE',
  'DMX-ICO',
  'DMX-MOM',
  'DMX-LIV',
  'DMX-FAM',
  'DMX-YNG',
  'DMX-GRN',
  'DMX-STR',
  'DMX-DEV',
  'DMX-GNT',
  'DMX-STA',
];
const PROJECT_CODES = ['DMX-INV'];

function makeMockRegistry(failCodes: readonly string[] = []): Readonly<Record<string, Calculator>> {
  const entries: Record<string, Calculator> = {};
  for (const code of [...ZONE_CODES, ...PROJECT_CODES]) {
    entries[code] = failCodes.includes(code) ? makeFailingCalc(code) : makeCalc(code);
  }
  return entries;
}

describe('orchestrator — registry + scope support', () => {
  it('INDEX_CALCULATORS exporta los 15 DMX codes', () => {
    const keys = Object.keys(INDEX_CALCULATORS).sort();
    expect(keys).toHaveLength(15);
    expect(keys).toContain('DMX-IPV');
    expect(keys).toContain('DMX-INV');
    expect(keys).toContain('DMX-STA');
  });

  it('indexCodesForScope separa zone (14) y project (1)', () => {
    expect(indexCodesForScope('zone')).toHaveLength(14);
    expect(indexCodesForScope('project')).toHaveLength(1);
    expect(indexCodesForScope('project')).toContain('DMX-INV');
    expect(indexCodesForScope('zone')).not.toContain('DMX-INV');
  });
});

describe('calculateIndexForScope', () => {
  it('happy path: calc retorna value, UPSERT invocado con onConflict correcto', async () => {
    const supabase = mockSupabase();
    const registry = makeMockRegistry();
    const res = await calculateIndexForScope({
      indexCode: 'DMX-IPV',
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: registry,
    });
    expect(res.ok).toBe(true);
    expect(res.value).toBe(75);
    expect(res.confidence).toBe('high');
    const upsertSpy = getUpsertSpy(supabase);
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const row = upsertSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.index_code).toBe('IPV'); // stripped DMX- prefix (table CHECK)
    expect(row.scope_type).toBe('colonia');
    expect(row.scope_id).toBe('zone-1');
    expect(row.country_code).toBe('MX');
  });

  it('unknown indexCode → { ok: false, error: unknown_index }', async () => {
    const supabase = mockSupabase();
    const res = await calculateIndexForScope({
      indexCode: 'DMX-DOESNOTEXIST',
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: makeMockRegistry(),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('unknown_index');
    expect(getUpsertSpy(supabase)).not.toHaveBeenCalled();
  });

  it('scope mismatch: INV pedido como zone → error descriptivo', async () => {
    const supabase = mockSupabase();
    const res = await calculateIndexForScope({
      indexCode: 'DMX-INV',
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: makeMockRegistry(),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('scope=zone');
  });

  it('shadow mode: NO persiste en dmx_indices', async () => {
    const supabase = mockSupabase();
    const res = await calculateIndexForScope({
      indexCode: 'DMX-IPV',
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: makeMockRegistry(),
      options: { shadowMode: true },
    });
    expect(res.ok).toBe(true);
    expect(getUpsertSpy(supabase)).not.toHaveBeenCalled();
  });

  it('audit_log=true → params.audit_log propagado al calc input', async () => {
    const supabase = mockSupabase();
    const registry = makeMockRegistry();
    await calculateIndexForScope({
      indexCode: 'DMX-IPV',
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: registry,
      options: { auditLog: true },
    });
    const runMock = registry['DMX-IPV']?.run as ReturnType<typeof vi.fn>;
    expect(runMock).toHaveBeenCalledTimes(1);
    const calcInput = runMock.mock.calls[0]?.[0] as CalculatorInput;
    expect(calcInput.params?.audit_log).toBe(true);
    expect(calcInput.params?.shadow_mode).toBe(false);
  });

  it('circuit breaker flag: meta triggered=true propaga a result', async () => {
    const supabase = mockSupabase();
    const calc = makeCalc('DMX-IPV', {
      components: {
        _meta: { circuit_breaker_triggered: true, shadow: false },
      },
    });
    const registry = { ...makeMockRegistry(), 'DMX-IPV': calc };
    const res = await calculateIndexForScope({
      indexCode: 'DMX-IPV',
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: registry,
    });
    expect(res.ok).toBe(true);
    expect(res.circuit_breaker_triggered).toBe(true);
    const upsertSpy = getUpsertSpy(supabase);
    const row = upsertSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.circuit_breaker_triggered).toBe(true);
  });

  it('calc throws → ok: false, error propagated, no upsert', async () => {
    const supabase = mockSupabase();
    const registry = makeMockRegistry(['DMX-IPV']);
    const res = await calculateIndexForScope({
      indexCode: 'DMX-IPV',
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: registry,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('fail_DMX-IPV');
    expect(getUpsertSpy(supabase)).not.toHaveBeenCalled();
  });
});

describe('calculateAllIndicesForScope', () => {
  it('batch zone: 14 ok → succeeded=14, failed=0, results.length=14', async () => {
    const supabase = mockSupabase();
    const registry = makeMockRegistry();
    const br = await calculateAllIndicesForScope({
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: registry,
    });
    expect(br.results).toHaveLength(14);
    expect(br.succeeded).toBe(14);
    expect(br.failed).toBe(0);
    expect(getUpsertSpy(supabase)).toHaveBeenCalledTimes(14);
  });

  it('batch: 11 ok + 3 fail → succeeded=11, failed=3, results.length=14', async () => {
    const supabase = mockSupabase();
    const registry = makeMockRegistry(['DMX-IPV', 'DMX-MOM', 'DMX-FAM']);
    const br = await calculateAllIndicesForScope({
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: registry,
    });
    expect(br.results).toHaveLength(14);
    expect(br.succeeded).toBe(11);
    expect(br.failed).toBe(3);
    const failed = br.results.filter((r) => !r.ok).map((r) => r.indexCode);
    expect(failed).toEqual(expect.arrayContaining(['DMX-IPV', 'DMX-MOM', 'DMX-FAM']));
  });

  it('shadow mode: calcs corren pero NO upsert', async () => {
    const supabase = mockSupabase();
    const registry = makeMockRegistry();
    const br = await calculateAllIndicesForScope({
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: registry,
      options: { shadowMode: true },
    });
    expect(br.succeeded).toBe(14);
    expect(getUpsertSpy(supabase)).not.toHaveBeenCalled();
  });

  it('audit log: flag propagado a cada calc run input', async () => {
    const supabase = mockSupabase();
    const registry = makeMockRegistry();
    await calculateAllIndicesForScope({
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: registry,
      options: { auditLog: true },
    });
    for (const code of ZONE_CODES) {
      const runMock = registry[code]?.run as ReturnType<typeof vi.fn>;
      expect(runMock).toHaveBeenCalled();
      const calcInput = runMock.mock.calls[0]?.[0] as CalculatorInput;
      expect(calcInput.params?.audit_log).toBe(true);
    }
  });

  it('batch project scope: solo corre INV (1/1)', async () => {
    const supabase = mockSupabase();
    const registry = makeMockRegistry();
    const br = await calculateAllIndicesForScope({
      scopeType: 'project',
      scopeId: 'project-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: registry,
    });
    expect(br.results).toHaveLength(1);
    expect(br.succeeded).toBe(1);
    expect(br.results[0]?.indexCode).toBe('DMX-INV');
    // INV no persiste en dmx_indices (scope=project no cabe en CHECK).
    expect(getUpsertSpy(supabase)).not.toHaveBeenCalled();
  });
});

describe('calculateAllIndicesForCDMXColonias', () => {
  it('3 zones × 14 indices = 42 runs; post-persist UPDATE ranking × 14 indices', async () => {
    const rankingRows = [
      { id: 'row-a', value: 90 },
      { id: 'row-b', value: 70 },
      { id: 'row-c', value: 50 },
    ];
    const supabase = mockSupabase({ rankingRows });
    const registry = makeMockRegistry();
    const out = await calculateAllIndicesForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      calculators: registry,
      zoneIds: ['z1', 'z2', 'z3'],
      chunkSize: 10,
    });
    expect(out.zones_processed).toBe(3);
    expect(out.indices_computed).toBe(3 * 14);
    expect(out.failures).toBe(0);
    // Upsert: 3 zones × 14 indices = 42.
    expect(getUpsertSpy(supabase)).toHaveBeenCalledTimes(42);
    // Update: 14 indices × 3 rows each = 42 invocaciones update.
    expect(getUpdateSpy(supabase)).toHaveBeenCalledTimes(14 * 3);
  });

  it('shadow mode: no persiste + no corre second pass ranking', async () => {
    const supabase = mockSupabase({
      rankingRows: [{ id: 'r1', value: 80 }],
    });
    const registry = makeMockRegistry();
    const out = await calculateAllIndicesForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      calculators: registry,
      zoneIds: ['z1'],
      options: { shadowMode: true },
    });
    expect(out.zones_processed).toBe(1);
    expect(out.indices_computed).toBe(14);
    expect(getUpsertSpy(supabase)).not.toHaveBeenCalled();
    expect(getUpdateSpy(supabase)).not.toHaveBeenCalled();
  });

  it('zero zones (zoneIds=[] + discover vacío) → summary con 0s', async () => {
    const supabase = mockSupabase();
    const out = await calculateAllIndicesForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      calculators: makeMockRegistry(),
      zoneIds: [],
    });
    expect(out.zones_processed).toBe(0);
    expect(out.indices_computed).toBe(0);
    expect(out.failures).toBe(0);
  });
});

describe('BatchResult types are readonly', () => {
  it('results es readonly array (compile-time check smoke)', async () => {
    const supabase = mockSupabase();
    const br = await calculateAllIndicesForScope({
      scopeType: 'zone',
      scopeId: 'zone-1',
      periodDate: PERIOD,
      countryCode: COUNTRY,
      supabase,
      calculators: makeMockRegistry(),
    });
    // Smoke runtime: results es array, cada entry tiene shape SingleIndexResult.
    expect(Array.isArray(br.results)).toBe(true);
    for (const r of br.results) {
      expect(typeof r.indexCode).toBe('string');
      expect(typeof r.ok).toBe('boolean');
      expect(typeof r.duration_ms).toBe('number');
    }
  });
});
