#!/usr/bin/env node
/**
 * Compute batch N3 — itera zones CDMX × scores {level=3, category='zona', MX}
 * y persiste via runScore() → persistZoneScore built-in. Log en ingest_runs
 * via withIngestRun. H1: registry actual no declara zona-level en N3, el script
 * succeed con counts {0,0,0,0} y marca status='success' (defensivo futuro).
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/compute/04_compute-n3.ts
 *
 * Flags:
 *   --dry-run             Solo lista scores y cuenta zones. NO calcula ni persiste.
 *   --limit=N             Procesa sólo N zones (default: ALL).
 *   --country=MX          Country code (default: MX).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { registerN3Calculators } from '../../shared/lib/intelligence-engine/calculators/n3/index.ts';
import { runScore } from '../../shared/lib/intelligence-engine/calculators/run-score.ts';
import {
  SCORE_REGISTRY,
  type ScoreRegistryEntry,
} from '../../shared/lib/intelligence-engine/score-registry.ts';
import type { Database, Json } from '../../shared/types/database.ts';
import { withIngestRun } from '../ingest/lib/ingest-run-helper.ts';

const LEVEL = 3 as const;
const CATEGORY = 'zona' as const;
const DEFAULT_COUNTRY = 'MX';
const SOURCE = 'compute_ie_n3';
const TRIGGERED_BY = 'cli:compute-n3';

export type CliArgs = {
  dryRun: boolean;
  limit: number | null;
  country: string;
};

export type ZoneRow = {
  id: string;
  scope_id: string;
};

export type BatchCounts = {
  inserted: number;
  updated: number;
  skipped: number;
  dlq: number;
};

export function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limit: number | null = null;
  let country = DEFAULT_COUNTRY;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-n3] --limit inválido: "${a}"`);
      }
      limit = n;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).trim();
      if (raw.length === 0) {
        throw new Error('[compute-n3] --country vacío');
      }
      country = raw;
    }
  }
  return { dryRun, limit, country };
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(`[compute-n3] Falta env var requerida: ${name}. Exportala antes de correr.`);
  }
  return v;
}

export function computePeriodDate(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

export function filterTargetScores(country: string): readonly ScoreRegistryEntry[] {
  return SCORE_REGISTRY.filter(
    (e) => e.level === LEVEL && e.category === CATEGORY && e.country_codes.includes(country),
  );
}

async function fetchZones(
  supabase: SupabaseClient<Database>,
  country: string,
  limit: number | null,
): Promise<ZoneRow[]> {
  let query = supabase
    .from('zones')
    .select('id, scope_id')
    .eq('country_code', country)
    .order('scope_id', { ascending: true });
  if (limit != null) {
    query = query.limit(limit);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`[compute-n3] fetch zones: ${error.message}`);
  }
  return (data ?? []) as ZoneRow[];
}

export async function processBatch(
  zones: readonly ZoneRow[],
  targetScores: readonly ScoreRegistryEntry[],
  supabase: SupabaseClient<Database>,
  periodDate: string,
  country: string,
): Promise<BatchCounts> {
  const counts: BatchCounts = { inserted: 0, updated: 0, skipped: 0, dlq: 0 };
  for (const zone of zones) {
    for (const entry of targetScores) {
      try {
        const result = await runScore(
          entry.score_id,
          { zoneId: zone.id, countryCode: country, periodDate },
          supabase as unknown as SupabaseClient,
          { skipEnqueueCascade: true, skipAnomalyCheck: true },
        );
        if (result.kind === 'ok') {
          counts.updated += 1;
        } else if (result.kind === 'gated' || result.kind === 'tenant_violation') {
          counts.skipped += 1;
        } else {
          counts.dlq += 1;
          console.error(
            `[compute-n3] error score_id=${entry.score_id} scope_id=${zone.scope_id}: ${result.error}`,
          );
        }
      } catch (err) {
        counts.dlq += 1;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[compute-n3] thrown score_id=${entry.score_id} scope_id=${zone.scope_id}: ${msg}`,
        );
      }
    }
  }
  return counts;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const tag = '[compute-n3]';

  const targetScores = filterTargetScores(args.country);
  registerN3Calculators();

  console.log(
    `${tag} dryRun=${args.dryRun} limit=${args.limit ?? '(all)'} country=${args.country} targets=${targetScores.length} [${targetScores.map((e) => e.score_id).join(',')}]`,
  );

  if (args.dryRun) {
    console.log(`${tag} DRY RUN — ${targetScores.length} scores`);
    return 0;
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const zones = await fetchZones(supabase, args.country, args.limit);
  console.log(`${tag} zones=${zones.length}`);

  const periodDate = computePeriodDate();

  if (targetScores.length === 0) {
    console.log(
      `${tag} no zona-level scores at level ${LEVEL}; skipping. writing empty success run`,
    );
  }

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: args.country,
      triggeredBy: TRIGGERED_BY,
      expectedPeriodicity: 'monthly',
      meta: {
        script: '04_compute-n3.ts',
        level: LEVEL,
        category: CATEGORY,
        period_date: periodDate,
        target_score_ids: targetScores.map((e) => e.score_id),
        zones_count: zones.length,
        limit: args.limit,
      } as Json,
      upsertWatermarkOnSuccess: false,
    },
    async () => {
      if (targetScores.length === 0 || zones.length === 0) {
        return {
          counts: { inserted: 0, updated: 0, skipped: 0, dlq: 0 },
          lastSuccessfulPeriodEnd: periodDate,
        };
      }
      const counts = await processBatch(zones, targetScores, supabase, periodDate, args.country);
      return { counts, lastSuccessfulPeriodEnd: periodDate };
    },
  );

  const output = {
    run_id: result.runId,
    status: result.status,
    counts: result.counts,
    duration_ms: result.durationMs,
    error: result.error,
    zones_count: zones.length,
    target_score_ids: targetScores.map((e) => e.score_id),
  };
  console.log(JSON.stringify(output, null, 2));

  return result.status === 'success' ? 0 : 1;
}

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
      console.error('[compute-n3] FATAL:', err);
      process.exit(1);
    });
}

export { main };
