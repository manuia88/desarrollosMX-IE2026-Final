import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeFlow {
  origin_scope_id: string;
  origin_scope_type: string;
  dest_scope_id: string;
  dest_scope_type: string;
  volume: number;
}

let mockFlows: readonly FakeFlow[] = [];
let mockError: { message: string } | null = null;

function createFlowQueryBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    // biome-ignore lint/suspicious/noThenProperty: mock Supabase query builder must be thenable to mimic PostgREST awaitable client
    then<T>(
      onFulfilled: (value: {
        data: readonly FakeFlow[] | null;
        error: { message: string } | null;
      }) => T,
    ) {
      return Promise.resolve(onFulfilled({ data: mockError ? null : mockFlows, error: mockError }));
    },
  };
  return builder;
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => createFlowQueryBuilder()),
  })),
}));

import {
  buildMagnetExodusRanking,
  buildStubProse,
  classifyTier,
  formatProsePrompt,
} from '../lib/magnet-exodus';

beforeEach(() => {
  mockFlows = [];
  mockError = null;
});

describe('classifyTier', () => {
  it('returns magnet for positive net', () => {
    expect(classifyTier(100)).toBe('magnet');
  });
  it('returns exodus for negative net', () => {
    expect(classifyTier(-50)).toBe('exodus');
  });
  it('returns neutral for zero', () => {
    expect(classifyTier(0)).toBe('neutral');
  });
});

describe('formatProsePrompt', () => {
  it('includes country, period and top zones', () => {
    const prompt = formatProsePrompt({
      countryCode: 'MX',
      periodDate: '2026-01-01',
      topMagnets: [
        {
          zone_id: 'roma-norte',
          zone_label: 'Roma Norte',
          scope_type: 'colonia',
          country_code: 'MX',
          period_date: '2026-01-01',
          inflow: 100,
          outflow: 20,
          net_flow: 80,
          net_flow_pct: 0.66,
          tier: 'magnet',
          rank: 1,
        },
      ],
      topExodus: [],
    });
    expect(prompt).toContain('MX');
    expect(prompt).toContain('2026-01-01');
    expect(prompt).toContain('Roma Norte');
  });
});

describe('buildStubProse', () => {
  it('returns informative string with top magnet & exodus', () => {
    const stub = buildStubProse(
      [
        {
          zone_id: 'a',
          zone_label: 'Roma Norte',
          scope_type: 'colonia',
          country_code: 'MX',
          period_date: '2026-01-01',
          inflow: 100,
          outflow: 10,
          net_flow: 90,
          net_flow_pct: 0.8,
          tier: 'magnet',
          rank: 1,
        },
      ],
      [
        {
          zone_id: 'b',
          zone_label: 'Xochimilco',
          scope_type: 'colonia',
          country_code: 'MX',
          period_date: '2026-01-01',
          inflow: 10,
          outflow: 60,
          net_flow: -50,
          net_flow_pct: -0.7,
          tier: 'exodus',
          rank: 1,
        },
      ],
    );
    expect(stub).toContain('Roma Norte');
    expect(stub).toContain('Xochimilco');
    expect(stub).toContain('90');
    expect(stub).toContain('50');
  });

  it('handles empty arrays', () => {
    const stub = buildStubProse([], []);
    expect(stub.length).toBeGreaterThan(0);
  });
});

describe('buildMagnetExodusRanking', () => {
  it('computes top_magnets and top_exodus from synthetic flows', async () => {
    // Zone A: receives 1000 from X, sends 100 to Y → net +900 (magnet)
    // Zone B: receives 50 from Y, sends 2000 to W → net -1950 (exodus)
    // Balance X / Y / W so they are small and do not dominate rankings.
    mockFlows = [
      {
        origin_scope_id: 'X',
        origin_scope_type: 'colonia',
        dest_scope_id: 'A',
        dest_scope_type: 'colonia',
        volume: 3000,
      },
      {
        origin_scope_id: 'A',
        origin_scope_type: 'colonia',
        dest_scope_id: 'Y',
        dest_scope_type: 'colonia',
        volume: 100,
      },
      // Make X large inflow side so its net is not a huge exodus.
      {
        origin_scope_id: 'Y',
        origin_scope_type: 'colonia',
        dest_scope_id: 'X',
        dest_scope_type: 'colonia',
        volume: 3100,
      },
      {
        origin_scope_id: 'Y',
        origin_scope_type: 'colonia',
        dest_scope_id: 'B',
        dest_scope_type: 'colonia',
        volume: 50,
      },
      {
        origin_scope_id: 'B',
        origin_scope_type: 'colonia',
        dest_scope_id: 'W',
        dest_scope_type: 'colonia',
        volume: 2000,
      },
      // W inflow so W net is not extreme; give W outflow as well.
      {
        origin_scope_id: 'W',
        origin_scope_type: 'colonia',
        dest_scope_id: 'Y',
        dest_scope_type: 'colonia',
        volume: 1950,
      },
    ];

    const result = await buildMagnetExodusRanking('MX', '2026-01-01', { limit: 10 });
    expect(result.country_code).toBe('MX');
    expect(result.period_date).toBe('2026-01-01');
    expect(result.top_magnets.length).toBeLessThanOrEqual(10);
    expect(result.top_exodus.length).toBeLessThanOrEqual(10);

    const topMagnet = result.top_magnets[0];
    expect(topMagnet).toBeDefined();
    expect(topMagnet?.zone_id).toBe('A');
    expect(topMagnet?.tier).toBe('magnet');
    expect(topMagnet?.net_flow).toBeGreaterThan(0);
    expect(topMagnet?.rank).toBe(1);

    const topExodus = result.top_exodus[0];
    expect(topExodus).toBeDefined();
    expect(topExodus?.zone_id).toBe('B');
    expect(topExodus?.tier).toBe('exodus');
    expect(topExodus?.net_flow).toBeLessThan(0);
    expect(topExodus?.rank).toBe(1);
  });

  it('respects limit opt', async () => {
    const flows: FakeFlow[] = [];
    for (let i = 0; i < 15; i++) {
      flows.push({
        origin_scope_id: `src-${i}`,
        origin_scope_type: 'colonia',
        dest_scope_id: `magnet-${i}`,
        dest_scope_type: 'colonia',
        volume: 100 + i,
      });
    }
    mockFlows = flows;
    const result = await buildMagnetExodusRanking('MX', '2026-01-01', { limit: 5 });
    expect(result.top_magnets.length).toBe(5);
    // rank should start at 1 and be sequential
    result.top_magnets.forEach((row, i) => {
      expect(row.rank).toBe(i + 1);
    });
  });

  it('invokes proseHook when provided', async () => {
    mockFlows = [
      {
        origin_scope_id: 'X',
        origin_scope_type: 'colonia',
        dest_scope_id: 'A',
        dest_scope_type: 'colonia',
        volume: 500,
      },
    ];
    const proseHook = vi.fn().mockResolvedValue('narrative from hook');
    const result = await buildMagnetExodusRanking('MX', '2026-01-01', {
      limit: 10,
      proseHook,
    });
    expect(proseHook).toHaveBeenCalledTimes(1);
    expect(result.prose_md).toBe('narrative from hook');
  });

  it('falls back to stub when proseHook throws', async () => {
    mockFlows = [
      {
        origin_scope_id: 'X',
        origin_scope_type: 'colonia',
        dest_scope_id: 'A',
        dest_scope_type: 'colonia',
        volume: 500,
      },
    ];
    const proseHook = vi.fn().mockRejectedValue(new Error('boom'));
    const result = await buildMagnetExodusRanking('MX', '2026-01-01', {
      limit: 10,
      proseHook,
    });
    expect(result.prose_md).not.toBeNull();
    expect(result.prose_md?.length).toBeGreaterThan(0);
  });

  it('handles empty flows gracefully', async () => {
    mockFlows = [];
    const result = await buildMagnetExodusRanking('MX', '2026-01-01');
    expect(result.top_magnets).toEqual([]);
    expect(result.top_exodus).toEqual([]);
  });
});
