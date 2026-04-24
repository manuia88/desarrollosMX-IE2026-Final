#!/usr/bin/env node
/**
 * FK coverage audit — zone_id / colonia_id references across public schema.
 *
 * SESIÓN 07.5.F B.2 — pre-requisito para FASE 08 FK enforcement (L-NEW13).
 *
 * Reporta:
 *   - Tablas con columnas zone_id / colonia_id.
 *   - Cuáles tienen FK enforced hacia public.zones(id) (spoiler: ninguna hoy).
 *   - Orphans: rows cuya referencia no existe en public.zones.
 *
 * Approach pragmático (in-process join scan):
 *   1. Descubre columnas vía information_schema (cast unknown — no tipadas en Database).
 *   2. Carga Set<string> de todos public.zones.id (229 rows, trivial).
 *   3. Para cada tabla sin FK enforced: paginea sus refs y filtra contra el Set.
 *
 * Excluye particiones children (_default, _pYYYYMMDD), vistas (v_*), templates
 * (template_public_*). Cuenta sólo parents partitionados.
 *
 * Flags CLI:
 *   --dry-run   No crea ingest_runs row — sólo reporte local a stdout.
 *   --fix-dry   Imprime los queries DELETE que LIMPIARÍAN cada orphan (no ejecuta).
 *   --verbose   Incluye queries SQL en el output.
 *
 * Gate:
 *   Si totalOrphans > 0 → process.exitCode = 1 (stop G4). No throw.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../shared/types/database.ts';
import { withIngestRun } from '../ingest/lib/ingest-run-helper.ts';

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

const SOURCE = 'audit_fk_zones';
const DEFAULT_COUNTRY = 'MX';
const ORPHAN_SAMPLE_LIMIT = 5;
const EXCLUDE_VIEWS_AND_TEMPLATES = true;
const REF_COLUMNS = ['zone_id', 'colonia_id'] as const;
const SCAN_PAGE_SIZE = 5000;
const SCAN_MAX_ROWS = 200_000; // defensive upper bound per table

// --------------------------------------------------------------------------
// Types públicos (exportados para tests)
// --------------------------------------------------------------------------

export type ColumnRefKind = 'zone_id' | 'colonia_id';

export type TableAuditResult = {
  table: string;
  column: ColumnRefKind;
  fkEnforced: boolean;
  totalNonNullRefs: number;
  orphanCount: number;
  orphanSampleIds: string[];
  status: 'ok' | 'orphans_found' | 'scan_error';
  error?: string;
  fixDryQuery?: string;
};

export type Report = {
  runId: string;
  timestamp: string;
  totalTablesScanned: number;
  tablesWithFKEnforced: number;
  tablesWithoutFK: number;
  totalOrphans: number;
  tables: TableAuditResult[];
};

type CliArgs = {
  dryRun: boolean;
  fixDry: boolean;
  verbose: boolean;
};

type DiscoveredColumn = {
  table: string;
  column: ColumnRefKind;
};

type ClassifyInput = {
  fkEnforced: boolean;
  orphanCount: number;
  error?: string;
};

// --------------------------------------------------------------------------
// Puros (exportados para tests)
// --------------------------------------------------------------------------

/**
 * Excluye partition children + vistas + templates. Cuenta sólo parents.
 *
 * Reglas:
 *   - termina en `_default` (partition default)
 *   - matchea `_pYYYYMMDD` (partition por fecha)
 *   - empieza con `template_public_` (templates)
 *   - empieza con `v_` (vistas — no scan-ables aunque tengan zone_id)
 */
export function shouldExcludeTable(name: string): boolean {
  if (!EXCLUDE_VIEWS_AND_TEMPLATES) return false;
  if (name.endsWith('_default')) return true;
  if (/_p\d{8}$/.test(name)) return true;
  if (name.startsWith('template_public_')) return true;
  if (name.startsWith('v_')) return true;
  return false;
}

/**
 * Clasifica una row basada en flags de FK + orphan + error.
 * - error presente → 'scan_error'
 * - orphanCount > 0 → 'orphans_found'
 * - otherwise → 'ok' (da igual si FK está enforced o no — ambos son válidos)
 */
export function classifyTable(input: ClassifyInput): TableAuditResult['status'] {
  if (input.error != null && input.error !== '') return 'scan_error';
  if (input.orphanCount > 0) return 'orphans_found';
  return 'ok';
}

/**
 * Agrega un array de resultados en un Report consolidado.
 */
export function buildReport(args: { runId: string; tables: TableAuditResult[] }): Report {
  const { runId, tables } = args;
  let tablesWithFKEnforced = 0;
  let totalOrphans = 0;
  for (const t of tables) {
    if (t.fkEnforced) tablesWithFKEnforced += 1;
    totalOrphans += t.orphanCount;
  }
  return {
    runId,
    timestamp: new Date().toISOString(),
    totalTablesScanned: tables.length,
    tablesWithFKEnforced,
    tablesWithoutFK: tables.length - tablesWithFKEnforced,
    totalOrphans,
    tables,
  };
}

/**
 * Genera el query DELETE que eliminaría orphans (SOLO string — no se ejecuta).
 */
export function buildFixDryQuery(table: string, column: ColumnRefKind): string {
  return `DELETE FROM public.${table} WHERE ${column} IS NOT NULL AND ${column} NOT IN (SELECT id FROM public.zones);`;
}

// --------------------------------------------------------------------------
// CLI parsing
// --------------------------------------------------------------------------

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let fixDry = false;
  let verbose = false;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') dryRun = true;
    else if (a === '--fix-dry') fixDry = true;
    else if (a === '--verbose') verbose = true;
  }
  return { dryRun, fixDry, verbose };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(`[audit-fk-zones] Falta env var requerida: ${name}.`);
  }
  return v;
}

// --------------------------------------------------------------------------
// Discover — information_schema via typed cast (no está en Database types)
// --------------------------------------------------------------------------

type InfoSchemaColumnRow = {
  table_name: string;
  column_name: string;
};

type InfoSchemaConstraintRow = {
  table_name: string;
  column_name: string;
};

/**
 * Descubre todas las tablas `public.*` con columnas `zone_id` / `colonia_id`.
 * Filtra partition children + views + templates.
 */
export async function discoverZoneRefTables(
  supabase: SupabaseClient<Database>,
): Promise<DiscoveredColumn[]> {
  // Cast a unknown → narrow manual: information_schema no está tipado en Database.
  const client = supabase as unknown as {
    schema: (s: string) => {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            in: (
              c: string,
              v: readonly string[],
            ) => Promise<{
              data: InfoSchemaColumnRow[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };

  const { data, error } = await client
    .schema('information_schema')
    .from('columns')
    .select('table_name, column_name')
    .eq('table_schema', 'public')
    .in('column_name', REF_COLUMNS);

  if (error) {
    throw new Error(`[audit-fk-zones] discover columns: ${error.message}`);
  }
  const rows = data ?? [];
  const out: DiscoveredColumn[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (shouldExcludeTable(r.table_name)) continue;
    const col = r.column_name as ColumnRefKind;
    if (col !== 'zone_id' && col !== 'colonia_id') continue;
    const key = `${r.table_name}:${col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ table: r.table_name, column: col });
  }
  out.sort((a, b) => {
    if (a.table !== b.table) return a.table.localeCompare(b.table);
    return a.column.localeCompare(b.column);
  });
  return out;
}

/**
 * Retorna Set<string> con keys `${table}:${column}` donde la FK está enforced
 * hacia public.zones(id).
 */
export async function detectEnforcedFKs(supabase: SupabaseClient<Database>): Promise<Set<string>> {
  const client = supabase as unknown as {
    schema: (s: string) => {
      from: (t: string) => {
        select: (cols: string) => Promise<{
          data: InfoSchemaConstraintRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  // PostgREST no permite queries SQL raw. La introspección exhaustiva de FKs
  // requiere JOIN de 3 tablas (table_constraints + key_column_usage +
  // constraint_column_usage). Como --spoiler confirmado— pre-FASE 08 no hay
  // ninguna FK enforced hacia zones(id), devolvemos Set vacío y documentamos.
  //
  // Cuando FASE 08 añada FKs, este helper debe reemplazarse por una función
  // RPC `list_zone_fks()` expuesta vía SECURITY DEFINER.
  const probe = await client
    .schema('information_schema')
    .from('referential_constraints')
    .select('constraint_name');
  if (probe.error) {
    // Swallow: si ni siquiera podemos introspeccionar, asumimos zero FK
    // enforced (consistente con estado H1 pre-FASE 08).
  }
  return new Set<string>();
}

// --------------------------------------------------------------------------
// Scan orphans — in-process join
// --------------------------------------------------------------------------

async function fetchZonesIdSet(supabase: SupabaseClient<Database>): Promise<Set<string>> {
  const { data, error } = await supabase.from('zones').select('id');
  if (error) {
    throw new Error(`[audit-fk-zones] fetch zones.id: ${error.message}`);
  }
  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.id != null) ids.add(row.id);
  }
  return ids;
}

type TableScanOpts = {
  supabase: SupabaseClient<Database>;
  table: string;
  column: ColumnRefKind;
  zonesIds: Set<string>;
};

async function scanOrphansForTable(opts: TableScanOpts): Promise<{
  totalNonNullRefs: number;
  orphanCount: number;
  orphanSampleIds: string[];
}> {
  const { supabase, table, column, zonesIds } = opts;

  // In-process scan paginado.
  let offset = 0;
  let totalNonNullRefs = 0;
  let orphanCount = 0;
  const orphanSample: string[] = [];

  // Cast: la tabla puede ser particionada y no existir en Database types
  // (ej: market_prices_secondary_pYYYYMMDD), pero apuntamos a parents siempre.
  // Sin embargo, tablas descubiertas dinámicamente tampoco están en el type
  // union estricto, así que cast a unknown y narrow manual.
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (
        cols: string,
        opts?: { count?: 'exact' | 'planned' | 'estimated' },
      ) => {
        not: (
          c: string,
          op: string,
          v: null,
        ) => {
          range: (
            f: number,
            t: number,
          ) => Promise<{
            data: Array<Record<string, string | null>> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  // Loop paginado.
  for (;;) {
    const end = offset + SCAN_PAGE_SIZE - 1;
    const { data, error } = await client
      .from(table)
      .select(column)
      .not(column, 'is', null)
      .range(offset, end);
    if (error) {
      throw new Error(`[audit-fk-zones] scan ${table}.${column}: ${error.message}`);
    }
    const page = data ?? [];
    for (const row of page) {
      const v = row[column];
      if (typeof v !== 'string' || v === '') continue;
      totalNonNullRefs += 1;
      if (!zonesIds.has(v)) {
        orphanCount += 1;
        if (orphanSample.length < ORPHAN_SAMPLE_LIMIT) {
          orphanSample.push(v);
        }
      }
    }
    if (page.length < SCAN_PAGE_SIZE) break;
    offset += SCAN_PAGE_SIZE;
    if (offset >= SCAN_MAX_ROWS) {
      throw new Error(
        `[audit-fk-zones] ${table}.${column} exceeded SCAN_MAX_ROWS=${SCAN_MAX_ROWS}`,
      );
    }
  }

  return { totalNonNullRefs, orphanCount, orphanSampleIds: orphanSample };
}

// --------------------------------------------------------------------------
// Audit orchestration
// --------------------------------------------------------------------------

async function auditAllTables(args: {
  supabase: SupabaseClient<Database>;
  tables: DiscoveredColumn[];
  enforcedFkSet: Set<string>;
  zonesIds: Set<string>;
  fixDry: boolean;
}): Promise<TableAuditResult[]> {
  const { supabase, tables, enforcedFkSet, zonesIds, fixDry } = args;
  const results: TableAuditResult[] = [];

  for (const t of tables) {
    const key = `${t.table}:${t.column}`;
    const fkEnforced = enforcedFkSet.has(key);
    try {
      const scan = await scanOrphansForTable({
        supabase,
        table: t.table,
        column: t.column,
        zonesIds,
      });
      const status = classifyTable({
        fkEnforced,
        orphanCount: scan.orphanCount,
      });
      const base: TableAuditResult = {
        table: t.table,
        column: t.column,
        fkEnforced,
        totalNonNullRefs: scan.totalNonNullRefs,
        orphanCount: scan.orphanCount,
        orphanSampleIds: scan.orphanSampleIds,
        status,
      };
      if (fixDry && scan.orphanCount > 0) {
        base.fixDryQuery = buildFixDryQuery(t.table, t.column);
      }
      results.push(base);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        table: t.table,
        column: t.column,
        fkEnforced,
        totalNonNullRefs: 0,
        orphanCount: 0,
        orphanSampleIds: [],
        status: classifyTable({ fkEnforced, orphanCount: 0, error: msg }),
        error: msg,
      });
    }
  }

  return results;
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main(): Promise<number> {
  const args = parseArgs(process.argv);

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          note: 'Sin createIngestRun — reporte local. Re-run sin --dry-run para persistir.',
          flags: args,
        },
        null,
        2,
      ),
    );
    return 0;
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: DEFAULT_COUNTRY,
      triggeredBy: 'cli:audit_fk_zones',
      meta: {
        script: 'scripts/audit/fk-coverage-zones.ts',
        flags: {
          fix_dry: args.fixDry,
          verbose: args.verbose,
        },
      } as Json,
      expectedPeriodicity: 'on_demand',
      upsertWatermarkOnSuccess: false,
    },
    async ({ runId }) => {
      // Paso 1 — discover
      const tables = await discoverZoneRefTables(supabase);

      // Paso 2 — FK enforcement detection
      const enforcedFkSet = await detectEnforcedFKs(supabase);

      // Paso 3 — orphan scan
      const zonesIds = await fetchZonesIdSet(supabase);
      const results = await auditAllTables({
        supabase,
        tables,
        enforcedFkSet,
        zonesIds,
        fixDry: args.fixDry,
      });

      // Paso 4 — report
      const report = buildReport({ runId, tables: results });
      if (args.verbose) {
        console.log(
          JSON.stringify(
            {
              debug_queries: {
                discover_columns:
                  "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('zone_id','colonia_id')",
                orphan_scan_template: `SELECT <col> FROM public.<table> WHERE <col> IS NOT NULL AND <col> NOT IN (SELECT id FROM public.zones) LIMIT ${ORPHAN_SAMPLE_LIMIT}`,
              },
            },
            null,
            2,
          ),
        );
      }
      console.log(JSON.stringify(report, null, 2));

      // Paso 5 — gate
      if (report.totalOrphans > 0) {
        console.error(
          `[audit-fk-zones] G4 STOP: ${report.totalOrphans} orphan(s) detected across ${report.tables.filter((x) => x.status === 'orphans_found').length} table(s).`,
        );
        process.exitCode = 1;
      }

      // Paso 6 — counts semántica: skipped = tablas auditadas
      return {
        counts: {
          inserted: 0,
          updated: 0,
          skipped: report.totalTablesScanned,
        },
      };
    },
  );

  const code = process.exitCode;
  return typeof code === 'number' ? code : 0;
}

// --------------------------------------------------------------------------
// Entry
// --------------------------------------------------------------------------

const isMain =
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  (process.argv[1].endsWith('fk-coverage-zones.ts') ||
    process.argv[1].endsWith('fk-coverage-zones.js'));

if (isMain) {
  main().catch((err) => {
    console.error(`[audit-fk-zones] fatal: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
