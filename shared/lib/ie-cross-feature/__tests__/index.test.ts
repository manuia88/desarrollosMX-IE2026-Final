import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { getZoneMarketData, getZoneScores, suggestZonesForAsesor } from '../index';

interface MockBuilderState {
  selectArgs?: string;
  filters: Array<{ op: string; key?: string; values?: ReadonlyArray<unknown>; value?: unknown }>;
  result: { data: unknown; error: null };
  limitVal?: number;
}

function makeQueryBuilder(initial: { data: unknown; error: null }) {
  const state: MockBuilderState = { filters: [], result: initial };
  const proxy: Record<string, unknown> = {};
  const chain = (..._args: unknown[]) => proxy;
  proxy.select = (cols: string) => {
    state.selectArgs = cols;
    return proxy;
  };
  proxy.eq = (key: string, value: unknown) => {
    state.filters.push({ op: 'eq', key, value });
    return proxy;
  };
  proxy.in = (key: string, values: ReadonlyArray<unknown>) => {
    state.filters.push({ op: 'in', key, values });
    return proxy;
  };
  proxy.order = chain;
  proxy.limit = (n: number) => {
    state.limitVal = n;
    return proxy;
  };
  proxy.maybeSingle = async () =>
    Array.isArray(state.result.data)
      ? { data: state.result.data[0] ?? null, error: null }
      : state.result;
  // biome-ignore lint/suspicious/noThenProperty: builder pattern simula Supabase chainable thenable
  proxy.then = (resolve: (v: unknown) => void) => resolve(state.result);
  return proxy;
}

function mockClient(tables: Record<string, { data: unknown }>): void {
  vi.mocked(createAdminClient).mockReturnValue({
    from: (table: string) => makeQueryBuilder({ data: tables[table]?.data ?? null, error: null }),
  } as unknown as ReturnType<typeof createAdminClient>);
}

describe('ie-cross-feature', () => {
  it('getZoneScores combina pulse + zone_scores diferentes types', async () => {
    mockClient({
      zones: { data: [{ scope_id: 'MX-CDMX-roma-norte', scope_type: 'colonia' }] },
      zone_pulse_scores: { data: [{ pulse_score: 87.5 }] },
      zone_scores: {
        data: [
          { score_type: 'futures_alpha', score_value: 72 },
          { score_type: 'ghost', score_value: 12 },
          { score_type: 'zone_alpha', score_value: 88 },
        ],
      },
    });
    const result = await getZoneScores('zone-uuid-1');
    expect(result.pulse).toBe(87.5);
    expect(result.futures).toBe(72);
    expect(result.ghost).toBe(12);
    expect(result.alpha).toBe(88);
    expect(result.capturedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('getZoneScores devuelve null en campos sin data', async () => {
    mockClient({
      zones: { data: [{ scope_id: 'MX-X-y', scope_type: 'colonia' }] },
      zone_pulse_scores: { data: [] },
      zone_scores: { data: [] },
    });
    const result = await getZoneScores('zone-uuid-2');
    expect(result.pulse).toBeNull();
    expect(result.futures).toBeNull();
  });

  it('getZoneMarketData extrae precio + trend + amenidades de payload', async () => {
    mockClient({
      zona_snapshots: {
        data: [
          {
            payload: {
              precio_promedio_m2: 75000,
              trend_30d_pct: 4.2,
              amenidades_destacadas: ['parque', 'metro', 'cafés'],
            },
          },
        ],
      },
      market_pulse: {
        data: [
          { metric: 'occupancy_rate', value: 0.78, period_start: '2026-04-01' },
          { metric: 'adr', value: 1500, period_start: '2026-04-01' },
        ],
      },
    });
    const result = await getZoneMarketData('zone-uuid-3');
    expect(result.precioPromedioM2).toBe(75000);
    expect(result.trend30dPct).toBe(4.2);
    expect(result.amenidadesDestacadas).toEqual(['parque', 'metro', 'cafés']);
    expect(result.occupancyRateStr).toBe(0.78);
    expect(result.adrStr).toBe(1500);
  });

  it('getZoneMarketData maneja payload vacío gracefully', async () => {
    mockClient({
      zona_snapshots: { data: [] },
      market_pulse: { data: [] },
    });
    const result = await getZoneMarketData('zone-uuid-4');
    expect(result.precioPromedioM2).toBeNull();
    expect(result.amenidadesDestacadas).toEqual([]);
  });

  it('suggestZonesForAsesor calcula score = ops*3 + leads', async () => {
    mockClient({
      leads: {
        data: [
          { zone_id: 'z1', status: 'converted' },
          { zone_id: 'z1', status: 'converted' },
          { zone_id: 'z1', status: 'qualified' },
          { zone_id: 'z2', status: 'qualified' },
          { zone_id: 'z2', status: 'qualified' },
          { zone_id: 'z3', status: 'new' },
        ],
      },
      zones: {
        data: [
          { id: 'z1', name_es: 'Roma Norte' },
          { id: 'z2', name_es: 'Condesa' },
          { id: 'z3', name_es: 'Polanco' },
        ],
      },
    });
    const result = await suggestZonesForAsesor('user-1');
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0]?.zoneId).toBe('z1');
    expect(result[0]?.score).toBe(7);
    expect(result[0]?.zoneName).toBe('Roma Norte');
    expect(result[0]?.reason).toMatch(/cierre/i);
  });

  it('suggestZonesForAsesor returns empty si asesor sin leads', async () => {
    mockClient({
      leads: { data: [] },
      zones: { data: [] },
    });
    const result = await suggestZonesForAsesor('user-empty');
    expect(result).toEqual([]);
  });
});
