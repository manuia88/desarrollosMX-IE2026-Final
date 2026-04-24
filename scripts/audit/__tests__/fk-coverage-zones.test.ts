import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../shared/types/database.ts';
import {
  buildFixDryQuery,
  buildReport,
  classifyTable,
  discoverZoneRefTables,
  shouldExcludeTable,
  type TableAuditResult,
} from '../fk-coverage-zones.ts';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

// --------------------------------------------------------------------------
// Unit — shouldExcludeTable
// --------------------------------------------------------------------------

describe('shouldExcludeTable — partition children / views / templates', () => {
  it('excluye partition default (geo_snapshots_default)', () => {
    expect(shouldExcludeTable('geo_snapshots_default')).toBe(true);
  });

  it('excluye partitions por fecha (market_pulse_p20250101)', () => {
    expect(shouldExcludeTable('market_pulse_p20250101')).toBe(true);
    expect(shouldExcludeTable('zone_price_index_p20260420')).toBe(true);
  });

  it('excluye templates públicas (template_public_*)', () => {
    expect(shouldExcludeTable('template_public_zone_price_index')).toBe(true);
  });

  it('excluye vistas (v_*)', () => {
    expect(shouldExcludeTable('v_ltr_str_connection')).toBe(true);
  });

  it('no excluye tablas parent reales (zone_scores, dmx_indices)', () => {
    expect(shouldExcludeTable('zone_scores')).toBe(false);
    expect(shouldExcludeTable('dmx_indices')).toBe(false);
  });

  it('no excluye parents partitionados (market_pulse, geo_snapshots)', () => {
    expect(shouldExcludeTable('market_pulse')).toBe(false);
    expect(shouldExcludeTable('geo_snapshots')).toBe(false);
  });
});

// --------------------------------------------------------------------------
// Unit — classifyTable
// --------------------------------------------------------------------------

describe('classifyTable — status derivation', () => {
  it('FK enforced + orphans=0 + no error → ok', () => {
    expect(classifyTable({ fkEnforced: true, orphanCount: 0 })).toBe('ok');
  });

  it('FK NOT enforced + orphans=0 + no error → ok', () => {
    expect(classifyTable({ fkEnforced: false, orphanCount: 0 })).toBe('ok');
  });

  it('orphans > 0 → orphans_found (independiente de FK)', () => {
    expect(classifyTable({ fkEnforced: false, orphanCount: 3 })).toBe('orphans_found');
    expect(classifyTable({ fkEnforced: true, orphanCount: 1 })).toBe('orphans_found');
  });

  it('error presente → scan_error (override de orphans)', () => {
    expect(classifyTable({ fkEnforced: false, orphanCount: 0, error: 'boom' })).toBe('scan_error');
    expect(classifyTable({ fkEnforced: false, orphanCount: 5, error: 'boom' })).toBe('scan_error');
  });

  it('error vacío string → tratado como no-error', () => {
    expect(classifyTable({ fkEnforced: false, orphanCount: 0, error: '' })).toBe('ok');
  });
});

// --------------------------------------------------------------------------
// Unit — buildReport
// --------------------------------------------------------------------------

describe('buildReport — agregación de counters', () => {
  function mkResult(partial: Partial<TableAuditResult> & { table: string }): TableAuditResult {
    return {
      table: partial.table,
      column: partial.column ?? 'zone_id',
      fkEnforced: partial.fkEnforced ?? false,
      totalNonNullRefs: partial.totalNonNullRefs ?? 0,
      orphanCount: partial.orphanCount ?? 0,
      orphanSampleIds: partial.orphanSampleIds ?? [],
      status: partial.status ?? 'ok',
      ...(partial.error != null ? { error: partial.error } : {}),
      ...(partial.fixDryQuery != null ? { fixDryQuery: partial.fixDryQuery } : {}),
    };
  }

  it('3 tables OK → totalOrphans=0, tablesWithFKEnforced=count de enforced', () => {
    const tables = [
      mkResult({ table: 't1', fkEnforced: true, status: 'ok' }),
      mkResult({ table: 't2', fkEnforced: false, status: 'ok' }),
      mkResult({ table: 't3', fkEnforced: true, status: 'ok' }),
    ];
    const r = buildReport({ runId: 'run-a', tables });
    expect(r.totalTablesScanned).toBe(3);
    expect(r.tablesWithFKEnforced).toBe(2);
    expect(r.tablesWithoutFK).toBe(1);
    expect(r.totalOrphans).toBe(0);
    expect(r.runId).toBe('run-a');
    expect(typeof r.timestamp).toBe('string');
  });

  it('1 table orphans_found → totalOrphans sumados, status propagated', () => {
    const tables = [
      mkResult({ table: 'zone_scores', orphanCount: 7, status: 'orphans_found' }),
      mkResult({ table: 'ok_table', status: 'ok' }),
    ];
    const r = buildReport({ runId: 'run-b', tables });
    expect(r.totalOrphans).toBe(7);
    expect(r.tables[0]?.status).toBe('orphans_found');
    expect(r.tables[1]?.status).toBe('ok');
  });

  it('mix errores + ok + orphans → counters correctos', () => {
    const tables = [
      mkResult({ table: 'a', fkEnforced: true, status: 'ok' }),
      mkResult({ table: 'b', status: 'scan_error', error: 'net err' }),
      mkResult({ table: 'c', orphanCount: 2, status: 'orphans_found' }),
      mkResult({ table: 'd', orphanCount: 5, status: 'orphans_found' }),
    ];
    const r = buildReport({ runId: 'run-c', tables });
    expect(r.totalTablesScanned).toBe(4);
    expect(r.tablesWithFKEnforced).toBe(1);
    expect(r.tablesWithoutFK).toBe(3);
    expect(r.totalOrphans).toBe(7);
  });

  it('zero tables → report válido con counters en 0', () => {
    const r = buildReport({ runId: 'run-empty', tables: [] });
    expect(r.totalTablesScanned).toBe(0);
    expect(r.tablesWithFKEnforced).toBe(0);
    expect(r.tablesWithoutFK).toBe(0);
    expect(r.totalOrphans).toBe(0);
  });
});

// --------------------------------------------------------------------------
// Unit — buildFixDryQuery
// --------------------------------------------------------------------------

describe('buildFixDryQuery — shape del DELETE string', () => {
  it('genera DELETE con zone_id', () => {
    expect(buildFixDryQuery('zone_scores', 'zone_id')).toBe(
      'DELETE FROM public.zone_scores WHERE zone_id IS NOT NULL AND zone_id NOT IN (SELECT id FROM public.zones);',
    );
  });

  it('genera DELETE con colonia_id', () => {
    expect(buildFixDryQuery('market_pulse', 'colonia_id')).toBe(
      'DELETE FROM public.market_pulse WHERE colonia_id IS NOT NULL AND colonia_id NOT IN (SELECT id FROM public.zones);',
    );
  });
});

// --------------------------------------------------------------------------
// Integration mock — discoverZoneRefTables
// --------------------------------------------------------------------------

type MockInfoSchemaRow = { table_name: string; column_name: string };

function makeDiscoverMock(rows: MockInfoSchemaRow[]): SupabaseClient<Database> {
  const inFn = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eqFn = vi.fn(() => ({ in: inFn }));
  const selectFn = vi.fn(() => ({ eq: eqFn }));
  const fromFn = vi.fn(() => ({ select: selectFn }));
  const schemaFn = vi.fn(() => ({ from: fromFn }));
  return { schema: schemaFn } as unknown as SupabaseClient<Database>;
}

describe('discoverZoneRefTables — integration mock', () => {
  it('filtra partition children + vistas + templates, devuelve sólo parents válidos', async () => {
    const rows: MockInfoSchemaRow[] = [
      { table_name: 'zone_scores', column_name: 'zone_id' },
      { table_name: 'geo_snapshots', column_name: 'zone_id' },
      { table_name: 'geo_snapshots_default', column_name: 'zone_id' }, // excluded
      { table_name: 'market_pulse', column_name: 'colonia_id' },
      { table_name: 'market_pulse_p20250101', column_name: 'colonia_id' }, // excluded
      { table_name: 'template_public_zone_price_index', column_name: 'zone_id' }, // excluded
      { table_name: 'v_ltr_str_connection', column_name: 'zone_id' }, // excluded
    ];
    const supabase = makeDiscoverMock(rows);
    const result = await discoverZoneRefTables(supabase);

    expect(result).toEqual([
      { table: 'geo_snapshots', column: 'zone_id' },
      { table: 'market_pulse', column: 'colonia_id' },
      { table: 'zone_scores', column: 'zone_id' },
    ]);
  });

  it('dedupe cuando information_schema devuelve rows duplicadas', async () => {
    const rows: MockInfoSchemaRow[] = [
      { table_name: 'zone_scores', column_name: 'zone_id' },
      { table_name: 'zone_scores', column_name: 'zone_id' },
    ];
    const supabase = makeDiscoverMock(rows);
    const result = await discoverZoneRefTables(supabase);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ table: 'zone_scores', column: 'zone_id' });
  });

  it('acepta ambas columnas coexistiendo en la misma tabla', async () => {
    const rows: MockInfoSchemaRow[] = [
      { table_name: 'zone_scores', column_name: 'zone_id' },
      { table_name: 'zone_scores', column_name: 'colonia_id' },
    ];
    const supabase = makeDiscoverMock(rows);
    const result = await discoverZoneRefTables(supabase);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.column).sort()).toEqual(['colonia_id', 'zone_id']);
  });

  it('throws cuando information_schema devuelve error', async () => {
    const inFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    const eqFn = vi.fn(() => ({ in: inFn }));
    const selectFn = vi.fn(() => ({ eq: eqFn }));
    const fromFn = vi.fn(() => ({ select: selectFn }));
    const schemaFn = vi.fn(() => ({ from: fromFn }));
    const supabase = { schema: schemaFn } as unknown as SupabaseClient<Database>;

    await expect(discoverZoneRefTables(supabase)).rejects.toThrow(/permission denied/);
  });

  it('ignora column_name que NO es zone_id ni colonia_id (defensive narrow)', async () => {
    const rows: MockInfoSchemaRow[] = [
      { table_name: 'zone_scores', column_name: 'zone_id' },
      { table_name: 'some_table', column_name: 'other_id' }, // not a ref col
    ];
    const supabase = makeDiscoverMock(rows);
    const result = await discoverZoneRefTables(supabase);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ table: 'zone_scores', column: 'zone_id' });
  });
});

// --------------------------------------------------------------------------
// Integration — end-to-end classify via buildReport
// --------------------------------------------------------------------------

describe('buildReport — integración con classifyTable (orphan detection)', () => {
  it('propaga orphanSampleIds.length=3 cuando mock simula 3 orphans', () => {
    const tables: TableAuditResult[] = [
      {
        table: 'zone_scores',
        column: 'zone_id',
        fkEnforced: false,
        totalNonNullRefs: 10,
        orphanCount: 3,
        orphanSampleIds: ['id-a', 'id-b', 'id-c'],
        status: classifyTable({ fkEnforced: false, orphanCount: 3 }),
      },
    ];
    const r = buildReport({ runId: 'run-int', tables });
    expect(r.totalOrphans).toBe(3);
    expect(r.tables[0]?.orphanSampleIds).toEqual(['id-a', 'id-b', 'id-c']);
    expect(r.tables[0]?.status).toBe('orphans_found');
  });

  it('tabla clean (todas las refs existen) → orphanCount=0, status=ok', () => {
    const tables: TableAuditResult[] = [
      {
        table: 'zone_scores',
        column: 'zone_id',
        fkEnforced: false,
        totalNonNullRefs: 229,
        orphanCount: 0,
        orphanSampleIds: [],
        status: classifyTable({ fkEnforced: false, orphanCount: 0 }),
      },
    ];
    const r = buildReport({ runId: 'run-clean', tables });
    expect(r.totalOrphans).toBe(0);
    expect(r.tables[0]?.status).toBe('ok');
  });
});
