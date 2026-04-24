import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import { resolveColoniaIdBySlug, resolveSlugByColoniaId } from '../lib/slug-resolver';

interface MockRow {
  zone_id: string;
  slug: string;
  scope_type: string;
  country_code: string;
  source_label: string;
}

function buildClient(result: { data: MockRow | null; error: unknown }): SupabaseClient<Database> {
  const maybeSingle = vi.fn(async () => result);
  const limit = vi.fn(() => ({ maybeSingle }));
  const eqScopeType = vi.fn(() => ({ limit }));
  const eqSlug = vi.fn(() => ({ eq: eqScopeType }));
  const select = vi.fn(() => ({ eq: eqSlug }));
  const from = vi.fn(() => ({ select }));
  return { from } as unknown as SupabaseClient<Database>;
}

function buildClientBySlug(rows: MockRow | null): SupabaseClient<Database> {
  return buildClient({ data: rows, error: rows ? null : { code: 'PGRST116' } });
}

describe('resolveColoniaIdBySlug', () => {
  it('returns null when slug empty', async () => {
    const client = buildClientBySlug(null);
    const result = await resolveColoniaIdBySlug('', client);
    expect(result).toBeNull();
  });

  it('returns resolution when slug found', async () => {
    const row: MockRow = {
      zone_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      slug: 'roma-norte',
      scope_type: 'colonia',
      country_code: 'MX',
      source_label: 'Roma Norte',
    };
    const client = buildClientBySlug(row);
    const result = await resolveColoniaIdBySlug('roma-norte', client);
    expect(result).not.toBeNull();
    expect(result?.colonia_id).toBe(row.zone_id);
    expect(result?.source_label).toBe('Roma Norte');
  });

  it('returns null when not found', async () => {
    const client = buildClientBySlug(null);
    const result = await resolveColoniaIdBySlug('no-existe', client);
    expect(result).toBeNull();
  });
});

describe('resolveSlugByColoniaId', () => {
  it('returns null when colonia id empty', async () => {
    const client = buildClientBySlug(null);
    const result = await resolveSlugByColoniaId('', client);
    expect(result).toBeNull();
  });

  it('returns slug when colonia id maps', async () => {
    const row: MockRow = {
      zone_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      slug: 'roma-norte',
      scope_type: 'colonia',
      country_code: 'MX',
      source_label: 'Roma Norte',
    };
    const client = buildClientBySlug(row);
    const result = await resolveSlugByColoniaId(row.zone_id, client);
    expect(result).toBe('roma-norte');
  });
});
