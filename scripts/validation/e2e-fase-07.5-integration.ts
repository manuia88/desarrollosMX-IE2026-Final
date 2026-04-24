#!/usr/bin/env node
/**
 * E2E integration validation — FASE 07.5.F SESIÓN B.1.
 *
 * Smoke test cross-9-layers sobre una zone representativa. Lee (NO muta)
 * todas las capas producidas por las sesiones 07.5.A → 07.5.E y reporta
 * conteos + muestras + warnings por capa vacía/errónea.
 *
 * Capas inspeccionadas (10 queries, 9 capas conceptuales — demographics
 * agrupa INEGI census + ENIGH income como una sola capa):
 *   1. zone_scores                (scores N0-N4)
 *   2. dmx_indices                (DMX 15 índices)
 *   3. zone_pulse_scores          (pulse 30d)
 *   4. pulse_forecasts            (forecast H+30d)
 *   5. colonia_dna_vectors        (DNA 64-dim)
 *   6. climate_zone_signatures    (+ climate_monthly_aggregates)
 *   7. zone_constellations_edges  (+ zone_topology_metrics)
 *   8. ghost_zones_ranking
 *   9. colonia_wiki_entries
 *  10. demographics: inegi_census_zone_stats + enigh_zone_income
 *
 * Uso:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node --experimental-strip-types scripts/validation/e2e-fase-07.5-integration.ts
 *
 * Flags:
 *   --zone=<scope_id>   Default MX-CDMX-CU-roma-norte.
 *   --dry-run           Ejecuta lecturas pero NO crea ingest_runs row.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/types/database.ts';
import { withIngestRun } from '../ingest/lib/ingest-run-helper.ts';

// ========================================================================
// Constants
// ========================================================================

export const SOURCE = 'validation_e2e_fase_07.5';
export const DEFAULT_COUNTRY = 'MX';
export const DEFAULT_ZONE_SCOPE_ID = 'MX-CDMX-CU-roma-norte';
export const MONTHS_CLIMATE_WINDOW = 12;
export const TOP_EDGES_LIMIT = 5;

const TAG = '[validation:e2e-07.5]';

// ========================================================================
// Types
// ========================================================================

export type LayerStatus = 'ok' | 'empty' | 'error';

export type LayerResult = {
  layer: string;
  status: LayerStatus;
  count: number;
  sample: Record<string, unknown> | null;
  warning?: string;
};

export type ZoneInfo = {
  id: string;
  scope_id: string;
  scope_type: string;
  name_es: string;
  country_code: string;
};

export type E2EReport = {
  zone: ZoneInfo;
  runId: string;
  timestamp: string;
  layers: LayerResult[];
  summary: {
    ok: number;
    empty: number;
    error: number;
  };
};

export type CliArgs = {
  zoneScopeId: string;
  dryRun: boolean;
};

// ========================================================================
// CLI parsing (zero deps)
// ========================================================================

export function parseArgs(argv: string[]): CliArgs {
  let zoneScopeId = DEFAULT_ZONE_SCOPE_ID;
  let dryRun = false;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--zone=')) {
      const raw = a.slice('--zone='.length).trim();
      if (raw === '') {
        throw new Error(`${TAG} --zone inválido: "${a}"`);
      }
      zoneScopeId = raw;
    }
  }
  return { zoneScopeId, dryRun };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(`${TAG} Falta env var requerida: ${name}`);
  }
  return v;
}

// ========================================================================
// Layer classifier (pure)
// ========================================================================

export function classifyLayer(input: { count: number; error?: string | null }): LayerStatus {
  if (input.error != null && input.error !== '') return 'error';
  if (input.count <= 0) return 'empty';
  return 'ok';
}

function makeResult(
  layer: string,
  count: number,
  sample: Record<string, unknown> | null,
  error: string | null,
): LayerResult {
  const status = classifyLayer({ count, error });
  if (status === 'error') {
    return { layer, status, count, sample: null, warning: error ?? 'unknown error' };
  }
  if (status === 'empty') {
    return { layer, status, count, sample: null, warning: `${layer} returned 0 rows` };
  }
  return { layer, status, count, sample };
}

// ========================================================================
// Per-layer query helpers
// ========================================================================

export async function queryScoresLayer(
  supabase: SupabaseClient<Database>,
  zoneId: string,
): Promise<LayerResult> {
  try {
    const { data, error } = await supabase
      .from('zone_scores')
      .select('id, score_type, score_value, level, tier, period_date')
      .eq('zone_id', zoneId);
    if (error) return makeResult('zone_scores', 0, null, error.message);
    const rows = data ?? [];
    const levels = Array.from(new Set(rows.map((r) => r.level))).sort((a, b) => a - b);
    const first = rows[0] ?? null;
    const sample: Record<string, unknown> = {
      levels_distinct: levels,
      first_score_type: first?.score_type ?? null,
      first_score_value: first?.score_value ?? null,
    };
    return makeResult('zone_scores', rows.length, sample, null);
  } catch (err) {
    return makeResult('zone_scores', 0, null, err instanceof Error ? err.message : String(err));
  }
}

export async function queryDmxLayer(
  supabase: SupabaseClient<Database>,
  scopeId: string,
): Promise<LayerResult> {
  try {
    const { data, error } = await supabase
      .from('dmx_indices')
      .select('id, index_code, value, period_date, scope_id')
      .eq('scope_id', scopeId);
    if (error) return makeResult('dmx_indices', 0, null, error.message);
    const rows = data ?? [];
    const codes = Array.from(new Set(rows.map((r) => r.index_code))).sort();
    const sample: Record<string, unknown> = {
      index_codes_distinct: codes,
      distinct_count: codes.length,
    };
    return makeResult('dmx_indices', rows.length, sample, null);
  } catch (err) {
    return makeResult('dmx_indices', 0, null, err instanceof Error ? err.message : String(err));
  }
}

export async function queryPulseLayer(
  supabase: SupabaseClient<Database>,
  scopeId: string,
): Promise<LayerResult> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('zone_pulse_scores')
      .select('id, pulse_score, period_date')
      .eq('scope_id', scopeId)
      .gte('period_date', since);
    if (error) return makeResult('zone_pulse_scores', 0, null, error.message);
    const rows = data ?? [];
    if (rows.length === 0) return makeResult('zone_pulse_scores', 0, null, null);
    const dates = rows.map((r) => r.period_date).sort();
    const scores = rows.map((r) => r.pulse_score).filter((x): x is number => typeof x === 'number');
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const sample: Record<string, unknown> = {
      min_period_date: dates[0] ?? null,
      max_period_date: dates[dates.length - 1] ?? null,
      avg_pulse_score: avg != null ? Number(avg.toFixed(2)) : null,
    };
    return makeResult('zone_pulse_scores', rows.length, sample, null);
  } catch (err) {
    return makeResult(
      'zone_pulse_scores',
      0,
      null,
      err instanceof Error ? err.message : String(err),
    );
  }
}

export async function queryForecastsLayer(
  supabase: SupabaseClient<Database>,
  zoneId: string,
): Promise<LayerResult> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('pulse_forecasts')
      .select('id, forecast_date, value, methodology')
      .eq('zone_id', zoneId)
      .gte('forecast_date', today);
    if (error) return makeResult('pulse_forecasts', 0, null, error.message);
    const rows = data ?? [];
    if (rows.length === 0) return makeResult('pulse_forecasts', 0, null, null);
    const dates = rows.map((r) => r.forecast_date).sort();
    const methodologies = Array.from(new Set(rows.map((r) => r.methodology)));
    const sample: Record<string, unknown> = {
      min_forecast_date: dates[0] ?? null,
      max_forecast_date: dates[dates.length - 1] ?? null,
      methodologies,
    };
    return makeResult('pulse_forecasts', rows.length, sample, null);
  } catch (err) {
    return makeResult('pulse_forecasts', 0, null, err instanceof Error ? err.message : String(err));
  }
}

export async function queryDnaLayer(
  supabase: SupabaseClient<Database>,
  coloniaId: string,
): Promise<LayerResult> {
  try {
    const { data, error } = await supabase
      .from('colonia_dna_vectors')
      .select('colonia_id, methodology_version, computed_at')
      .eq('colonia_id', coloniaId)
      .maybeSingle();
    if (error) return makeResult('colonia_dna_vectors', 0, null, error.message);
    if (data == null) return makeResult('colonia_dna_vectors', 0, null, null);
    const sample: Record<string, unknown> = {
      methodology_version: data.methodology_version,
      computed_at: data.computed_at,
    };
    return makeResult('colonia_dna_vectors', 1, sample, null);
  } catch (err) {
    return makeResult(
      'colonia_dna_vectors',
      0,
      null,
      err instanceof Error ? err.message : String(err),
    );
  }
}

export async function queryClimateLayer(
  supabase: SupabaseClient<Database>,
  zoneId: string,
): Promise<LayerResult> {
  try {
    const [sigRes, aggRes] = await Promise.all([
      supabase
        .from('climate_zone_signatures')
        .select('zone_id, signature, years_observed, methodology')
        .eq('zone_id', zoneId)
        .maybeSingle(),
      supabase
        .from('climate_monthly_aggregates')
        .select('zone_id, year_month, temp_avg, rainfall_mm')
        .eq('zone_id', zoneId)
        .order('year_month', { ascending: false })
        .limit(MONTHS_CLIMATE_WINDOW),
    ]);

    if (sigRes.error) return makeResult('climate', 0, null, sigRes.error.message);
    if (aggRes.error) return makeResult('climate', 0, null, aggRes.error.message);

    const signature = sigRes.data;
    const aggregates = aggRes.data ?? [];
    const hasAny = signature != null || aggregates.length > 0;
    if (!hasAny) return makeResult('climate', 0, null, null);

    const months = aggregates.map((a) => a.year_month).sort();
    const sample: Record<string, unknown> = {
      signature: signature?.signature ?? null,
      years_observed: signature?.years_observed ?? null,
      monthly_count: aggregates.length,
      min_year_month: months[0] ?? null,
      max_year_month: months[months.length - 1] ?? null,
    };
    // Count sums signature (1 if present) + aggregates rows to make "empty"
    // meaningful when BOTH are missing.
    const count = (signature != null ? 1 : 0) + aggregates.length;
    return makeResult('climate', count, sample, null);
  } catch (err) {
    return makeResult('climate', 0, null, err instanceof Error ? err.message : String(err));
  }
}

export async function queryConstellationsLayer(
  supabase: SupabaseClient<Database>,
  coloniaId: string,
  zoneId: string,
): Promise<LayerResult> {
  try {
    const [edgesRes, topoRes] = await Promise.all([
      supabase
        .from('zone_constellations_edges')
        .select('id, source_colonia_id, target_colonia_id, edge_weight, period_date')
        .or(`source_colonia_id.eq.${coloniaId},target_colonia_id.eq.${coloniaId}`)
        .order('edge_weight', { ascending: false })
        .limit(TOP_EDGES_LIMIT),
      supabase
        .from('zone_topology_metrics')
        .select('zone_id, snapshot_date, degree_centrality, approximate_pagerank')
        .eq('zone_id', zoneId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (edgesRes.error) {
      return makeResult('constellations', 0, null, edgesRes.error.message);
    }
    if (topoRes.error) {
      return makeResult('constellations', 0, null, topoRes.error.message);
    }

    const edges = edgesRes.data ?? [];
    const topo = topoRes.data;
    if (edges.length === 0 && topo == null) {
      return makeResult('constellations', 0, null, null);
    }
    const sample: Record<string, unknown> = {
      top_edges: edges.slice(0, TOP_EDGES_LIMIT).map((e) => ({
        source: e.source_colonia_id,
        target: e.target_colonia_id,
        weight: e.edge_weight,
      })),
      topology_latest_snapshot: topo?.snapshot_date ?? null,
      degree_centrality: topo?.degree_centrality ?? null,
      approximate_pagerank: topo?.approximate_pagerank ?? null,
    };
    const count = edges.length + (topo != null ? 1 : 0);
    return makeResult('constellations', count, sample, null);
  } catch (err) {
    return makeResult('constellations', 0, null, err instanceof Error ? err.message : String(err));
  }
}

export async function queryGhostLayer(
  supabase: SupabaseClient<Database>,
  coloniaId: string,
): Promise<LayerResult> {
  try {
    const { data, error } = await supabase
      .from('ghost_zones_ranking')
      .select('id, ghost_score, transition_probability, period_date, rank')
      .eq('colonia_id', coloniaId)
      .order('period_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return makeResult('ghost_zones_ranking', 0, null, error.message);
    if (data == null) return makeResult('ghost_zones_ranking', 0, null, null);
    const sample: Record<string, unknown> = {
      ghost_score: data.ghost_score,
      transition_probability: data.transition_probability,
      period_date: data.period_date,
      rank: data.rank,
    };
    return makeResult('ghost_zones_ranking', 1, sample, null);
  } catch (err) {
    return makeResult(
      'ghost_zones_ranking',
      0,
      null,
      err instanceof Error ? err.message : String(err),
    );
  }
}

export async function queryWikiLayer(
  supabase: SupabaseClient<Database>,
  coloniaId: string,
): Promise<LayerResult> {
  try {
    const { data, error } = await supabase
      .from('colonia_wiki_entries')
      .select('id, version, sections, edited_at, published')
      .eq('colonia_id', coloniaId)
      .eq('version', 1)
      .maybeSingle();
    if (error) return makeResult('colonia_wiki_entries', 0, null, error.message);
    if (data == null) return makeResult('colonia_wiki_entries', 0, null, null);

    let sectionKeys: string[] = [];
    if (
      typeof data.sections === 'object' &&
      data.sections != null &&
      !Array.isArray(data.sections)
    ) {
      sectionKeys = Object.keys(data.sections as Record<string, unknown>);
    }
    const sample: Record<string, unknown> = {
      version: data.version,
      published: data.published,
      edited_at: data.edited_at,
      section_keys: sectionKeys,
    };
    return makeResult('colonia_wiki_entries', 1, sample, null);
  } catch (err) {
    return makeResult(
      'colonia_wiki_entries',
      0,
      null,
      err instanceof Error ? err.message : String(err),
    );
  }
}

export async function queryDemographicsLayer(
  supabase: SupabaseClient<Database>,
  zoneId: string,
): Promise<LayerResult> {
  try {
    const [censusRes, incomeRes] = await Promise.all([
      supabase
        .from('inegi_census_zone_stats')
        .select('zone_id, dominant_profession, snapshot_date')
        .eq('zone_id', zoneId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('enigh_zone_income')
        .select('zone_id, median_salary_mxn, snapshot_date')
        .eq('zone_id', zoneId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (censusRes.error) return makeResult('demographics', 0, null, censusRes.error.message);
    if (incomeRes.error) return makeResult('demographics', 0, null, incomeRes.error.message);

    const census = censusRes.data;
    const income = incomeRes.data;
    const count = (census != null ? 1 : 0) + (income != null ? 1 : 0);
    if (count === 0) return makeResult('demographics', 0, null, null);

    const sample: Record<string, unknown> = {
      census_present: census != null,
      dominant_profession: census?.dominant_profession ?? null,
      income_present: income != null,
      median_salary_mxn: income?.median_salary_mxn ?? null,
    };
    return makeResult('demographics', count, sample, null);
  } catch (err) {
    return makeResult('demographics', 0, null, err instanceof Error ? err.message : String(err));
  }
}

// ========================================================================
// Report builder (pure)
// ========================================================================

export function buildE2EReport(opts: {
  zone: ZoneInfo;
  runId: string;
  layers: LayerResult[];
  timestamp?: string;
}): E2EReport {
  const timestamp = opts.timestamp ?? new Date().toISOString();
  let ok = 0;
  let empty = 0;
  let errorCount = 0;
  for (const l of opts.layers) {
    if (l.status === 'ok') ok += 1;
    else if (l.status === 'empty') empty += 1;
    else errorCount += 1;
  }
  return {
    zone: opts.zone,
    runId: opts.runId,
    timestamp,
    layers: opts.layers,
    summary: { ok, empty, error: errorCount },
  };
}

// ========================================================================
// Orchestration
// ========================================================================

export async function runAllLayers(
  supabase: SupabaseClient<Database>,
  zone: ZoneInfo,
): Promise<LayerResult[]> {
  // All 10 queries run in parallel — read-only, no ordering constraints.
  const [scores, dmx, pulse, forecasts, dna, climate, constellations, ghost, wiki, demographics] =
    await Promise.all([
      queryScoresLayer(supabase, zone.id),
      queryDmxLayer(supabase, zone.scope_id),
      queryPulseLayer(supabase, zone.scope_id),
      queryForecastsLayer(supabase, zone.id),
      queryDnaLayer(supabase, zone.id),
      queryClimateLayer(supabase, zone.id),
      queryConstellationsLayer(supabase, zone.id, zone.id),
      queryGhostLayer(supabase, zone.id),
      queryWikiLayer(supabase, zone.id),
      queryDemographicsLayer(supabase, zone.id),
    ]);
  return [scores, dmx, pulse, forecasts, dna, climate, constellations, ghost, wiki, demographics];
}

async function fetchZone(
  supabase: SupabaseClient<Database>,
  zoneScopeId: string,
): Promise<ZoneInfo> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, scope_id, scope_type, name_es, country_code')
    .eq('scope_id', zoneScopeId)
    .single();
  if (error || data == null) {
    throw new Error(
      `${TAG} zone scope_id="${zoneScopeId}" no encontrada: ${error?.message ?? 'missing'}`,
    );
  }
  return {
    id: data.id,
    scope_id: data.scope_id,
    scope_type: data.scope_type,
    name_es: data.name_es,
    country_code: data.country_code,
  };
}

// ========================================================================
// Main
// ========================================================================

async function main(): Promise<number> {
  const args = parseArgs(process.argv);

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const zone = await fetchZone(supabase, args.zoneScopeId);

  if (args.dryRun) {
    const layers = await runAllLayers(supabase, zone);
    const report = buildE2EReport({ zone, runId: 'dry-run', layers });
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: zone.country_code ?? DEFAULT_COUNTRY,
      triggeredBy: 'cli:validation_e2e',
      expectedPeriodicity: 'on_demand',
      upsertWatermarkOnSuccess: false,
      meta: {
        script: 'e2e-fase-07.5-integration.ts',
        zone_scope_id: zone.scope_id,
        zone_id: zone.id,
        zone_scope_type: zone.scope_type,
      },
    },
    async ({ runId }) => {
      const layers = await runAllLayers(supabase, zone);
      const report = buildE2EReport({ zone, runId, layers });
      console.log(JSON.stringify(report, null, 2));
      return { counts: { inserted: 0, updated: 0, skipped: 0 } };
    },
  );

  if (result.status !== 'success') {
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
