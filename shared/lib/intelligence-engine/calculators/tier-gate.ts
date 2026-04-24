// Tier gating — determina si un score puede calcularse dada la madurez de datos.
// Tier 1 siempre activo (día 1 con fuentes externas).
// Tier 2-4 leen umbrales desde public.tier_requirements (BLOQUE 8.F.1).
// Cache in-memory por country con TTL 1h evita query repetida por tick worker.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScoreTier } from '../score-registry';

export interface TierGateResult {
  readonly gated: boolean;
  readonly reason?: 'tier_insufficient' | 'country_unsupported';
  readonly requirement?: string;
  readonly current?: number;
  readonly threshold?: number;
}

export interface TierRequirement {
  readonly tier: ScoreTier;
  readonly minProjects: number;
  readonly minClosedOps: number;
  readonly minMonthsData: number;
  readonly description: string;
}

type TierMap = Readonly<Record<ScoreTier, TierRequirement>>;

const TIER_FALLBACK: TierMap = {
  1: {
    tier: 1,
    minProjects: 0,
    minClosedOps: 0,
    minMonthsData: 0,
    description: 'Día 1 con fuentes externas',
  },
  2: {
    tier: 2,
    minProjects: 10,
    minClosedOps: 0,
    minMonthsData: 1,
    description: '10 proyectos en zona',
  },
  3: {
    tier: 3,
    minProjects: 50,
    minClosedOps: 0,
    minMonthsData: 6,
    description: '50 proyectos 6 meses',
  },
  4: {
    tier: 4,
    minProjects: 100,
    minClosedOps: 100,
    minMonthsData: 12,
    description: '100 ventas cerradas 12 meses',
  },
};

interface CacheEntry {
  map: TierMap;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export function clearTierRequirementsCache(): void {
  cache.clear();
}

type LooseClient = SupabaseClient<Record<string, unknown>>;
function lax(s: SupabaseClient): LooseClient {
  return s as unknown as LooseClient;
}

async function loadTierRequirements(
  supabase: SupabaseClient,
  countryCode: string,
): Promise<TierMap> {
  const cached = cache.get(countryCode);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.map;
  }

  try {
    const { data, error } = await lax(supabase)
      .from('tier_requirements')
      .select('tier, min_projects, min_closed_ops, min_months_data, description');
    if (error || !Array.isArray(data) || data.length === 0) {
      return TIER_FALLBACK;
    }
    const map: Record<number, TierRequirement> = { ...TIER_FALLBACK };
    for (const row of data as Array<{
      tier: number;
      min_projects: number;
      min_closed_ops: number;
      min_months_data: number;
      description: string;
    }>) {
      if (row.tier >= 1 && row.tier <= 4) {
        map[row.tier] = {
          tier: row.tier as ScoreTier,
          minProjects: row.min_projects,
          minClosedOps: row.min_closed_ops,
          minMonthsData: row.min_months_data,
          description: row.description,
        };
      }
    }
    const result = map as TierMap;
    cache.set(countryCode, { map: result, fetchedAt: Date.now() });
    return result;
  } catch {
    return TIER_FALLBACK;
  }
}

export async function tierGate(
  tier: ScoreTier,
  countryCode: string,
  supabase: SupabaseClient,
): Promise<TierGateResult> {
  if (tier === 1) return { gated: false };

  if (countryCode !== 'MX') {
    return {
      gated: true,
      reason: 'country_unsupported',
      requirement: `Score solo disponible en MX durante H1. Current: ${countryCode}`,
    };
  }

  const requirements = await loadTierRequirements(supabase, countryCode);
  const req = requirements[tier];

  // H1: no hay 50+ proyectos aún en BD. Todo tier >= 2 gated hasta que haya
  // inventario real. Cuando project counters estén wired (FASE 10+), esta
  // rama consulta project_count_by_country() y compara vs req.minProjects.
  return {
    gated: true,
    reason: 'tier_insufficient',
    requirement: req.description,
    current: 0,
    threshold: req.minProjects,
  };
}
