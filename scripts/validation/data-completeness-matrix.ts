#!/usr/bin/env node
/**
 * Data completeness matrix — FASE 07.5.F SESIÓN B.3.
 *
 * Crosswalk expected vs actual populate counts por sesión (07.5.A → 07.5.E).
 * Audit-only: solo `SELECT count(*)` con `head: true` (zero row fetch).
 *
 * Nota sobre ingest_runs tracking:
 *   Este script NO usa `withIngestRun()`. Motivo: el source
 *   `validation_e2e_fase_07.5` ya se persiste en el script E2E
 *   (scripts/validation/e2e-fase-07.5-integration.ts) como parte de la
 *   misma sesión B; duplicar ingest_runs rows acá desde este
 *   complementario sería ruido sin signal adicional (este script es
 *   SELECT-only, no muta nada). Si a futuro se quisiera tracking
 *   independiente, introducir source dedicado
 *   `validation_completeness_matrix` antes de envolverlo.
 *
 * Uso:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node --experimental-strip-types \
 *     scripts/validation/data-completeness-matrix.ts --output=md
 *
 * Flags:
 *   --dry-run        No consulta BD — usa mock inline (para smoke local).
 *   --output=json    Default. Render JSON a stdout.
 *   --output=md      Render markdown table + summary.
 *
 * Gate G4:
 *   - critical (< 70%) o error → process.exitCode = 1 + stderr mensaje.
 *   - partial/warning/over_populated → NO stop (solo reporta).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/types/database.ts';

// ========================================================================
// Constants
// ========================================================================

const TAG = '[validation:completeness-matrix]';

export const COMPLETENESS_WARNING_PCT = 90;
export const COMPLETENESS_STOP_PCT = 70;
export const COMPLETENESS_TOLERANCE_PCT = 10;

export const BOUNDARY_PSEUDO_TABLE = 'zones_with_boundary';

export type ExpectedRow = {
  session: string;
  table: string;
  expected: number;
  description: string;
};

export const EXPECTED_COUNTS: ReadonlyArray<ExpectedRow> = [
  // 07.5.A — macro + demographics + boundary
  {
    session: '07.5.A',
    table: 'macro_series',
    expected: 880,
    description: 'Banxico 4 series × 220 días',
  },
  {
    session: '07.5.A',
    table: 'inegi_census_zone_stats',
    expected: 210,
    description: '210 colonias × census synthetic v1',
  },
  {
    session: '07.5.A',
    table: 'enigh_zone_income',
    expected: 210,
    description: '210 colonias × enigh synthetic v1',
  },
  {
    session: '07.5.A',
    table: BOUNDARY_PSEUDO_TABLE,
    expected: 210,
    description: '210 boundary MULTIPOLYGON (fallback bbox-500m)',
  },

  // 07.5.B — zone_scores + dmx_indices
  {
    session: '07.5.B',
    table: 'zone_scores',
    expected: 5267,
    description: 'N0+N1 (N2-N4 tier-gated L-NEW23)',
  },
  {
    session: '07.5.B',
    table: 'dmx_indices',
    expected: 3192,
    description: '14 códigos × 228 zones',
  },

  // 07.5.C — pulse + forecasts + DNA
  {
    session: '07.5.C',
    table: 'zone_pulse_scores',
    expected: 83220,
    description: '228 zones × 365 días',
  },
  {
    session: '07.5.C',
    table: 'pulse_forecasts',
    expected: 6840,
    description: '228 × 30 días',
  },
  {
    session: '07.5.C',
    table: 'colonia_dna_vectors',
    expected: 210,
    description: '210 colonias × 64-dim + top_5',
  },

  // 07.5.D — climate + constellations + ghost
  {
    session: '07.5.D',
    table: 'climate_monthly_aggregates',
    expected: 43776,
    description: '228 zones × 192 meses ~16y',
  },
  {
    session: '07.5.D',
    table: 'climate_annual_summaries',
    expected: 3648,
    description: '228 zones × 16 años',
  },
  {
    session: '07.5.D',
    table: 'climate_zone_signatures',
    expected: 228,
    description: '228 zones × signature',
  },
  {
    session: '07.5.D',
    table: 'climate_twin_matches',
    expected: 1140,
    description: '228 × 5 twins',
  },
  {
    session: '07.5.D',
    table: 'zone_constellations_edges',
    expected: 21945,
    description: '4 edge types triangular',
  },
  {
    session: '07.5.D',
    table: 'zone_constellation_clusters',
    expected: 210,
    description: '210 colonias × cluster',
  },
  {
    session: '07.5.D',
    table: 'zone_topology_metrics',
    expected: 210,
    description: '210 colonias × topology',
  },
  {
    session: '07.5.D',
    table: 'ghost_zones_ranking',
    expected: 210,
    description: '210 colonias × ghost score + transition',
  },

  // 07.5.E — atlas wiki
  {
    session: '07.5.E',
    table: 'colonia_wiki_entries',
    expected: 210,
    description: '210 entries × 8 sections',
  },
];

// ========================================================================
// Types
// ========================================================================

export type RowStatus =
  | 'complete'
  | 'partial'
  | 'warning'
  | 'critical'
  | 'over_populated'
  | 'error';

export type MatrixRow = {
  session: string;
  table: string;
  description: string;
  expected: number;
  actual: number;
  pct: number;
  status: RowStatus;
};

export type MatrixSummary = {
  totalRows: number;
  complete: number;
  partial: number;
  warning: number;
  critical: number;
  overPopulated: number;
  error: number;
  sessions: Record<string, { complete: number; total: number }>;
};

export type Matrix = {
  timestamp: string;
  rows: MatrixRow[];
  summary: MatrixSummary;
};

export type ClassifyConfig = {
  warningPct: number;
  stopPct: number;
  tolerancePct: number;
};

export const DEFAULT_CLASSIFY_CONFIG: ClassifyConfig = {
  warningPct: COMPLETENESS_WARNING_PCT,
  stopPct: COMPLETENESS_STOP_PCT,
  tolerancePct: COMPLETENESS_TOLERANCE_PCT,
};

export type CliArgs = {
  dryRun: boolean;
  output: 'json' | 'md';
};

// ========================================================================
// CLI parsing (zero deps)
// ========================================================================

export function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let output: 'json' | 'md' = 'json';
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--output=')) {
      const raw = a.slice('--output='.length).trim();
      if (raw === 'json' || raw === 'md') {
        output = raw;
      } else {
        throw new Error(`${TAG} --output inválido: "${a}" (esperado json|md)`);
      }
    }
  }
  return { dryRun, output };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(`${TAG} Falta env var requerida: ${name}`);
  }
  return v;
}

// ========================================================================
// Classifier (pure)
// ========================================================================

export function classifyCompleteness(
  input: { expected: number; actual: number; error?: string | null },
  config: ClassifyConfig = DEFAULT_CLASSIFY_CONFIG,
): RowStatus {
  if (input.error != null && input.error !== '') return 'error';
  if (input.actual < 0) return 'error';
  if (input.expected <= 0) return 'error';

  // Round to 4 decimals to neutralize JS floating-point residue
  // (e.g. (110/100)*100 === 110.00000000000001).
  const pctRaw = (input.actual / input.expected) * 100;
  const pct = Math.round(pctRaw * 10000) / 10000;
  const lowerTol = 100 - config.tolerancePct;
  const upperTol = 100 + config.tolerancePct;

  if (pct > upperTol) return 'over_populated';
  if (pct >= lowerTol && pct <= upperTol) return 'complete';
  if (pct >= config.warningPct && pct < lowerTol) return 'partial';
  if (pct >= config.stopPct && pct < config.warningPct) return 'warning';
  return 'critical';
}

// ========================================================================
// Count queries
// ========================================================================

type CountResult = { actual: number; error: string | null };

export async function countTable(
  supabase: SupabaseClient<Database>,
  tableName: string,
): Promise<CountResult> {
  try {
    if (tableName === BOUNDARY_PSEUDO_TABLE) {
      const { count, error } = await supabase
        .from('zones')
        .select('*', { count: 'exact', head: true })
        .not('boundary', 'is', null);
      if (error) return { actual: -1, error: error.message };
      return { actual: count ?? 0, error: null };
    }
    // Cast runtime string to Database table name. The EXPECTED_COUNTS list
    // is hand-audited against shared/types/database.ts — any mismatch
    // surfaces as `error` status at runtime without breaking the matrix.
    // Use '*' instead of 'id' because some FASE 07.5 tables (colonia_dna_vectors,
    // climate_*) use composite PKs without an `id` column.
    const tableKey = tableName as keyof Database['public']['Tables'];
    const { count, error } = await supabase
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic from() requires widening because the literal union over all table names cannot be narrowed from a variable. The alternative (switch over 18 tables) adds zero safety because the list is already audited.
      .from(tableKey as any)
      .select('*', { count: 'exact', head: true });
    if (error) return { actual: -1, error: error.message };
    return { actual: count ?? 0, error: null };
  } catch (err) {
    return { actual: -1, error: err instanceof Error ? err.message : String(err) };
  }
}

// ========================================================================
// Matrix builder (pure)
// ========================================================================

function roundPct(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildMatrix(
  rows: Array<{
    session: string;
    table: string;
    description: string;
    expected: number;
    actual: number;
    error?: string | null;
  }>,
  timestamp: string,
  config: ClassifyConfig = DEFAULT_CLASSIFY_CONFIG,
): Matrix {
  const matrixRows: MatrixRow[] = rows.map((r) => {
    const status = classifyCompleteness(
      { expected: r.expected, actual: r.actual, error: r.error ?? null },
      config,
    );
    const pct = r.expected > 0 && r.actual >= 0 ? roundPct((r.actual / r.expected) * 100) : 0;
    return {
      session: r.session,
      table: r.table,
      description: r.description,
      expected: r.expected,
      actual: r.actual,
      pct,
      status,
    };
  });

  const summary: MatrixSummary = {
    totalRows: matrixRows.length,
    complete: 0,
    partial: 0,
    warning: 0,
    critical: 0,
    overPopulated: 0,
    error: 0,
    sessions: {},
  };

  for (const row of matrixRows) {
    switch (row.status) {
      case 'complete':
        summary.complete += 1;
        break;
      case 'partial':
        summary.partial += 1;
        break;
      case 'warning':
        summary.warning += 1;
        break;
      case 'critical':
        summary.critical += 1;
        break;
      case 'over_populated':
        summary.overPopulated += 1;
        break;
      case 'error':
        summary.error += 1;
        break;
    }
    const bucket = summary.sessions[row.session] ?? { complete: 0, total: 0 };
    bucket.total += 1;
    if (row.status === 'complete') bucket.complete += 1;
    summary.sessions[row.session] = bucket;
  }

  return { timestamp, rows: matrixRows, summary };
}

// ========================================================================
// Renderers
// ========================================================================

export function renderMarkdown(matrix: Matrix): string {
  const lines: string[] = [];
  lines.push(`# FASE 07.5 Completeness Matrix — ${matrix.timestamp}`);
  lines.push('');
  lines.push('| Sesión | Tabla | Expected | Actual | % | Status |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of matrix.rows) {
    const pctStr = r.pct.toFixed(2);
    lines.push(
      `| ${r.session} | ${r.table} | ${r.expected} | ${r.actual} | ${pctStr} | ${r.status} |`,
    );
  }
  lines.push('');
  lines.push('## Summary');
  lines.push(`- complete: ${matrix.summary.complete}/${matrix.summary.totalRows}`);
  lines.push(`- partial: ${matrix.summary.partial}`);
  lines.push(`- warning: ${matrix.summary.warning}`);
  lines.push(`- critical: ${matrix.summary.critical}`);
  lines.push(`- over_populated: ${matrix.summary.overPopulated}`);
  lines.push(`- error: ${matrix.summary.error}`);
  lines.push('');
  lines.push('## Por sesión');
  const sessionKeys = Object.keys(matrix.summary.sessions).sort();
  for (const key of sessionKeys) {
    const s = matrix.summary.sessions[key];
    if (s == null) continue;
    lines.push(`- ${key}: ${s.complete}/${s.total} complete`);
  }
  return lines.join('\n');
}

// ========================================================================
// Mock data (dry-run)
// ========================================================================

function mockActual(row: ExpectedRow): number {
  // Dry-run mock: return expected value exactly → all rows "complete".
  // Keeps the CLI smokable offline without any BD dependency.
  return row.expected;
}

// ========================================================================
// Orchestration
// ========================================================================

export async function collectActualCounts(
  supabase: SupabaseClient<Database>,
  expected: ReadonlyArray<ExpectedRow>,
): Promise<Array<ExpectedRow & { actual: number; error: string | null }>> {
  const results = await Promise.all(
    expected.map(async (row) => {
      const { actual, error } = await countTable(supabase, row.table);
      return { ...row, actual, error };
    }),
  );
  return results;
}

// ========================================================================
// Main
// ========================================================================

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const timestamp = new Date().toISOString();

  let collected: Array<ExpectedRow & { actual: number; error: string | null }>;

  if (args.dryRun) {
    collected = EXPECTED_COUNTS.map((r) => ({
      ...r,
      actual: mockActual(r),
      error: null,
    }));
  } else {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    collected = await collectActualCounts(supabase, EXPECTED_COUNTS);
  }

  const matrix = buildMatrix(collected, timestamp);

  if (args.output === 'md') {
    console.log(renderMarkdown(matrix));
  } else {
    console.log(JSON.stringify(matrix, null, 2));
  }

  if (matrix.summary.critical > 0 || matrix.summary.error > 0) {
    console.error(
      `${TAG} G4 STOP: completeness critical — critical=${matrix.summary.critical} error=${matrix.summary.error}`,
    );
    return 1;
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err: unknown) => {
      console.error(`${TAG} fatal: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    });
}
