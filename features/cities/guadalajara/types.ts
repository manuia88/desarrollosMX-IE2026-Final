// FASE 14.1 — Guadalajara city expansion (ADR-059 §Step 1-3).
// Tipos públicos exportados por features/cities/guadalajara/index.ts.

export interface GdlZoneSummary {
  readonly slug: string;
  readonly nameEs: string;
  readonly nameEn: string;
  readonly lat: number;
  readonly lng: number;
}

export interface GdlProjectSummary {
  readonly slug: string;
  readonly nombre: string;
  readonly zoneSlug: string;
  readonly priceMinMxn: number;
  readonly priceMaxMxn: number;
  readonly tipo: 'departamento' | 'casa' | 'townhouse' | 'penthouse';
  readonly tier: 'lujo' | 'premium' | 'mid-premium' | 'high-rise';
}

export type GdlScoreType = 'pulse' | 'futures_alpha' | 'ghost' | 'zone_alpha';

export interface GdlIEScoreInsert {
  readonly zoneSlug: string;
  readonly scoreType: GdlScoreType;
  readonly scoreValue: number;
  readonly level: 0 | 1 | 2 | 3 | 4 | 5;
  readonly tier: 1 | 2 | 3 | 4;
  readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  readonly provenance: {
    readonly is_synthetic: true;
    readonly adr: 'ADR-059';
    readonly source: 'F14.1.0_synthetic_baseline';
  };
}
