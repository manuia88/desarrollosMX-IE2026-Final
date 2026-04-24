import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../shared/types/database.ts';
import {
  buildE2EReport,
  classifyLayer,
  DEFAULT_ZONE_SCOPE_ID,
  type LayerResult,
  parseArgs,
  queryDemographicsLayer,
  queryDmxLayer,
  queryScoresLayer,
  queryWikiLayer,
  type ZoneInfo,
} from '../e2e-fase-07.5-integration.ts';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

// ========================================================================
// Helpers — zone + layer factories
// ========================================================================

function makeZone(): ZoneInfo {
  return {
    id: 'zone-uuid-1',
    scope_id: 'MX-CDMX-CU-roma-norte',
    scope_type: 'colonia',
    name_es: 'Roma Norte',
    country_code: 'MX',
  };
}

function makeOkLayer(name: string, count = 1): LayerResult {
  return {
    layer: name,
    status: 'ok',
    count,
    sample: { stub: true },
  };
}

function makeEmptyLayer(name: string): LayerResult {
  return {
    layer: name,
    status: 'empty',
    count: 0,
    sample: null,
    warning: `${name} returned 0 rows`,
  };
}

function makeErrorLayer(name: string, msg = 'boom'): LayerResult {
  return {
    layer: name,
    status: 'error',
    count: 0,
    sample: null,
    warning: msg,
  };
}

// ========================================================================
// Minimal Supabase query-builder mock
// ========================================================================

type MockQueryResponse = {
  data: unknown;
  error: { message: string } | null;
};

type QueryBuilder = {
  select: (..._args: unknown[]) => QueryBuilder;
  eq: (..._args: unknown[]) => QueryBuilder;
  gte: (..._args: unknown[]) => QueryBuilder;
  or: (..._args: unknown[]) => QueryBuilder;
  order: (..._args: unknown[]) => QueryBuilder;
  limit: (..._args: unknown[]) => QueryBuilder;
  maybeSingle: () => Promise<MockQueryResponse>;
  single: () => Promise<MockQueryResponse>;
  then: Promise<MockQueryResponse>['then'];
};

function buildQueryBuilder(response: MockQueryResponse): QueryBuilder {
  const promise = Promise.resolve(response);
  const builder: QueryBuilder = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => promise,
    single: () => promise,
    // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are PromiseLike — mock must mirror that for `await supabase.from(...).select(...).eq(...)` to resolve without calling .maybeSingle()/.single().
    then: promise.then.bind(promise),
  };
  return builder;
}

type TableResponses = Record<string, MockQueryResponse>;

function makeSupabaseMock(responses: TableResponses): SupabaseClient<Database> {
  const client = {
    from: (tableName: string): QueryBuilder => {
      const resp = responses[tableName] ?? { data: null, error: null };
      return buildQueryBuilder(resp);
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

// ========================================================================
// Tests — classifyLayer
// ========================================================================

describe('classifyLayer', () => {
  it('count > 0, no error → ok', () => {
    expect(classifyLayer({ count: 3 })).toBe('ok');
  });

  it('count === 0, no error → empty', () => {
    expect(classifyLayer({ count: 0 })).toBe('empty');
  });

  it('error set → error (even if count > 0)', () => {
    expect(classifyLayer({ count: 5, error: 'db down' })).toBe('error');
  });

  it('error empty string treated as no error', () => {
    expect(classifyLayer({ count: 1, error: '' })).toBe('ok');
  });

  it('error null treated as no error', () => {
    expect(classifyLayer({ count: 2, error: null })).toBe('ok');
  });
});

// ========================================================================
// Tests — buildE2EReport
// ========================================================================

describe('buildE2EReport', () => {
  it('todas las 10 capas ok → summary.ok === 10, empty 0, error 0', () => {
    const layers: LayerResult[] = [
      'zone_scores',
      'dmx_indices',
      'zone_pulse_scores',
      'pulse_forecasts',
      'colonia_dna_vectors',
      'climate',
      'constellations',
      'ghost_zones_ranking',
      'colonia_wiki_entries',
      'demographics',
    ].map((n) => makeOkLayer(n, 3));
    const report = buildE2EReport({
      zone: makeZone(),
      runId: 'run-1',
      layers,
      timestamp: '2026-04-24T00:00:00.000Z',
    });
    expect(report.summary.ok).toBe(10);
    expect(report.summary.empty).toBe(0);
    expect(report.summary.error).toBe(0);
    expect(report.layers).toHaveLength(10);
    expect(report.runId).toBe('run-1');
    expect(report.timestamp).toBe('2026-04-24T00:00:00.000Z');
    expect(report.zone.scope_id).toBe('MX-CDMX-CU-roma-norte');
  });

  it('1 capa empty → summary.empty === 1, resto ok', () => {
    const layers: LayerResult[] = [
      makeOkLayer('zone_scores'),
      makeOkLayer('dmx_indices'),
      makeEmptyLayer('colonia_wiki_entries'),
    ];
    const report = buildE2EReport({
      zone: makeZone(),
      runId: 'run-2',
      layers,
    });
    expect(report.summary.ok).toBe(2);
    expect(report.summary.empty).toBe(1);
    expect(report.summary.error).toBe(0);
  });

  it('2 capas error → summary.error === 2', () => {
    const layers: LayerResult[] = [
      makeOkLayer('zone_scores'),
      makeErrorLayer('dmx_indices', 'network'),
      makeErrorLayer('colonia_wiki_entries', 'timeout'),
    ];
    const report = buildE2EReport({
      zone: makeZone(),
      runId: 'run-3',
      layers,
    });
    expect(report.summary.error).toBe(2);
    expect(report.summary.ok).toBe(1);
    expect(report.summary.empty).toBe(0);
  });

  it('incluye zone + timestamp + runId + layers array', () => {
    const report = buildE2EReport({
      zone: makeZone(),
      runId: 'run-4',
      layers: [makeOkLayer('zone_scores')],
    });
    expect(report.zone).toEqual(makeZone());
    expect(typeof report.timestamp).toBe('string');
    expect(Date.parse(report.timestamp)).toBeGreaterThan(0);
    expect(Array.isArray(report.layers)).toBe(true);
    expect(report.runId).toBe('run-4');
  });

  it('timestamp default uses ISO string when not provided', () => {
    const report = buildE2EReport({
      zone: makeZone(),
      runId: 'run-5',
      layers: [],
    });
    expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('empty layers → summary all zero', () => {
    const report = buildE2EReport({
      zone: makeZone(),
      runId: 'run-6',
      layers: [],
    });
    expect(report.summary).toEqual({ ok: 0, empty: 0, error: 0 });
  });
});

// ========================================================================
// Tests — CLI parser
// ========================================================================

describe('parseArgs', () => {
  it('--zone=XYZ parses correctly', () => {
    const args = parseArgs(['node', 'script.ts', '--zone=MX-CDMX-CU-condesa']);
    expect(args.zoneScopeId).toBe('MX-CDMX-CU-condesa');
    expect(args.dryRun).toBe(false);
  });

  it('--dry-run parses correctly', () => {
    const args = parseArgs(['node', 'script.ts', '--dry-run']);
    expect(args.dryRun).toBe(true);
    expect(args.zoneScopeId).toBe(DEFAULT_ZONE_SCOPE_ID);
  });

  it('--zone + --dry-run combined', () => {
    const args = parseArgs(['node', 'script.ts', '--zone=foo', '--dry-run']);
    expect(args.zoneScopeId).toBe('foo');
    expect(args.dryRun).toBe(true);
  });

  it('no args → default zone, no dry-run', () => {
    const args = parseArgs(['node', 'script.ts']);
    expect(args.zoneScopeId).toBe(DEFAULT_ZONE_SCOPE_ID);
    expect(args.dryRun).toBe(false);
  });

  it('--zone= empty throws', () => {
    expect(() => parseArgs(['node', 'script.ts', '--zone='])).toThrow(/--zone inválido/);
  });

  it('ignores unknown flags silently', () => {
    const args = parseArgs(['node', 'script.ts', '--unknown=x']);
    expect(args.zoneScopeId).toBe(DEFAULT_ZONE_SCOPE_ID);
    expect(args.dryRun).toBe(false);
  });
});

// ========================================================================
// Tests — integration with Supabase mock
// ========================================================================

describe('integration mock — per-layer queries', () => {
  it('queryScoresLayer with data returns ok with distinct levels', async () => {
    const supabase = makeSupabaseMock({
      zone_scores: {
        data: [
          {
            id: '1',
            score_type: 'F01',
            score_value: 72,
            level: 0,
            tier: 1,
            period_date: '2026-04',
          },
          {
            id: '2',
            score_type: 'F02',
            score_value: 80,
            level: 1,
            tier: 2,
            period_date: '2026-04',
          },
        ],
        error: null,
      },
    });
    const result = await queryScoresLayer(supabase, 'zone-1');
    expect(result.status).toBe('ok');
    expect(result.count).toBe(2);
    expect(result.sample?.levels_distinct).toEqual([0, 1]);
  });

  it('queryScoresLayer with error returns error layer', async () => {
    const supabase = makeSupabaseMock({
      zone_scores: { data: null, error: { message: 'db fail' } },
    });
    const result = await queryScoresLayer(supabase, 'zone-1');
    expect(result.status).toBe('error');
    expect(result.warning).toBe('db fail');
  });

  it('queryDmxLayer with 0 rows returns empty with warning', async () => {
    const supabase = makeSupabaseMock({
      dmx_indices: { data: [], error: null },
    });
    const result = await queryDmxLayer(supabase, 'scope-1');
    expect(result.status).toBe('empty');
    expect(result.warning).toContain('0 rows');
  });

  it('queryWikiLayer with row returns ok + section_keys extracted', async () => {
    const supabase = makeSupabaseMock({
      colonia_wiki_entries: {
        data: {
          id: 'w1',
          version: 1,
          sections: { overview: 'txt', demographics: 'txt', meta: { facts_cited: 10 } },
          edited_at: '2026-04-24T00:00:00Z',
          published: true,
        },
        error: null,
      },
    });
    const result = await queryWikiLayer(supabase, 'zone-1');
    expect(result.status).toBe('ok');
    expect(result.count).toBe(1);
    expect(result.sample?.section_keys).toEqual(['overview', 'demographics', 'meta']);
    expect(result.sample?.published).toBe(true);
  });

  it('queryWikiLayer with null data returns empty', async () => {
    const supabase = makeSupabaseMock({
      colonia_wiki_entries: { data: null, error: null },
    });
    const result = await queryWikiLayer(supabase, 'zone-1');
    expect(result.status).toBe('empty');
    expect(result.count).toBe(0);
  });

  it('queryDemographicsLayer with only census (no income) returns ok count=1', async () => {
    const supabase = makeSupabaseMock({
      inegi_census_zone_stats: {
        data: { zone_id: 'z1', dominant_profession: 'creativos', snapshot_date: '2026-01-01' },
        error: null,
      },
      enigh_zone_income: { data: null, error: null },
    });
    const result = await queryDemographicsLayer(supabase, 'z1');
    expect(result.status).toBe('ok');
    expect(result.count).toBe(1);
    expect(result.sample?.census_present).toBe(true);
    expect(result.sample?.income_present).toBe(false);
  });

  it('queryDemographicsLayer with both null → empty', async () => {
    const supabase = makeSupabaseMock({
      inegi_census_zone_stats: { data: null, error: null },
      enigh_zone_income: { data: null, error: null },
    });
    const result = await queryDemographicsLayer(supabase, 'z1');
    expect(result.status).toBe('empty');
    expect(result.count).toBe(0);
  });
});
