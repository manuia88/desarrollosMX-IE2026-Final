import type { RankingRow } from '@/features/indices-publicos/components/RankingTable';
import type { IndexCode } from '@/features/indices-publicos/lib/index-registry-helpers';
import type { AlphaZonePublicRow } from '@/features/trend-genome/types';

export const PERSONA_TYPES = ['comprador', 'asesor', 'developer', 'masterbroker'] as const;
export type PersonaType = (typeof PERSONA_TYPES)[number];

export function isPersonaType(value: string): value is PersonaType {
  return (PERSONA_TYPES as readonly string[]).includes(value);
}

export interface MockIndexScore {
  readonly code: IndexCode;
  readonly value: number;
  readonly band: 'excelente' | 'bueno' | 'regular' | 'bajo';
  readonly trend_pct_12m: number;
  readonly percentile: number;
}

export interface MockTimelinePoint {
  readonly period: string;
  readonly ipv: number;
  readonly liv: number;
  readonly fam: number;
  readonly yng: number;
  readonly milestone: string | null;
}

export interface MockPulseSummary {
  readonly heartbeat: number;
  readonly vitals: {
    readonly appreciation: number;
    readonly liquidity: number;
    readonly demand: number;
    readonly momentum: number;
  };
  readonly headline: string;
}

export interface MockCausalDriver {
  readonly factor: string;
  readonly impact_pct: number;
  readonly direction: 'positive' | 'negative';
  readonly evidence: string;
}

export interface MockNarvarteData {
  readonly scopeType: 'colonia';
  readonly scopeId: 'narvarte';
  readonly label: string;
  readonly summary: string;
  readonly scores: readonly MockIndexScore[];
  readonly pulse: MockPulseSummary;
  readonly causal: {
    readonly indexCode: IndexCode;
    readonly drivers: readonly MockCausalDriver[];
    readonly conclusion: string;
  };
  readonly timeline: readonly MockTimelinePoint[];
  readonly topMatches: readonly RankingRow[];
  readonly alphaZones: readonly AlphaZonePublicRow[];
  readonly migrationPoints: readonly {
    readonly origin_scope_id: string;
    readonly dest_scope_id: string;
    readonly origin_centroid: readonly [number, number] | null;
    readonly dest_centroid: readonly [number, number] | null;
    readonly volume: number;
    readonly income_decile_origin: number | null;
    readonly income_decile_dest: number | null;
  }[];
}

export interface MockClientProfile {
  readonly id: string;
  readonly nameKey: string;
  readonly ageRange: string;
  readonly family: string;
  readonly budgetMxn: number;
  readonly priority: 'schools' | 'commute' | 'lifestyle';
  readonly proposedZones: readonly {
    readonly scopeId: string;
    readonly fitPct: number;
    readonly rationaleKey: string;
  }[];
  readonly objectionsKey: string;
}

export interface MockAgent {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly zoneSlug: string;
  readonly zoneLabel: string;
  readonly pipelineMxn: number;
  readonly conversionPct: number;
  readonly ytdRevenueMxn: number;
  readonly weeklyDeals: number;
  readonly trendPct: number;
  readonly badges: readonly ('top_closer' | 'streak_week' | 'alpha_hunter' | 'rising_star')[];
}

export interface MockFeasibility {
  readonly roiPct: number;
  readonly absorptionMonths: number;
  readonly competitorUnits: number;
  readonly pricePerM2Mxn: number;
  readonly pipelineProjects: readonly {
    readonly id: string;
    readonly nameKey: string;
    readonly unitCount: number;
    readonly status: 'announced' | 'in_progress' | 'presale';
  }[];
}

export interface PreviewMockBundle {
  readonly narvarte: MockNarvarteData;
  readonly clientProfiles: readonly MockClientProfile[];
  readonly agents: readonly MockAgent[];
  readonly feasibility: MockFeasibility;
}
