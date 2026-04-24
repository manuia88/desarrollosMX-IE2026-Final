#!/usr/bin/env node
/**
 * Populate public.inegi_census_zone_stats + public.enigh_zone_income para cada
 * zona scope_type='colonia' country_code='MX' (210 filas base H1 CDMX).
 *
 * Estrategia H1 (SESIÓN 07.5.A):
 *  - INEGI Censo 2020 + ENIGH 2022 NO exponen REST per-colonia (solo AGEB agregado
 *    con procesamiento pesado de microdatos). Para desbloquear los bloques IE
 *    downstream sin bloquear por falta de fuente oficial:
 *      → Baseline determinístico synthetic v1 calibrado a patrones promedio CDMX.
 *      → Seed = zones.scope_id (string estable) ⇒ mismo output bit-exact en re-runs.
 *      → NO usar como ground truth; estrictamente fallback hasta ingest MGN/AGEB real.
 *  - Dos `withIngestRun` secuenciales (skippables por --source): inegi_census, inegi_enigh.
 *  - Snapshot dates: census '2020-12-31', enigh '2022-12-31'.
 *  - Upsert chunks 100 con onConflict='zone_id,snapshot_date' por tabla.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/ingest/03_ingest-demographics.ts
 *
 * Flags:
 *   --dry-run                    Log preview primeras 3 zones por source. NO UPSERT.
 *   --limit=N                    Procesa sólo N colonias (default: ALL 210).
 *   --source=census|enigh|all    Default: 'all'.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../shared/types/database.ts';
import { withIngestRun } from './lib/ingest-run-helper.ts';

type CensusInsert = Database['public']['Tables']['inegi_census_zone_stats']['Insert'];
type EnighInsert = Database['public']['Tables']['enigh_zone_income']['Insert'];

type SourceKey = 'census' | 'enigh';

type CliArgs = {
  dryRun: boolean;
  limit: number | null;
  sourceFilter: SourceKey[] | null;
};

type ZoneRow = {
  id: string;
  scope_id: string;
};

type SourceRunSummary = {
  run_id: string;
  status: string;
  inserted: number;
  updated: number;
  skipped: number;
  dlq: number;
  error: string | null;
  duration_ms: number;
};

const COUNTRY = 'MX';
const SCOPE_TYPE = 'colonia';
const CHUNK_SIZE = 100;
const CENSUS_SNAPSHOT = '2020-12-31';
const ENIGH_SNAPSHOT = '2022-12-31';

const ALL_SOURCES: SourceKey[] = ['census', 'enigh'];

// --------------------------------------------------------------------------
// Canonical distributions base (CDMX-calibrated synthetic v1)
// --------------------------------------------------------------------------

const PROFESSIONS_CANONICAL = [
  'servicios_profesionales',
  'comercio',
  'educacion',
  'salud',
  'construccion',
  'manufactura',
  'transporte',
  'hosteleria',
  'tecnologia',
  'gobierno',
] as const;
type ProfessionCanonical = (typeof PROFESSIONS_CANONICAL)[number];

const PROFESSION_BASE_PERCENT: Readonly<Record<ProfessionCanonical, number>> = {
  servicios_profesionales: 18,
  comercio: 22,
  educacion: 9,
  salud: 7,
  construccion: 8,
  manufactura: 11,
  transporte: 6,
  hosteleria: 6,
  tecnologia: 8,
  gobierno: 5,
};

const AGE_GROUPS_CANONICAL = ['0-14', '15-29', '30-44', '45-59', '60-74', '75+'] as const;
type AgeGroupCanonical = (typeof AGE_GROUPS_CANONICAL)[number];

const AGE_BASE_PERCENT: Readonly<Record<AgeGroupCanonical, number>> = {
  '0-14': 22,
  '15-29': 25,
  '30-44': 22,
  '45-59': 16,
  '60-74': 10,
  '75+': 5,
};

const SALARY_BRACKETS_CANONICAL = [
  '0-7500',
  '7500-15000',
  '15000-30000',
  '30000-60000',
  '60000+',
] as const;
type SalaryBracketCanonical = (typeof SALARY_BRACKETS_CANONICAL)[number];

const SALARY_BASE_PERCENT: Readonly<Record<SalaryBracketCanonical, number>> = {
  '0-7500': 18,
  '7500-15000': 28,
  '15000-30000': 30,
  '30000-60000': 16,
  '60000+': 8,
};

// Midpoints MXN mensuales para weighted average. Último bracket midpoint = 90000.
const SALARY_MIDPOINT_MXN: Readonly<Record<SalaryBracketCanonical, number>> = {
  '0-7500': 3750,
  '7500-15000': 11250,
  '15000-30000': 22500,
  '30000-60000': 45000,
  '60000+': 90000,
};

const JITTER_AMPLITUDE = 5; // ± puntos porcentuales

// --------------------------------------------------------------------------
// Funciones puras (exportadas para tests)
// --------------------------------------------------------------------------

/**
 * FNV-1a 32-bit hash. Determinístico y estable cross-run.
 */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) * 16777619;
    h = h >>> 0; // force uint32
  }
  return h >>> 0;
}

/**
 * Convierte (scopeId, step) a número determinístico en [0, 1).
 */
export function seedToUnit(s: string, step: string): number {
  const h = hashSeed(`${s}::${step}`);
  return (h % 10_000) / 10_000;
}

/**
 * Produce jitter determinístico en rango [-amplitude, +amplitude] puntos porcentuales.
 */
function jitterFor(scopeId: string, step: string, amplitude: number): number {
  const u = seedToUnit(scopeId, step); // [0, 1)
  return (u * 2 - 1) * amplitude; // [-amp, +amp)
}

/**
 * Renormaliza percentages para que sumen exactamente 100.
 * Clamp a 0 mínimo antes de renormalizar.
 * Devuelve copia nueva preservando el orden.
 */
function renormalizeToHundred(values: number[]): number[] {
  const clamped = values.map((v) => (v < 0 ? 0 : v));
  const sum = clamped.reduce((acc, v) => acc + v, 0);
  if (sum === 0) {
    // degenerate: reparte uniforme
    const each = 100 / clamped.length;
    return clamped.map(() => each);
  }
  const scale = 100 / sum;
  const scaled = clamped.map((v) => v * scale);
  // Rounding a 2 decimales y corrección del residuo en el último elemento
  // para asegurar suma exacta 100 (±0.01 tolerance por float ops).
  const rounded = scaled.map((v) => Math.round(v * 100) / 100);
  const roundedSum = rounded.reduce((acc, v) => acc + v, 0);
  const residual = Math.round((100 - roundedSum) * 100) / 100;
  if (rounded.length > 0 && residual !== 0) {
    const lastIdx = rounded.length - 1;
    const lastVal = rounded[lastIdx] ?? 0;
    rounded[lastIdx] = Math.round((lastVal + residual) * 100) / 100;
  }
  return rounded;
}

/**
 * Distribución de profesiones (10 entries, suma 100) determinística por scopeId.
 */
export function generateProfessionDistribution(
  scopeId: string,
): Array<{ profession: string; percentage: number }> {
  const withJitter = PROFESSIONS_CANONICAL.map((p) => {
    const base = PROFESSION_BASE_PERCENT[p];
    const jit = jitterFor(scopeId, `profession::${p}`, JITTER_AMPLITUDE);
    return base + jit;
  });
  const normalized = renormalizeToHundred(withJitter);
  return PROFESSIONS_CANONICAL.map((p, i) => ({
    profession: p,
    percentage: normalized[i] ?? 0,
  }));
}

/**
 * Distribución etaria (6 brackets, suma 100) determinística por scopeId.
 */
export function generateAgeDistribution(
  scopeId: string,
): Array<{ age_group: string; percentage: number }> {
  const withJitter = AGE_GROUPS_CANONICAL.map((g) => {
    const base = AGE_BASE_PERCENT[g];
    const jit = jitterFor(scopeId, `age::${g}`, JITTER_AMPLITUDE);
    return base + jit;
  });
  const normalized = renormalizeToHundred(withJitter);
  return AGE_GROUPS_CANONICAL.map((g, i) => ({
    age_group: g,
    percentage: normalized[i] ?? 0,
  }));
}

/**
 * Argmax: profesión con mayor percentage. En caso de empate gana la primera según PROFESSIONS_CANONICAL.
 */
function pickDominantProfession(
  distribution: Array<{ profession: string; percentage: number }>,
): string {
  let bestIdx = 0;
  let bestPct = -Infinity;
  for (let i = 0; i < distribution.length; i++) {
    const entry = distribution[i];
    if (entry == null) continue;
    if (entry.percentage > bestPct) {
      bestPct = entry.percentage;
      bestIdx = i;
    }
  }
  const winner = distribution[bestIdx];
  return winner?.profession ?? PROFESSIONS_CANONICAL[0];
}

/**
 * Datos census completos por zona.
 */
export function generateCensusForZone(scopeId: string): {
  profession_distribution: Array<{ profession: string; percentage: number }>;
  age_distribution: Array<{ age_group: string; percentage: number }>;
  dominant_profession: string;
} {
  const profession_distribution = generateProfessionDistribution(scopeId);
  const age_distribution = generateAgeDistribution(scopeId);
  const dominant_profession = pickDominantProfession(profession_distribution);
  return { profession_distribution, age_distribution, dominant_profession };
}

/**
 * Distribución salarial (5 brackets, suma 100) determinística por scopeId.
 */
export function generateSalaryRangeDistribution(
  scopeId: string,
): Array<{ bracket: string; percentage: number }> {
  const withJitter = SALARY_BRACKETS_CANONICAL.map((b) => {
    const base = SALARY_BASE_PERCENT[b];
    const jit = jitterFor(scopeId, `salary::${b}`, JITTER_AMPLITUDE);
    return base + jit;
  });
  const normalized = renormalizeToHundred(withJitter);
  return SALARY_BRACKETS_CANONICAL.map((b, i) => ({
    bracket: b,
    percentage: normalized[i] ?? 0,
  }));
}

/**
 * Weighted average MXN mensual usando midpoints por bracket. Round a entero.
 * Si bracket no reconocido, lo ignora.
 */
export function computeMedianSalaryMxn(
  distribution: Array<{ bracket: string; percentage: number }>,
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const entry of distribution) {
    const mid = SALARY_MIDPOINT_MXN[entry.bracket as SalaryBracketCanonical];
    if (mid == null) continue;
    weightedSum += mid * entry.percentage;
    totalWeight += entry.percentage;
  }
  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Datos ENIGH completos por zona.
 */
export function generateEnighForZone(scopeId: string): {
  salary_range_distribution: Array<{ bracket: string; percentage: number }>;
  median_salary_mxn: number;
} {
  const salary_range_distribution = generateSalaryRangeDistribution(scopeId);
  const median_salary_mxn = computeMedianSalaryMxn(salary_range_distribution);
  return { salary_range_distribution, median_salary_mxn };
}

// --------------------------------------------------------------------------
// CLI plumbing + main
// --------------------------------------------------------------------------

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limit: number | null = null;
  let sourceFilter: SourceKey[] | null = null;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[ingest:demographics] --limit inválido: "${a}"`);
      }
      limit = n;
    } else if (a.startsWith('--source=')) {
      const raw = a.slice('--source='.length).trim();
      if (raw === '' || raw === 'all') {
        sourceFilter = null;
        continue;
      }
      const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const invalid = parts.filter((p) => !ALL_SOURCES.includes(p as SourceKey));
      if (invalid.length > 0) {
        throw new Error(
          `[ingest:demographics] --source inválido: "${invalid.join(', ')}". Valores: ${ALL_SOURCES.join(', ')}, all`,
        );
      }
      sourceFilter = parts as SourceKey[];
    }
  }
  return { dryRun, limit, sourceFilter };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(
      `[ingest:demographics] Falta env var requerida: ${name}. Exportala antes de correr.`,
    );
  }
  return v;
}

async function fetchColoniaZones(
  supabase: SupabaseClient<Database>,
  limit: number | null,
): Promise<ZoneRow[]> {
  let query = supabase
    .from('zones')
    .select('id, scope_id')
    .eq('country_code', COUNTRY)
    .eq('scope_type', SCOPE_TYPE)
    .order('scope_id', { ascending: true });
  if (limit != null) {
    query = query.limit(limit);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`[ingest:demographics] fetch zones: ${error.message}`);
  }
  return (data ?? []) as ZoneRow[];
}

async function upsertCensusInChunks(
  supabase: SupabaseClient<Database>,
  rows: CensusInsert[],
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('inegi_census_zone_stats')
      .upsert(chunk, { onConflict: 'zone_id,snapshot_date' });
    if (error) {
      throw new Error(
        `upsert inegi_census_zone_stats chunk[${i}..${i + chunk.length}]: ${error.message}`,
      );
    }
    written += chunk.length;
  }
  return written;
}

async function upsertEnighInChunks(
  supabase: SupabaseClient<Database>,
  rows: EnighInsert[],
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('enigh_zone_income')
      .upsert(chunk, { onConflict: 'zone_id,snapshot_date' });
    if (error) {
      throw new Error(
        `upsert enigh_zone_income chunk[${i}..${i + chunk.length}]: ${error.message}`,
      );
    }
    written += chunk.length;
  }
  return written;
}

async function runCensusSource(
  supabase: SupabaseClient<Database>,
  args: CliArgs,
  zones: ZoneRow[],
): Promise<SourceRunSummary> {
  const tag = '[ingest:demographics]';

  const result = await withIngestRun(
    supabase,
    {
      source: 'inegi_census',
      countryCode: COUNTRY,
      triggeredBy: 'cli:ingest-demographics',
      expectedPeriodicity: 'yearly',
      meta: {
        script: '03_ingest-demographics.ts',
        dry_run: args.dryRun,
        snapshot_date: CENSUS_SNAPSHOT,
        strategy: 'fallback:synthetic-v1',
        calibrated_to: 'cdmx-average-baseline',
        not_ground_truth: true,
        limit: args.limit,
      } as Json,
      upsertWatermarkOnSuccess: !args.dryRun,
    },
    async () => {
      const rows: CensusInsert[] = zones.map((z) => {
        const data = generateCensusForZone(z.scope_id);
        return {
          zone_id: z.id,
          snapshot_date: CENSUS_SNAPSHOT,
          profession_distribution: data.profession_distribution as unknown as Json,
          age_distribution: data.age_distribution as unknown as Json,
          dominant_profession: data.dominant_profession,
        };
      });

      if (args.dryRun) {
        console.log(`${tag} census dry-run: ${rows.length} rows. preview (3):`);
        console.log(JSON.stringify(rows.slice(0, 3), null, 2));
        return {
          counts: { inserted: 0, updated: 0, skipped: rows.length },
          lastSuccessfulPeriodEnd: CENSUS_SNAPSHOT,
        };
      }

      const written = await upsertCensusInChunks(supabase, rows);
      console.log(`${tag} census upserted=${written}`);
      return {
        counts: { inserted: written, updated: 0, skipped: 0 },
        lastSuccessfulPeriodEnd: CENSUS_SNAPSHOT,
      };
    },
  );

  return {
    run_id: result.runId,
    status: result.status,
    inserted: result.counts.inserted,
    updated: result.counts.updated,
    skipped: result.counts.skipped,
    dlq: result.counts.dlq ?? 0,
    error: result.error,
    duration_ms: result.durationMs,
  };
}

async function runEnighSource(
  supabase: SupabaseClient<Database>,
  args: CliArgs,
  zones: ZoneRow[],
): Promise<SourceRunSummary> {
  const tag = '[ingest:demographics]';

  const result = await withIngestRun(
    supabase,
    {
      source: 'inegi_enigh',
      countryCode: COUNTRY,
      triggeredBy: 'cli:ingest-demographics',
      expectedPeriodicity: 'yearly',
      meta: {
        script: '03_ingest-demographics.ts',
        dry_run: args.dryRun,
        snapshot_date: ENIGH_SNAPSHOT,
        strategy: 'fallback:synthetic-v1',
        calibrated_to: 'cdmx-average-baseline',
        not_ground_truth: true,
        limit: args.limit,
      } as Json,
      upsertWatermarkOnSuccess: !args.dryRun,
    },
    async () => {
      const rows: EnighInsert[] = zones.map((z) => {
        const data = generateEnighForZone(z.scope_id);
        return {
          zone_id: z.id,
          snapshot_date: ENIGH_SNAPSHOT,
          salary_range_distribution: data.salary_range_distribution as unknown as Json,
          median_salary_mxn: data.median_salary_mxn,
        };
      });

      if (args.dryRun) {
        console.log(`${tag} enigh dry-run: ${rows.length} rows. preview (3):`);
        console.log(JSON.stringify(rows.slice(0, 3), null, 2));
        return {
          counts: { inserted: 0, updated: 0, skipped: rows.length },
          lastSuccessfulPeriodEnd: ENIGH_SNAPSHOT,
        };
      }

      const written = await upsertEnighInChunks(supabase, rows);
      console.log(`${tag} enigh upserted=${written}`);
      return {
        counts: { inserted: written, updated: 0, skipped: 0 },
        lastSuccessfulPeriodEnd: ENIGH_SNAPSHOT,
      };
    },
  );

  return {
    run_id: result.runId,
    status: result.status,
    inserted: result.counts.inserted,
    updated: result.counts.updated,
    skipped: result.counts.skipped,
    dlq: result.counts.dlq ?? 0,
    error: result.error,
    duration_ms: result.durationMs,
  };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const tag = '[ingest:demographics]';

  const sources: SourceKey[] = args.sourceFilter ?? ALL_SOURCES;

  console.log(
    `${tag} dryRun=${args.dryRun} limit=${args.limit ?? '(all)'} sources=${sources.join(',')}`,
  );

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const zones = await fetchColoniaZones(supabase, args.limit);
  console.log(`${tag} zones found=${zones.length}`);

  if (zones.length === 0) {
    console.warn(`${tag} No hay colonias scope_type='${SCOPE_TYPE}' country_code='${COUNTRY}'.`);
  }

  const runsSummary: Record<SourceKey, SourceRunSummary | null> = {
    census: null,
    enigh: null,
  };

  let globalStatus: 'success' | 'failed' | 'partial' = 'success';

  if (sources.includes('census')) {
    runsSummary.census = await runCensusSource(supabase, args, zones);
    if (runsSummary.census.status === 'failed') globalStatus = 'failed';
  }

  if (sources.includes('enigh')) {
    runsSummary.enigh = await runEnighSource(supabase, args, zones);
    if (runsSummary.enigh.status === 'failed') globalStatus = 'failed';
  }

  const output = {
    dry_run: args.dryRun,
    global_status: globalStatus,
    zones_count: zones.length,
    runs_summary: runsSummary,
  };
  console.log(JSON.stringify(output, null, 2));

  return globalStatus === 'failed' ? 1 : 0;
}

// Guard: sólo ejecuta main() cuando el módulo es el entry point (no al importar desde tests).
const invokedAsScript =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedAsScript) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error('[ingest:demographics] FATAL:', err);
      process.exit(1);
    });
}
