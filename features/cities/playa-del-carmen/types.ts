// ADR-059 — Playa del Carmen city expansion types
// FASE 14.1 sub-agent 1
// Tipos públicos consumidos por landing + cross-features (M02 + M17 H2)

export interface PlayaScoreSnapshot {
  readonly pulse: number;
  readonly futures: number;
  readonly ghost: number;
  readonly alpha: number;
}

export interface PlayaZoneSummary {
  readonly zoneId: string;
  readonly slug: string;
  readonly nameEs: string;
  readonly nameEn: string;
  readonly lat: number;
  readonly lng: number;
  readonly scoreSnapshot: PlayaScoreSnapshot;
}

export interface PlayaProjectSummary {
  readonly id: string;
  readonly nombre: string;
  readonly slug: string;
  readonly zoneSlug: string;
  readonly priceMin: number;
  readonly priceMax: number;
  readonly currency: string;
}
