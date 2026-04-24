#!/usr/bin/env node
/**
 * Compute batch IE — Nivel 1 (category='zona', country='MX') sobre todas las
 * zonas en public.zones. Invoca runScore() por (score, zone) y persiste vía
 * persistZoneScore transparente. Un solo ingest_runs envuelve la corrida
 * completa vía withIngestRun (source='compute_ie_n1').
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/compute/02_compute-n1.ts
 *
 * Flags:
 *   --dry-run       Log score_ids + conteo zones. NO ejecuta runScore ni persiste.
 *   --limit=N       Procesa sólo las primeras N zonas (default: 500).
 *   --country=XX    Filtra zones.country_code (default: 'MX').
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { registerN1Calculators } from '../../shared/lib/intelligence-engine/calculators/n1/index.ts';
import { runScore } from '../../shared/lib/intelligence-engine/calculators/run-score.ts';
import {
  SCORE_REGISTRY,
  type ScoreRegistryEntry,
} from '../../shared/lib/intelligence-engine/score-registry.ts';
import type { Database, Json } from '../../shared/types/database.ts';
import { withIngestRun } from '../ingest/lib/ingest-run-helper.ts';

const LEVEL = 1 as const;
const SOURCE = 'compute_ie_n1';
const SCRIPT_NAME = '02_compute-n1.ts';
const DEFAULT_COUNTRY = 'MX';
const DEFAULT_LIMIT = 500;

export type ComputeZoneRow = {
  id: string;
  scope_id: string;
  scope_type: string;
  country_code: string;
};

export type ProcessBatchCounts = {
  inserted: number;
  updated: number;
  skipped: number;
  dlq: number;
};

type CliArgs = {
  dryRun: boolean;
  limit: number;
  country: string;
};

export function computePeriodDate(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function filterRegistry(level: number, country: string): ScoreRegistryEntry[] {
  return SCORE_REGISTRY.filter(
    (e) => e.level === level && e.category === 'zona' && e.country_codes.includes(country),
  );
}

function parseArgs(argv: readonly string[]): CliArgs {
  let dryRun = false;
  let limit = DEFAULT_LIMIT;
  let country = DEFAULT_COUNTRY;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-n1] --limit inválido: "${a}"`);
      }
      limit = n;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).trim();
      if (raw.length !== 2) {
        throw new Error(`[compute-n1] --country inválido (ISO-3166-1 alpha-2): "${a}"`);
      }
      country = raw.toUpperCase();
    }
  }
  return { dryRun, limit, country };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(`[compute-n1] Falta env var requerida: ${name}. Exportala antes de correr.`);
  }
  return v;
}

export async function processBatch(
  zones: readonly ComputeZoneRow[],
  targetScores: readonly ScoreRegistryEntry[],
  supabase: SupabaseClient<Database>,
  periodDate: string,
  countryCode: string,
): Promise<ProcessBatchCounts> {
  const counts: ProcessBatchCounts = { inserted: 0, updated: 0, skipped: 0, dlq: 0 };
  for (const zone of zones) {
    for (const reg of targetScores) {
      try {
        const res = await runScore(
          reg.score_id,
          { zoneId: zone.id, countryCode, periodDate },
          supabase,
          { skipEnqueueCascade: true, skipAnomalyCheck: true },
        );
        if (res.kind === 'ok') {
          counts.updated += 1;
        } else if (res.kind === 'gated' || res.kind === 'tenant_violation') {
          counts.skipped += 1;
        } else {
          counts.dlq += 1;
          console.error(
            `[compute-n1] err ${reg.score_id}/${zone.scope_id}: ${res.kind === 'error' ? res.error : 'unknown'}`,
          );
        }
      } catch (e) {
        counts.dlq += 1;
        console.error(
          `[compute-n1] throw ${reg.score_id}/${zone.scope_id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
  return counts;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const targetScores = filterRegistry(LEVEL, args.country);

  registerN1Calculators();

  if (args.dryRun) {
    console.log(
      `[compute-n1] DRY RUN — would process ${targetScores.length} scores × zones (limit=${args.limit}, country=${args.country})`,
    );
    console.log(`  score_ids: ${targetScores.map((s) => s.score_id).join(',')}`);
    return 0;
  }

  const supabase: SupabaseClient<Database> = createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: zones, error } = await supabase
    .from('zones')
    .select('id, scope_id, scope_type, country_code')
    .eq('country_code', args.country)
    .limit(args.limit);
  if (error || !zones) {
    throw new Error(`[compute-n1] zones fetch failed: ${error?.message ?? 'unknown'}`);
  }

  const periodDate = computePeriodDate();
  const typedZones = zones as ComputeZoneRow[];

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: args.country,
      triggeredBy: 'cli:compute-n1',
      expectedPeriodicity: 'on_demand',
      meta: {
        script: SCRIPT_NAME,
        zones_total: typedZones.length,
        scores_total: targetScores.length,
        period_date: periodDate,
      } as Json,
    },
    async () => {
      const counts = await processBatch(
        typedZones,
        targetScores,
        supabase,
        periodDate,
        args.country,
      );
      return { counts, lastSuccessfulPeriodEnd: periodDate };
    },
  );

  console.log(
    `[compute-n1] done: status=${result.status} counts=${JSON.stringify(result.counts)} duration_ms=${result.durationMs}`,
  );
  return result.status === 'success' ? 0 : 1;
}

const invokedAsScript =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedAsScript) {
  main()
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
