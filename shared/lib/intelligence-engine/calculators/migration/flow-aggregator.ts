// Migration Flow Aggregator — BLOQUE 11.G.
// Descubre colonias CDMX, invoca adapters origen→destino, merge por tupla
// (origin_scope_type, origin_scope_id, dest_scope_type, dest_scope_id) con
// weighted confidence y source_mix, persiste en public.zone_migration_flows.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MigrationFlowBatchSummary,
  MigrationFlowSignal,
  MigrationScopeType,
  MigrationSourceKey,
  MigrationSourceMix,
} from '@/features/migration-flow/types';
import { MIGRATION_SOURCE_KEYS } from '@/features/migration-flow/types';
import { fetchMigrationSignals } from '../../sources/migration-signals';

type LooseClient = SupabaseClient<Record<string, unknown>>;

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

const DEFAULT_CHUNK_SIZE = 10;
const DEFAULT_SCOPE: MigrationScopeType = 'colonia';
const FLOW_UPSERT_CHUNK_SIZE = 50;
const DECILE_CANDIDATE_FIELDS: readonly string[] = ['decil_ingreso', 'income_decile'] as const;
const ZONA_SNAPSHOTS_LOOKBACK_DAYS = 120;

const FLOWS_CONFLICT_KEY =
  'origin_scope_type,origin_scope_id,dest_scope_type,dest_scope_id,country_code,period_date';

export interface AggregateFlowsParams {
  readonly periodDate: string;
  readonly supabase: SupabaseClient;
  readonly zoneIds?: readonly string[];
  readonly scopeType?: MigrationScopeType;
  readonly fetchImpl?: typeof fetch;
  readonly chunkSize?: number;
  readonly fetchSignals?: typeof fetchMigrationSignals;
}

interface PairAccumulator {
  origin_scope_type: MigrationScopeType;
  origin_scope_id: string;
  dest_scope_type: MigrationScopeType;
  dest_scope_id: string;
  source_mix: { rpp: number; inegi: number; ine: number; linkedin: number };
  weighted_conf_numerator: number;
  volume: number;
}

async function discoverZonesViaSnapshots(
  supabase: SupabaseClient,
  periodDate: string,
): Promise<readonly string[]> {
  try {
    const anchor = new Date(`${periodDate}T00:00:00Z`);
    const lookback = new Date(anchor.getTime());
    lookback.setUTCDate(lookback.getUTCDate() - ZONA_SNAPSHOTS_LOOKBACK_DAYS);
    const fromISO = lookback.toISOString().slice(0, 10);
    const res = await castFrom(supabase, 'zona_snapshots')
      .select('zone_id')
      .eq('country_code', 'MX')
      .gte('period', fromISO)
      .lte('period', periodDate)
      .limit(5000);
    if (res.error || !res.data) return [];
    const rows = res.data as unknown as Array<{ zone_id: string }>;
    const uniq = new Set<string>();
    for (const r of rows) {
      if (r?.zone_id) uniq.add(r.zone_id);
    }
    return [...uniq];
  } catch {
    return [];
  }
}

async function lookupIncomeDeciles(
  supabase: SupabaseClient,
  zoneIds: readonly string[],
  periodDate: string,
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();
  if (zoneIds.length === 0) return result;

  for (const field of DECILE_CANDIDATE_FIELDS) {
    try {
      const res = await castFrom(supabase, 'zona_snapshots')
        .select(`zone_id, ${field}`)
        .in('zone_id', zoneIds as string[])
        .lte('period', periodDate)
        .limit(zoneIds.length * 4);
      if (res.error || !res.data) continue;
      const rows = res.data as unknown as Array<Record<string, unknown>>;
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const zid = row.zone_id;
        const val = row[field];
        if (typeof zid !== 'string') continue;
        if (typeof val === 'number' && Number.isFinite(val)) {
          result.set(zid, val);
        }
      }
      if (result.size > 0) return result;
    } catch {
      // Try next candidate field.
    }
  }

  return result;
}

function mergeSignalsByPair(
  signals: readonly MigrationFlowSignal[],
): ReadonlyArray<PairAccumulator> {
  const acc = new Map<string, PairAccumulator>();

  for (const s of signals) {
    if (s.volume <= 0) continue;
    if (s.origin_scope_type === s.dest_scope_type && s.origin_scope_id === s.dest_scope_id) {
      continue;
    }
    const key = `${s.origin_scope_type}::${s.origin_scope_id}::${s.dest_scope_type}::${s.dest_scope_id}`;
    const prev = acc.get(key);
    if (prev) {
      prev.source_mix[s.source] += s.volume;
      prev.weighted_conf_numerator += s.volume * s.confidence;
      prev.volume += s.volume;
    } else {
      const mix: PairAccumulator['source_mix'] = { rpp: 0, inegi: 0, ine: 0, linkedin: 0 };
      mix[s.source] = s.volume;
      acc.set(key, {
        origin_scope_type: s.origin_scope_type,
        origin_scope_id: s.origin_scope_id,
        dest_scope_type: s.dest_scope_type,
        dest_scope_id: s.dest_scope_id,
        source_mix: mix,
        weighted_conf_numerator: s.volume * s.confidence,
        volume: s.volume,
      });
    }
  }

  return [...acc.values()];
}

interface FlowUpsertRow extends Record<string, unknown> {
  origin_scope_type: MigrationScopeType;
  origin_scope_id: string;
  dest_scope_type: MigrationScopeType;
  dest_scope_id: string;
  country_code: string;
  period_date: string;
  volume: number;
  confidence: number | null;
  source_mix: MigrationSourceMix;
  income_decile_origin: number | null;
  income_decile_dest: number | null;
  calculated_at: string;
}

async function upsertFlowsChunked(
  supabase: SupabaseClient,
  rows: readonly FlowUpsertRow[],
): Promise<{ inserted: number; failures: number }> {
  if (rows.length === 0) return { inserted: 0, failures: 0 };
  let inserted = 0;
  let failures = 0;

  for (let i = 0; i < rows.length; i += FLOW_UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + FLOW_UPSERT_CHUNK_SIZE);
    try {
      const res = await castFrom(supabase, 'zone_migration_flows').upsert(
        chunk as never,
        { onConflict: FLOWS_CONFLICT_KEY } as never,
      );
      if (res.error) {
        failures += chunk.length;
      } else {
        inserted += chunk.length;
      }
    } catch {
      failures += chunk.length;
    }
  }

  return { inserted, failures };
}

export async function aggregateFlowsForCDMXColonias(
  p: AggregateFlowsParams,
): Promise<MigrationFlowBatchSummary> {
  const start = Date.now();
  const chunkSize = p.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const scopeType: MigrationScopeType = p.scopeType ?? DEFAULT_SCOPE;
  const fetchSignals = p.fetchSignals ?? fetchMigrationSignals;

  const zoneIds = p.zoneIds ?? (await discoverZonesViaSnapshots(p.supabase, p.periodDate));

  if (zoneIds.length === 0) {
    return {
      scopes_processed: 0,
      flows_upserted: 0,
      failures: 0,
      sources_real: [],
      sources_stub: [],
      duration_ms: Date.now() - start,
    };
  }

  const allSignals: MigrationFlowSignal[] = [];
  const sourcesRealSet = new Set<MigrationSourceKey>();
  const sourcesStubSet = new Set<MigrationSourceKey>();
  let failures = 0;

  for (let i = 0; i < zoneIds.length; i += chunkSize) {
    const chunk = zoneIds.slice(i, i + chunkSize);
    try {
      const chunkResults = await Promise.all(
        chunk.map((zoneId) =>
          fetchSignals({
            zoneId,
            scopeType,
            countryCode: 'MX',
            periodDate: p.periodDate,
            supabase: p.supabase,
            ...(p.fetchImpl ? { fetchImpl: p.fetchImpl } : {}),
          }),
        ),
      );
      for (const r of chunkResults) {
        for (const s of r.signals) allSignals.push(s);
        for (const k of r.sources_real) sourcesRealSet.add(k);
        for (const k of r.sources_stub) sourcesStubSet.add(k);
      }
    } catch {
      failures += chunk.length;
    }
  }

  const merged = mergeSignalsByPair(allSignals);

  const scopeIdsForLookup = new Set<string>();
  for (const pair of merged) {
    scopeIdsForLookup.add(pair.origin_scope_id);
    scopeIdsForLookup.add(pair.dest_scope_id);
  }
  const decileMap = await lookupIncomeDeciles(p.supabase, [...scopeIdsForLookup], p.periodDate);

  const rows: FlowUpsertRow[] = [];
  const nowISO = new Date().toISOString();

  for (const pair of merged) {
    if (pair.volume <= 0) continue;
    const confidence =
      pair.volume > 0
        ? Number(((100 * pair.weighted_conf_numerator) / pair.volume).toFixed(2))
        : null;
    rows.push({
      origin_scope_type: pair.origin_scope_type,
      origin_scope_id: pair.origin_scope_id,
      dest_scope_type: pair.dest_scope_type,
      dest_scope_id: pair.dest_scope_id,
      country_code: 'MX',
      period_date: p.periodDate,
      volume: pair.volume,
      confidence,
      source_mix: pair.source_mix satisfies MigrationSourceMix,
      income_decile_origin: decileMap.get(pair.origin_scope_id) ?? null,
      income_decile_dest: decileMap.get(pair.dest_scope_id) ?? null,
      calculated_at: nowISO,
    });
  }

  const { inserted, failures: upsertFailures } = await upsertFlowsChunked(p.supabase, rows);
  failures += upsertFailures;

  // Preserve MIGRATION_SOURCE_KEYS ordering en los arrays de summary.
  const orderedReal: MigrationSourceKey[] = [];
  const orderedStub: MigrationSourceKey[] = [];
  for (const k of MIGRATION_SOURCE_KEYS) {
    if (sourcesRealSet.has(k)) orderedReal.push(k);
    if (sourcesStubSet.has(k)) orderedStub.push(k);
  }

  return {
    scopes_processed: zoneIds.length,
    flows_upserted: inserted,
    failures,
    sources_real: orderedReal,
    sources_stub: orderedStub,
    duration_ms: Date.now() - start,
  };
}
