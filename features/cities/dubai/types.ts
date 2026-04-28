// FASE 14.1 — Dubai city expansion (ADR-059 §Step 1-3).
// Tipos públicos exportados por features/cities/dubai/index.ts.

export interface DubaiZoneSummary {
  readonly slug: string;
  readonly nameEs: string;
  readonly nameEn: string;
  readonly lat: number;
  readonly lng: number;
}

export interface DubaiProjectSummary {
  readonly slug: string;
  readonly projectName: string;
  readonly zoneSlug: string;
  readonly priceMinUsd: number;
  readonly priceMaxUsd: number;
  readonly priceMinAed: number;
  readonly priceMaxAed: number;
  readonly developer: string;
  readonly status: 'off_plan' | 'ready' | 'completed' | 'under_construction';
}

export type DubaiScoreType = 'pulse' | 'futures_alpha' | 'ghost' | 'zone_alpha';

export interface DubaiIEScoreInsert {
  readonly zoneSlug: string;
  readonly scoreType: DubaiScoreType;
  readonly scoreValue: number;
  readonly level: 0 | 1 | 2 | 3 | 4 | 5;
  readonly tier: 1 | 2 | 3 | 4;
  readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  readonly provenance: {
    readonly is_synthetic: true;
    readonly adr: 'ADR-059';
    readonly source: 'F14.1.0_synthetic_baseline_dubai_pre_reelly';
  };
}
