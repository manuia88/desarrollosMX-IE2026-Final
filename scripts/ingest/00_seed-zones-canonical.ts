#!/usr/bin/env node
/**
 * Universal seeder zones desde content/zones/**\/*.json
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/ingest/00_seed-zones-canonical.ts
 *
 * Flags:
 *   --dry-run        Preview sin upsert real. Imprime summary y sale 0.
 *   --country=MX     Filtra entries por country_code (default: sin filtro).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ZoneCountryCode, ZoneEntry } from '../../shared/schemas/zones.ts';
import type { Database } from '../../shared/types/database.ts';
import { loadAllZonesFromContent, seedZonesBatch, topologicalSort } from './lib/zones-loader.ts';

type CliArgs = {
  dryRun: boolean;
  country: ZoneCountryCode | null;
};

type IngestRunInsert = Database['public']['Tables']['ingest_runs']['Insert'];
type IngestRunUpdate = Database['public']['Tables']['ingest_runs']['Update'];

const SOURCE = 'zones_canonical';
const VALID_COUNTRIES: ZoneCountryCode[] = ['MX', 'CO', 'AR', 'BR', 'US', 'XX'];

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let country: ZoneCountryCode | null = null;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).toUpperCase();
      if (!VALID_COUNTRIES.includes(raw as ZoneCountryCode)) {
        throw new Error(
          `[seed-zones] --country inválido: "${raw}". Valores permitidos: ${VALID_COUNTRIES.join(', ')}`,
        );
      }
      country = raw as ZoneCountryCode;
    }
  }
  return { dryRun, country };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(
      `[seed-zones] Falta env var requerida: ${name}. Asegúrate de exportarla antes de correr el script.`,
    );
  }
  return v;
}

function summarizeByScopeType(zones: ZoneEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const z of zones) {
    out[z.scope_type] = (out[z.scope_type] ?? 0) + 1;
  }
  return out;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);

  const contentRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../content/zones',
  );

  console.log(
    `[seed-zones] contentRoot=${contentRoot} dryRun=${args.dryRun} country=${args.country ?? '(all)'}`,
  );

  // Cargar + validar + filtrar + ordenar (puro, sin BD)
  const allZones = await loadAllZonesFromContent(contentRoot);
  const filtered =
    args.country == null ? allZones : allZones.filter((z) => z.country_code === args.country);
  const sorted = topologicalSort(filtered);

  if (args.dryRun) {
    const preview = {
      total: sorted.length,
      by_scope_type: summarizeByScopeType(sorted),
      first_5: sorted.slice(0, 5),
    };
    console.log('[seed-zones] DRY RUN — preview:');
    console.log(JSON.stringify(preview, null, 2));
    return 0;
  }

  // --- Path real: requiere envs + abre cliente admin ---
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const countryCode = args.country ?? 'MX';
  const startedAtMs = Date.now();

  // INSERT ingest_runs (status running)
  const runInsert: IngestRunInsert = {
    source: SOURCE,
    country_code: countryCode,
    status: 'running',
    triggered_by: 'cli:seed-zones',
    meta: {
      script: '00_seed-zones-canonical.ts',
      filter_country: args.country,
      total_entries: sorted.length,
    },
  };

  const { data: runRow, error: runErr } = await supabase
    .from('ingest_runs')
    .insert(runInsert)
    .select('id')
    .single();

  if (runErr || runRow == null) {
    throw new Error(
      `[seed-zones] No se pudo crear ingest_runs row: ${runErr?.message ?? 'unknown'}`,
    );
  }

  const runId: string = runRow.id;
  console.log(`[seed-zones] ingest_run id=${runId}`);

  let finalStatus: 'success' | 'failed' = 'success';
  let finalError: string | null = null;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors: string[] = [];

  try {
    const summary = await seedZonesBatch(supabase, sorted, runId);
    inserted = summary.inserted;
    updated = summary.updated;
    skipped = summary.skipped;
    errors = summary.errors;
    if (errors.length > 0) {
      finalStatus = 'failed';
      finalError = errors.join(' | ');
    }
  } catch (err) {
    finalStatus = 'failed';
    finalError = err instanceof Error ? err.message : String(err);
  } finally {
    const durationMs = Date.now() - startedAtMs;
    const update: IngestRunUpdate = {
      status: finalStatus,
      rows_inserted: inserted,
      rows_updated: updated,
      rows_skipped: skipped,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      error: finalError,
    };
    const { error: updErr } = await supabase.from('ingest_runs').update(update).eq('id', runId);
    if (updErr) {
      console.error(
        `[seed-zones] WARNING: no se pudo actualizar ingest_runs ${runId}: ${updErr.message}`,
      );
    }
  }

  const output = {
    run_id: runId,
    status: finalStatus,
    total_entries: sorted.length,
    inserted,
    updated,
    skipped,
    errors,
  };
  console.log(JSON.stringify(output, null, 2));

  return finalStatus === 'success' ? 0 : 1;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error('[seed-zones] FATAL:', err);
    process.exit(1);
  });
