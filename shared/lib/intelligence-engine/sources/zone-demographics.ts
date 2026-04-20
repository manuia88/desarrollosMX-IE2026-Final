// L-69 FASE 10 SESIÓN 2/3 — zone_demographics profiling source.
//
// Compute profession_distribution + salary_range_distribution + age_distribution
// per zona desde INEGI Census + ENIGH. Consumidor inicial: H13 Site Selection +
// C03 Matching Engine (ponderar propiedades según profesión/salario usuario).
//
// Cache 30 días per zone_id. MV refresh cron diario 4am UTC (migration C1).
//
// Fallback STUB (ADR-018 4-signals) cuando tablas INEGI/ENIGH no existen aún:
// retorna estructura con `stub: true` + `pending_sources: [...]` + confidence
// 'insufficient_data'. Activación H2 FASE 07b (ingest expandido).

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProfessionBucket {
  readonly cmo_code: string; // clasificación CMO INEGI
  readonly label: string;
  readonly pct: number; // 0-1
}

export interface SalaryRangeBucket {
  readonly range_mxn_min: number;
  readonly range_mxn_max: number | null;
  readonly pct: number;
}

export interface AgeBucket {
  readonly range_min: number;
  readonly range_max: number;
  readonly pct: number;
}

export interface ZoneDemographics {
  readonly zone_id: string;
  readonly profession_distribution: readonly ProfessionBucket[];
  readonly salary_range_distribution: readonly SalaryRangeBucket[];
  readonly age_distribution: readonly AgeBucket[];
  readonly dominant_profession: string | null;
  readonly median_salary_mxn: number | null;
  readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  readonly source: 'inegi_census' | 'enigh' | 'materialized_view' | 'stub';
  readonly snapshot_date: string; // ISO YYYY-MM-DD
  readonly stub: boolean;
  readonly pending_sources: readonly string[];
}

interface CacheEntry {
  readonly data: ZoneDemographics;
  readonly expires_at: number;
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE = new Map<string, CacheEntry>();

export function resetZoneDemographicsCache(): void {
  CACHE.clear();
}

// STUB — activar FASE 07b con [ingest INEGI Census + ENIGH + MV
// zone_demographics_cache]. Mientras tanto retorna distribución uniforme con
// confidence insufficient_data. 4-signals ADR-018 ver módulo methodology
// `ai_narrative: false, ppd_source: 'stub'`.
function buildStubFallback(zone_id: string): ZoneDemographics {
  const today = new Date().toISOString().slice(0, 10);
  return {
    zone_id,
    profession_distribution: [],
    salary_range_distribution: [],
    age_distribution: [],
    dominant_profession: null,
    median_salary_mxn: null,
    confidence: 'insufficient_data',
    source: 'stub',
    snapshot_date: today,
    stub: true,
    pending_sources: ['inegi_census', 'enigh', 'zone_demographics_cache'],
  };
}

// Query principal. Intenta leer zone_demographics_cache (MV) si existe.
// Si falla (tabla ausente, fila ausente, error) → fallback stub.
export async function computeZoneDemographics(
  zone_id: string,
  supabase: SupabaseClient,
): Promise<ZoneDemographics> {
  const cached = CACHE.get(zone_id);
  if (cached && cached.expires_at > Date.now()) return cached.data;

  let data: ZoneDemographics;
  try {
    const res = await (supabase as unknown as SupabaseClient<Record<string, unknown>>)
      .from('zone_demographics_cache' as never)
      .select('*')
      .eq('zone_id' as never, zone_id as never)
      .limit(1)
      .maybeSingle();
    if (res.error || !res.data) {
      data = buildStubFallback(zone_id);
    } else {
      const row = res.data as unknown as {
        zone_id: string;
        profession_distribution: ProfessionBucket[];
        salary_range_distribution: SalaryRangeBucket[];
        age_distribution: AgeBucket[];
        dominant_profession: string | null;
        median_salary_mxn: number | null;
        snapshot_date: string;
      };
      const hasRich =
        (row.profession_distribution?.length ?? 0) > 0 &&
        (row.salary_range_distribution?.length ?? 0) > 0;
      data = {
        zone_id: row.zone_id,
        profession_distribution: row.profession_distribution ?? [],
        salary_range_distribution: row.salary_range_distribution ?? [],
        age_distribution: row.age_distribution ?? [],
        dominant_profession: row.dominant_profession,
        median_salary_mxn: row.median_salary_mxn,
        confidence: hasRich ? 'high' : 'medium',
        source: 'materialized_view',
        snapshot_date: row.snapshot_date,
        stub: false,
        pending_sources: [],
      };
    }
  } catch {
    data = buildStubFallback(zone_id);
  }

  CACHE.set(zone_id, { data, expires_at: Date.now() + CACHE_TTL_MS });
  return data;
}

// Boost helper — peso adicional 0-1 si la zona tiene concentración alta de la
// profesión objetivo del usuario. Usable por C03 matching + H13 site selection.
export function professionBoost(
  demographics: ZoneDemographics,
  targetProfession: string | null,
): number {
  if (!targetProfession) return 0;
  const bucket = demographics.profession_distribution.find(
    (p) =>
      p.cmo_code === targetProfession || p.label.toLowerCase() === targetProfession.toLowerCase(),
  );
  if (!bucket) return 0;
  // pct 0-1 → boost 0-1 (linear en esta iteración, tune post-calibración).
  return Math.min(1, bucket.pct * 2);
}

// Salary compatibility 0-1. 1 si mediana zona está dentro ±20% del target user.
export function salaryCompatibility(
  demographics: ZoneDemographics,
  targetSalaryMxn: number | null,
): number {
  if (!targetSalaryMxn || !demographics.median_salary_mxn) return 0.5;
  const delta = Math.abs(demographics.median_salary_mxn - targetSalaryMxn) / targetSalaryMxn;
  if (delta <= 0.2) return 1;
  if (delta <= 0.5) return 0.7;
  if (delta <= 1.0) return 0.4;
  return 0.1;
}
