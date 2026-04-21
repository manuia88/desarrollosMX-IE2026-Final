import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CalculatorInput } from '../base';
import { clearTenantScopeCachesForTesting, validateTenantScope } from '../tenant-scope';

interface VisibilityRow {
  readonly tenant_scope_required: boolean;
}

interface TenantRow {
  readonly id: string;
}

function mockSupabase(opts: {
  visibility?: VisibilityRow[] | null;
  tenants?: TenantRow[] | null;
}): SupabaseClient {
  const from = vi.fn((table: string) => {
    if (table === 'ie_score_visibility_rules') {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        limit: vi.fn(async () => ({
          data: opts.visibility ?? null,
          error: opts.visibility ? null : new Error('no rows'),
        })),
      };
      return builder;
    }
    if (table === 'tenant_scopes') {
      return {
        select: vi.fn(async () => ({
          data: opts.tenants ?? null,
          error: opts.tenants ? null : new Error('no rows'),
        })),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { from } as unknown as SupabaseClient;
}

const baseInput: CalculatorInput = {
  zoneId: 'zone-1',
  countryCode: 'MX',
  periodDate: '2026-04-20',
};

afterEach(() => {
  clearTenantScopeCachesForTesting();
});

describe('validateTenantScope', () => {
  it('score sin tenant_scope_required pasa sin tenant_id', async () => {
    const supabase = mockSupabase({ visibility: [{ tenant_scope_required: false }] });
    const result = await validateTenantScope(baseInput, 'G01', supabase);
    expect(result.ok).toBe(true);
    expect(result.violation).toBeUndefined();
  });

  it('score con tenant_scope_required=true falla sin tenant_id', async () => {
    const supabase = mockSupabase({
      visibility: [{ tenant_scope_required: true }],
      tenants: [{ id: 'tenant-A' }],
    });
    const result = await validateTenantScope(baseInput, 'E01', supabase);
    expect(result.ok).toBe(false);
    expect(result.violation?.reason).toBe('tenant_required_missing');
  });

  it('score tenant_scope_required con tenant_id válido pasa', async () => {
    const supabase = mockSupabase({
      visibility: [{ tenant_scope_required: true }],
      tenants: [{ id: 'tenant-A' }, { id: 'tenant-B' }],
    });
    const result = await validateTenantScope(
      { ...baseInput, tenant_id: 'tenant-A' },
      'E01',
      supabase,
    );
    expect(result.ok).toBe(true);
  });

  it('score tenant_scope_required con tenant_id desconocido falla', async () => {
    const supabase = mockSupabase({
      visibility: [{ tenant_scope_required: true }],
      tenants: [{ id: 'tenant-A' }],
    });
    const result = await validateTenantScope(
      { ...baseInput, tenant_id: 'tenant-Z' },
      'E01',
      supabase,
    );
    expect(result.ok).toBe(false);
    expect(result.violation?.reason).toBe('unknown_tenant');
  });

  it('score público con tenant_id opcional válido pasa', async () => {
    const supabase = mockSupabase({
      visibility: [{ tenant_scope_required: false }],
      tenants: [{ id: 'tenant-A' }],
    });
    const result = await validateTenantScope(
      { ...baseInput, tenant_id: 'tenant-A' },
      'G01',
      supabase,
    );
    expect(result.ok).toBe(true);
  });

  it('score público con tenant_id opcional desconocido falla', async () => {
    const supabase = mockSupabase({
      visibility: [{ tenant_scope_required: false }],
      tenants: [{ id: 'tenant-A' }],
    });
    const result = await validateTenantScope(
      { ...baseInput, tenant_id: 'tenant-Z' },
      'G01',
      supabase,
    );
    expect(result.ok).toBe(false);
    expect(result.violation?.reason).toBe('unknown_tenant');
  });

  it('score tenant_scope_required con catálogo tenants vacío falla', async () => {
    const supabase = mockSupabase({
      visibility: [{ tenant_scope_required: true }],
      tenants: [],
    });
    const result = await validateTenantScope(
      { ...baseInput, tenant_id: 'tenant-A' },
      'E01',
      supabase,
    );
    expect(result.ok).toBe(false);
    expect(result.violation?.reason).toBe('tenant_lookup_failed');
  });
});
