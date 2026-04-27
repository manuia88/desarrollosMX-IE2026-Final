// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Tests cross-function auto-import-asesor: profile existing vs missing.

import { describe, expect, it, vi } from 'vitest';

import { autoImportFromDmxProfile } from '@/features/dmx-studio/lib/cross-functions/auto-import-asesor';

interface QueryBuilderConfig {
  readonly maybeSingle?: { data: unknown; error: unknown };
  readonly count?: { count: number; error: unknown };
  readonly list?: { data: unknown; error: unknown };
}

function buildQuery(config: QueryBuilderConfig): unknown {
  const builder: Record<string, unknown> = {};
  const passthrough = () => builder;
  builder.select = vi.fn((_columns: string, options?: { count?: string; head?: boolean }) => {
    const countConfig = config.count;
    if (options?.count === 'exact' && options.head === true && countConfig) {
      // count query: chain returns awaited result with { count, error }
      const countBuilder: Record<string, unknown> = {};
      const countPassthrough = () => countBuilder;
      countBuilder.eq = vi.fn(countPassthrough);
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock matching supabase query builder shape
      countBuilder.then = (resolve: (value: { count: number; error: unknown }) => unknown) =>
        Promise.resolve(countConfig).then(resolve);
      return countBuilder;
    }
    return builder;
  });
  builder.eq = vi.fn(passthrough);
  builder.order = vi.fn(passthrough);
  builder.limit = vi.fn(() => {
    if (config.list) {
      return Promise.resolve(config.list);
    }
    return Promise.resolve({ data: [], error: null });
  });
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(config.maybeSingle ?? { data: null, error: null }),
  );
  return builder;
}

describe('autoImportFromDmxProfile', () => {
  it('returns full data when asesor profile exists with leads, deals, and projects', async () => {
    const profileRow = {
      id: 'user-1',
      full_name: 'Ana López',
      phone: '+5215511112222',
      country_code: 'MX',
      rol: 'asesor',
      desarrolladora_id: null,
    };
    const brokerRows = [
      { proyecto_id: 'p1', proyectos: { colonia: 'Roma Norte', ciudad: 'CDMX' } },
      { proyecto_id: 'p2', proyectos: { colonia: 'Condesa', ciudad: 'CDMX' } },
      { proyecto_id: 'p3', proyectos: { colonia: 'Polanco', ciudad: 'CDMX' } },
      { proyecto_id: 'p4', proyectos: { colonia: 'Roma Norte', ciudad: 'CDMX' } },
    ];

    const fromMock = vi.fn((table: string) => {
      if (table === 'profiles') {
        return buildQuery({ maybeSingle: { data: profileRow, error: null } });
      }
      if (table === 'leads') {
        return buildQuery({ count: { count: 27, error: null } });
      }
      if (table === 'operaciones') {
        return buildQuery({ count: { count: 4, error: null } });
      }
      if (table === 'project_brokers') {
        return buildQuery({ list: { data: brokerRows, error: null } });
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const supabase = { from: fromMock } as unknown as Parameters<
      typeof autoImportFromDmxProfile
    >[0];

    const result = await autoImportFromDmxProfile(supabase, 'user-1');

    expect(result.isExistingDmxUser).toBe(true);
    expect(result.displayName).toBe('Ana López');
    expect(result.phone).toBe('+5215511112222');
    expect(result.contactPhone).toBe('+5215511112222');
    expect(result.country_code).toBe('MX');
    expect(result.role).toBe('asesor');
    expect(result.currentLeadsCount).toBe(27);
    expect(result.currentClosedDealsCount).toBe(4);
    expect(result.zones).toEqual(['Roma Norte', 'Condesa', 'Polanco']);
    expect(result.cities).toEqual(['CDMX']);
  });

  it('returns isExistingDmxUser=false with empty defaults when profile not found', async () => {
    const fromMock = vi.fn((_table: string) =>
      buildQuery({ maybeSingle: { data: null, error: null } }),
    );
    const supabase = { from: fromMock } as unknown as Parameters<
      typeof autoImportFromDmxProfile
    >[0];

    const result = await autoImportFromDmxProfile(supabase, 'user-missing');

    expect(result.isExistingDmxUser).toBe(false);
    expect(result.displayName).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.contactPhone).toBeNull();
    expect(result.country_code).toBeNull();
    expect(result.role).toBeNull();
    expect(result.currentLeadsCount).toBe(0);
    expect(result.currentClosedDealsCount).toBe(0);
    expect(result.zones).toEqual([]);
    expect(result.cities).toEqual([]);
  });
});
