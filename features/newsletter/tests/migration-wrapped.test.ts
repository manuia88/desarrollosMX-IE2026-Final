import { describe, expect, it } from 'vitest';
import { buildMigrationWrapped } from '../lib/migration-wrapped';

function makeSupabase(flows: unknown[]): unknown {
  interface MockBuilder {
    readonly select: () => MockBuilder;
    readonly eq: () => MockBuilder;
    readonly gte: () => MockBuilder;
    readonly lte: () => MockBuilder;
    readonly then: (resolve: (v: { data: unknown; error: null }) => void) => void;
  }
  return {
    from() {
      const qb: MockBuilder = {
        select: () => qb,
        eq: () => qb,
        gte: () => qb,
        lte: () => qb,
        // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for supabase chainable API
        then(resolve: (v: { data: unknown; error: null }) => void) {
          resolve({ data: flows, error: null });
        },
      };
      return qb;
    },
  };
}

describe('buildMigrationWrapped', () => {
  it('computes top_magnet and top_exodus from flows', async () => {
    const flows = [
      {
        origin_scope_type: 'colonia',
        origin_scope_id: 'iztapalapa',
        dest_scope_type: 'colonia',
        dest_scope_id: 'roma-norte',
        volume: 1000,
      },
      {
        origin_scope_type: 'colonia',
        origin_scope_id: 'iztapalapa',
        dest_scope_type: 'colonia',
        dest_scope_id: 'condesa',
        volume: 500,
      },
      {
        origin_scope_type: 'colonia',
        origin_scope_id: 'condesa',
        dest_scope_type: 'colonia',
        dest_scope_id: 'polanco',
        volume: 200,
      },
    ];
    const sup = makeSupabase(flows);
    const bundle = await buildMigrationWrapped({
      year: 2025,
      countryCode: 'MX',
      supabase: sup as never,
    });

    expect(bundle.year).toBe(2025);
    expect(bundle.country_code).toBe('MX');
    expect(bundle.total_flows).toBe(1700);
    // Roma Norte recibe 1000, sin outflow → net 1000 = top_magnet.
    expect(bundle.top_magnet.scope_id).toBe('roma-norte');
    expect(bundle.top_magnet.net).toBe(1000);
    // Iztapalapa tiene -1500 de net (outflow 1500) → top_exodus.
    expect(bundle.top_exodus.scope_id).toBe('iztapalapa');
    expect(bundle.top_exodus.net).toBe(-1500);
    expect(bundle.cards.length).toBeGreaterThan(0);
  });

  it('handles empty flows gracefully', async () => {
    const sup = makeSupabase([]);
    const bundle = await buildMigrationWrapped({
      year: 2025,
      countryCode: 'MX',
      supabase: sup as never,
    });
    expect(bundle.total_flows).toBe(0);
    expect(bundle.top_magnet.net).toBe(0);
    expect(bundle.top_exodus.net).toBe(0);
  });
});
