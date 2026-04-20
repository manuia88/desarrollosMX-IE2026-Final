// Tier gating — determina si un score puede calcularse dada la madurez de datos.
// Tier 1 siempre activo (día 1 con fuentes externas).
// Tier 2 ≥10 proyectos en zona. Tier 3 ≥50 proyectos + 6 meses. Tier 4 ≥100 ventas cerradas.
//
// Fallback hardcoded hasta que la migration 8.F.1 cree la tabla tier_requirements.
// TODO migrar a tier_requirements tras 8.F.1.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScoreTier } from '../registry';

export interface TierGateResult {
  readonly gated: boolean;
  readonly reason?: 'tier_insufficient' | 'country_unsupported';
  readonly requirement?: string;
  readonly current?: number;
  readonly threshold?: number;
}

interface TierFallbackRequirement {
  readonly tier: ScoreTier;
  readonly minProjects: number;
  readonly minClosedOps: number;
  readonly minMonthsData: number;
  readonly description: string;
}

const TIER_FALLBACK: Readonly<Record<ScoreTier, TierFallbackRequirement>> = {
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

export async function tierGate(
  tier: ScoreTier,
  countryCode: string,
  _supabase: SupabaseClient,
): Promise<TierGateResult> {
  // Tier 1 = siempre pasa. Plan 8.A.2.4.
  if (tier === 1) return { gated: false };

  // MX-only durante H1. Otros countries se añaden en ADR-003.
  if (countryCode !== 'MX') {
    return {
      gated: true,
      reason: 'country_unsupported',
      requirement: `Score solo disponible en MX durante H1. Current: ${countryCode}`,
    };
  }

  // Fallback hardcoded. TODO migrar a tier_requirements tras 8.F.1.
  const req = TIER_FALLBACK[tier];

  // En H1 todavía no existen 50+ proyectos en BD — todo tier >=2 gated
  // hasta que DMX tenga inventario activo. Cuando 8.F.1 exponga counts
  // reales, esta rama consulta project_count_by_country() etc.
  return {
    gated: true,
    reason: 'tier_insufficient',
    requirement: req.description,
    current: 0,
    threshold: req.minProjects,
  };
}
