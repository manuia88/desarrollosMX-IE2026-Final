#!/usr/bin/env node
/**
 * Batch compute los 14 DMX zone-scope indices (IPV, IAB, IDS, IRE, ICO, MOM,
 * LIV, FAM, YNG, GRN, STR, DEV, GNT, STA) para TODAS las zones MX registradas
 * en public.zones (scope_type ∈ colonia/alcaldia/city/estado). INV es project-
 * scope y queda OUT del batch zone.
 *
 * Estrategia SESIÓN 07.5.B:
 *  - Wrapper sobre calculateAllIndicesForScope() orchestrator (frozen).
 *  - Persistencia UPSERT a public.dmx_indices via orchestrator interno.
 *  - Segundo pass: ranking_in_scope + percentile por index_code + period_date
 *    + country_code + period_type (monthly), sort desc por value.
 *  - withIngestRun envuelve todo con source='compute_dmx_indices'.
 *  - Filtra scope_type='country' (no cabe en dmx_indices CHECK).
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/compute/06_compute-dmx-indices.ts
 *
 * Flags:
 *   --dry-run         Log preview sin mutar dmx_indices. NO UPSERT.
 *   --limit=N         Procesa sólo N zones (default: 500 cap).
 *   --country=XX      ISO country code (default: MX).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  calculateAllIndicesForScope,
  type IndexScope,
  type OrchestratorOptions,
} from '../../shared/lib/intelligence-engine/calculators/indices/orchestrator.ts';
import type { Database } from '../../shared/types/database.ts';
import { withIngestRun } from '../ingest/lib/ingest-run-helper.ts';

type CliArgs = {
  dryRun: boolean;
  limit: number | null;
  country: string;
};

type ZoneRow = {
  id: string;
  scope_id: string;
  scope_type: string;
  country_code: string;
};

type LooseClient = SupabaseClient<Record<string, unknown>>;

const DEFAULT_COUNTRY = 'MX';
const DEFAULT_LIMIT = 500;
const DEFAULT_PERIOD_TYPE = 'monthly';
const SCOPE_TYPE_ZONE: IndexScope = 'zone';
const SOURCE = 'compute_dmx_indices';

const VALID_DMX_SCOPE_TYPES: readonly string[] = ['colonia', 'alcaldia', 'city', 'estado'];

const ZONE_INDEX_CODES: readonly string[] = [
  'IPV',
  'IAB',
  'IDS',
  'IRE',
  'ICO',
  'MOM',
  'LIV',
  'FAM',
  'YNG',
  'GRN',
  'STR',
  'DEV',
  'GNT',
  'STA',
];

const INDICES_PER_ZONE = ZONE_INDEX_CODES.length;

function looseFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

export function computePeriodDate(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limit: number | null = null;
  let country = DEFAULT_COUNTRY;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-dmx] --limit inválido: "${a}"`);
      }
      limit = n;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).trim().toUpperCase();
      if (raw === '' || raw.length !== 2) {
        throw new Error(`[compute-dmx] --country inválido: "${a}"`);
      }
      country = raw;
    }
  }
  return { dryRun, limit, country };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(`[compute-dmx] Falta env var requerida: ${name}. Exportala antes de correr.`);
  }
  return v;
}

export async function fetchZonesForCompute(
  supabase: SupabaseClient<Database>,
  country: string,
  limit: number,
): Promise<ZoneRow[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, scope_id, scope_type, country_code')
    .eq('country_code', country)
    .in('scope_type', VALID_DMX_SCOPE_TYPES as string[])
    .order('scope_id', { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`[compute-dmx] zones fetch: ${error.message}`);
  }
  return (data ?? []) as ZoneRow[];
}

export async function rankIndexScope(
  supabase: SupabaseClient,
  indexCode: string,
  periodDate: string,
  countryCode: string,
  periodType: string,
): Promise<number> {
  const { data, error } = await looseFrom(supabase, 'dmx_indices')
    .select('id, value')
    .eq('index_code', indexCode)
    .eq('country_code', countryCode)
    .eq('period_date', periodDate)
    .eq('period_type', periodType)
    .eq('is_shadow', false)
    .order('value', { ascending: false });
  if (error || !data) return 0;
  const rows = data as unknown as Array<{ id: string; value: number }>;
  const total = rows.length;
  if (total === 0) return 0;
  let updated = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const position = i + 1;
    const percentile = Number((((total - position) / total) * 100).toFixed(2));
    const upd = await looseFrom(supabase, 'dmx_indices')
      .update({ ranking_in_scope: position, percentile } as never)
      .eq('id', r.id);
    if (!upd.error) updated++;
  }
  return updated;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const tag = '[compute-dmx]';
  const limit = args.limit ?? DEFAULT_LIMIT;
  console.log(`${tag} dryRun=${args.dryRun} country=${args.country} limit=${limit}`);

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const periodDate = computePeriodDate();
  const zones = await fetchZonesForCompute(supabase, args.country, limit);
  console.log(`${tag} zones_matched=${zones.length} period_date=${periodDate}`);

  if (zones.length === 0) {
    console.warn(`${tag} No hay zones válidas para country=${args.country}. Exit clean.`);
    return 0;
  }

  if (args.dryRun) {
    console.log(
      `${tag} DRY RUN — would process ${zones.length} zones × ${INDICES_PER_ZONE} indices = ${zones.length * INDICES_PER_ZONE} calls`,
    );
    return 0;
  }

  const orchestratorOptions: OrchestratorOptions = { shadowMode: false, auditLog: false };

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: args.country,
      triggeredBy: 'cli:compute-dmx-indices',
      expectedPeriodicity: 'on_demand',
      meta: {
        script: '06_compute-dmx-indices.ts',
        zones_total: zones.length,
        period_date: periodDate,
        indices_per_zone: INDICES_PER_ZONE,
      },
    },
    async () => {
      let updated = 0;
      const skipped = 0;
      let dlq = 0;
      for (const zone of zones) {
        try {
          const br = await calculateAllIndicesForScope({
            scopeType: SCOPE_TYPE_ZONE,
            scopeId: zone.scope_id,
            periodDate,
            countryCode: args.country,
            supabase,
            dmxScopeType: zone.scope_type,
            periodType: DEFAULT_PERIOD_TYPE,
            options: orchestratorOptions,
          });
          updated += br.succeeded;
          dlq += br.failed;
        } catch (e) {
          dlq += INDICES_PER_ZONE;
          console.error(
            `${tag} throw zone=${zone.scope_id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      let ranked = 0;
      for (const code of ZONE_INDEX_CODES) {
        ranked += await rankIndexScope(
          supabase,
          code,
          periodDate,
          args.country,
          DEFAULT_PERIOD_TYPE,
        );
      }
      console.log(`${tag} ranking pass done — rows_updated=${ranked}`);

      return {
        counts: { inserted: 0, updated, skipped, dlq },
        lastSuccessfulPeriodEnd: periodDate,
      };
    },
  );

  console.log(
    `${tag} done: status=${result.status} counts=${JSON.stringify(result.counts)} duration_ms=${result.durationMs}`,
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
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error('[compute-dmx] FATAL:', err);
      process.exit(1);
    });
}
