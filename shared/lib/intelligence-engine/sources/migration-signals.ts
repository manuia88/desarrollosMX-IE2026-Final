// Migration Signals — ingestion adapters para BLOQUE 11.G Migration Flow.
// Cada fetch* retorna signals origen→destino con volume + confidence 0..1.
// H1: RPP escrituras = REAL; INEGI ENADID / INE credencial / LinkedIn = STUB hasta H2.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MigrationFlowSignal,
  MigrationScopeType,
  MigrationSourceKey,
} from '@/features/migration-flow/types';
import { MIGRATION_SOURCE_CONFIDENCE } from '@/features/migration-flow/types';

type LooseClient = SupabaseClient<Record<string, unknown>>;

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

function isoDaysAgo(periodDate: string, days: number): string {
  const anchor = new Date(`${periodDate}T00:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() - days);
  return anchor.toISOString().slice(0, 10);
}

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

export interface FetchMigrationSignalParams {
  readonly zoneId: string;
  readonly scopeType: MigrationScopeType;
  readonly countryCode: string;
  readonly periodDate: string;
  readonly supabase: SupabaseClient;
  readonly fetchImpl?: typeof fetch;
}

// ---------- RPP escrituras (REAL H1) ----------

const RPP_CANDIDATE_TABLES: readonly string[] = ['escrituras_raw', 'rpp_escrituras'] as const;
const RPP_CANDIDATE_ORIGIN_FIELDS: readonly string[] = [
  'zone_id_origen_anterior',
  'origen_anterior_zone_id',
  'prev_zone_id',
] as const;
const RPP_CANDIDATE_DEST_FIELDS: readonly string[] = [
  'zone_id',
  'zone_id_destino',
  'destino_zone_id',
] as const;
const RPP_CANDIDATE_DATE_FIELDS: readonly string[] = ['fecha_escritura', 'fecha'] as const;

interface RppRowShape {
  readonly origin: string;
  readonly dest: string;
}

function extractRppRow(raw: unknown, originField: string, destField: string): RppRowShape | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const origin = rec[originField];
  const dest = rec[destField];
  if (!isString(origin) || !isString(dest)) return null;
  return { origin, dest };
}

export async function fetchFromRPPEscrituras(
  p: FetchMigrationSignalParams,
): Promise<{ signals: readonly MigrationFlowSignal[]; limitation: string | null }> {
  const fromDate = isoDaysAgo(p.periodDate, 90);
  const confidencePerSignal = MIGRATION_SOURCE_CONFIDENCE.rpp;

  for (const table of RPP_CANDIDATE_TABLES) {
    for (const originField of RPP_CANDIDATE_ORIGIN_FIELDS) {
      for (const destField of RPP_CANDIDATE_DEST_FIELDS) {
        if (originField === destField) continue;
        for (const dateField of RPP_CANDIDATE_DATE_FIELDS) {
          try {
            const selectCols = `${originField}, ${destField}, ${dateField}`;
            const res = await castFrom(p.supabase, table)
              .select(selectCols)
              .or(`${originField}.eq.${p.zoneId},${destField}.eq.${p.zoneId}`)
              .gte(dateField, fromDate)
              .lte(dateField, p.periodDate)
              .limit(5000);
            if (res.error) continue;
            const data = res.data as unknown;
            if (!Array.isArray(data)) continue;

            const pairCounts = new Map<string, { origin: string; dest: string; volume: number }>();
            for (const raw of data) {
              const row = extractRppRow(raw, originField, destField);
              if (!row) continue;
              if (row.origin === row.dest) continue;
              if (row.origin !== p.zoneId && row.dest !== p.zoneId) continue;
              const key = `${row.origin}::${row.dest}`;
              const prev = pairCounts.get(key);
              if (prev) {
                pairCounts.set(key, { ...prev, volume: prev.volume + 1 });
              } else {
                pairCounts.set(key, { origin: row.origin, dest: row.dest, volume: 1 });
              }
            }

            const signals: MigrationFlowSignal[] = [];
            for (const { origin, dest, volume } of pairCounts.values()) {
              signals.push({
                origin_scope_type: p.scopeType,
                origin_scope_id: origin,
                dest_scope_type: p.scopeType,
                dest_scope_id: dest,
                volume,
                confidence: confidencePerSignal,
                source: 'rpp',
              });
            }

            return { signals, limitation: null };
          } catch {
            // Try next combination.
          }
        }
      }
    }
  }

  return { signals: [], limitation: 'RPP_TABLE_NOT_FOUND' };
}

// ---------- INEGI ENADID (STUB H1) ----------

export async function fetchFromINEGIENADID(
  _p: FetchMigrationSignalParams,
): Promise<{ signals: readonly MigrationFlowSignal[]; limitation: string | null }> {
  return { signals: [], limitation: 'INEGI_ENADID_PENDING_H2' };
}

// ---------- INE Credencial (STUB H1) ----------

export async function fetchFromINECredencial(
  _p: FetchMigrationSignalParams,
): Promise<{ signals: readonly MigrationFlowSignal[]; limitation: string | null }> {
  return { signals: [], limitation: 'INE_CREDENCIAL_PENDING_H2' };
}

// ---------- LinkedIn perfiles (STUB H1) ----------

export async function fetchFromLinkedInProfiles(
  _p: FetchMigrationSignalParams,
): Promise<{ signals: readonly MigrationFlowSignal[]; limitation: string | null }> {
  return { signals: [], limitation: 'LINKEDIN_PENDING_H2' };
}

// ---------- Orchestrator ----------

export async function fetchMigrationSignals(p: FetchMigrationSignalParams): Promise<{
  readonly signals: readonly MigrationFlowSignal[];
  readonly limitations: readonly string[];
  readonly sources_real: readonly MigrationSourceKey[];
  readonly sources_stub: readonly MigrationSourceKey[];
}> {
  const [rpp, inegi, ine, linkedin] = await Promise.all([
    fetchFromRPPEscrituras(p),
    fetchFromINEGIENADID(p),
    fetchFromINECredencial(p),
    fetchFromLinkedInProfiles(p),
  ]);

  const signals: MigrationFlowSignal[] = [];
  for (const bundle of [rpp, inegi, ine, linkedin]) {
    for (const s of bundle.signals) signals.push(s);
  }

  const limitations: string[] = [];
  const sources_real: MigrationSourceKey[] = [];
  const sources_stub: MigrationSourceKey[] = [];

  const pairs: ReadonlyArray<{ key: MigrationSourceKey; limitation: string | null }> = [
    { key: 'rpp', limitation: rpp.limitation },
    { key: 'inegi', limitation: inegi.limitation },
    { key: 'ine', limitation: ine.limitation },
    { key: 'linkedin', limitation: linkedin.limitation },
  ];

  for (const { key, limitation } of pairs) {
    if (limitation === null) {
      sources_real.push(key);
    } else {
      sources_stub.push(key);
      limitations.push(limitation);
    }
  }

  return { signals, limitations, sources_real, sources_stub };
}
