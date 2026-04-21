// Shared contracts for the Pulse Score feature (BLOQUE 11.F).
// Used by calculator (shared/lib/intelligence-engine/calculators/pulse/),
// ingestion adapters (shared/lib/intelligence-engine/sources/pulse-signals.ts),
// tRPC router (server/trpc/routers/pulse.ts), and UI (features/pulse-score/).
//
// Pulse Score mide "salud vital" de una zona en escala 0-100 combinando:
//   - Altas/bajas negocios (DENUE FASE 07)
//   - Llamadas 911 (API pública datos.cdmx.gob.mx)
//   - Tráfico peatonal día/noche (H1 stub → proxy N04/N08)
//   - Eventos culturales (H1 stub)
//   - Permisos construcción (H1 stub)
//
// Persiste en public.zone_pulse_scores (migration 20260421100000).

export type PulseScopeType = 'colonia' | 'alcaldia' | 'city' | 'estado';
export type PulseConfidence = 'high' | 'medium' | 'low' | 'insufficient_data';

export const PULSE_SIGNAL_KEYS = [
  'business_net_flow',
  'foot_traffic',
  'calls_911',
  'events',
  'ecosystem',
] as const;
export type PulseSignalKey = (typeof PULSE_SIGNAL_KEYS)[number];

export const PULSE_WEIGHTS: Readonly<Record<PulseSignalKey, number>> = {
  business_net_flow: 0.25,
  foot_traffic: 0.2,
  calls_911: 0.2,
  events: 0.15,
  ecosystem: 0.2,
} as const;

export interface PulseSignalValue {
  readonly key: PulseSignalKey;
  readonly raw_value: number | null;
  readonly normalized_0_100: number | null;
  readonly weight: number;
  readonly source: string;
  readonly period_date: string | null;
  readonly confidence: number; // 0..1 per signal
}

export interface PulseComponent {
  readonly value: number | null;
  readonly weight: number;
  readonly source: string;
  readonly available: boolean;
}

export interface PulseComponents extends Record<string, unknown> {
  readonly business_net_flow: PulseComponent;
  readonly foot_traffic: PulseComponent;
  readonly calls_911: PulseComponent;
  readonly events: PulseComponent;
  readonly ecosystem: PulseComponent;
  readonly weights_used: Readonly<Record<string, number>>;
  readonly data_sources_available: number; // 0..5
  readonly coverage_pct: number; // (available / 5) * 100
  readonly raw_signals: {
    readonly business_births: number;
    readonly business_deaths: number;
    readonly foot_traffic_day: number | null;
    readonly foot_traffic_night: number | null;
    readonly calls_911_count: number | null;
    readonly events_count: number | null;
  };
}

export interface PulseScoreRow {
  readonly id: string;
  readonly scope_type: PulseScopeType;
  readonly scope_id: string;
  readonly country_code: string;
  readonly period_date: string;
  readonly business_births: number;
  readonly business_deaths: number;
  readonly foot_traffic_day: number | null;
  readonly foot_traffic_night: number | null;
  readonly calls_911_count: number | null;
  readonly events_count: number | null;
  readonly pulse_score: number | null;
  readonly confidence: PulseConfidence | null;
  readonly components: PulseComponents;
  readonly calculated_at: string;
}

// Signal bundle returned by sources/pulse-signals.ts adapters.
export interface PulseSignals {
  readonly business_births: number;
  readonly business_deaths: number;
  readonly foot_traffic_day: number | null;
  readonly foot_traffic_night: number | null;
  readonly calls_911_count: number | null;
  readonly events_count: number | null;
  readonly construction_permits_count: number | null;
  readonly sources_available: number; // 0..5
  readonly per_signal_confidence: Readonly<Record<PulseSignalKey, number>>;
}

export interface PulseComputeResult {
  readonly value: number; // 0-100 rounded
  readonly confidence: PulseConfidence;
  readonly components: PulseComponents;
}

// History point for sparkline UI.
export interface PulseHistoryPoint {
  readonly period_date: string;
  readonly pulse_score: number | null;
  readonly confidence: PulseConfidence | null;
}
