// STR Watchdog Anomaly Detector — FASE 07b / BLOQUE 7b.P (soft upgrade).
//
// Detecta anomalías nightly sobre series de aggregates y listings:
//   1. ADR drop > 30% MoM (market level).
//   2. Occupancy drop > 20% MoM (market level).
//   3. Listings count drop > 15% MoM (market level — proxy de delistings).
//
// Pure: input es snapshots ordenados (más reciente primero). Output es array
// de anomalías estructuradas listas para INSERT en str_anomalies si la fase
// futura crea esa tabla (no requerida ahora — el caller puede log/alert).

export interface AnomalyMarketSnapshot {
  readonly market_id: string;
  readonly period: string; // YYYY-MM-DD
  readonly adr_minor: number | null;
  readonly occupancy_rate: number | null;
  readonly active_listings: number | null;
}

export type AnomalyType = 'adr_drop' | 'occupancy_drop' | 'listings_drop';

export interface MarketAnomaly {
  readonly market_id: string;
  readonly anomaly_type: AnomalyType;
  readonly severity: 'low' | 'medium' | 'high';
  readonly current_period: string;
  readonly previous_period: string;
  readonly current_value: number;
  readonly previous_value: number;
  readonly delta_pct: number; // negativo = drop.
  readonly threshold_pct: number; // umbral activado.
}

export const WATCHDOG_THRESHOLDS = {
  adr_drop_pct: -0.3,
  occupancy_drop_pct: -0.2,
  listings_drop_pct: -0.15,
} as const;

function severityFromDelta(deltaPct: number, threshold: number): 'low' | 'medium' | 'high' {
  // delta negativo, threshold negativo. Más negativo el delta = más severo.
  const ratio = deltaPct / threshold; // > 1 = peor que threshold.
  if (ratio >= 2) return 'high';
  if (ratio >= 1.5) return 'medium';
  return 'low';
}

function anomalyForMetric(
  marketId: string,
  current: AnomalyMarketSnapshot,
  previous: AnomalyMarketSnapshot,
  type: AnomalyType,
  currentValue: number | null,
  previousValue: number | null,
  thresholdPct: number,
): MarketAnomaly | null {
  if (currentValue == null || previousValue == null || previousValue === 0) return null;
  const delta = (currentValue - previousValue) / previousValue;
  if (delta > thresholdPct) return null; // delta menos negativo que threshold → no anomaly.
  return {
    market_id: marketId,
    anomaly_type: type,
    severity: severityFromDelta(delta, thresholdPct),
    current_period: current.period,
    previous_period: previous.period,
    current_value: currentValue,
    previous_value: previousValue,
    delta_pct: Math.round(delta * 10000) / 10000,
    threshold_pct: thresholdPct,
  };
}

export function detectMarketAnomalies(
  snapshots: readonly AnomalyMarketSnapshot[],
): MarketAnomaly[] {
  if (snapshots.length < 2) return [];
  // Asume ordenado por period DESC.
  const sorted = [...snapshots].sort((a, b) => b.period.localeCompare(a.period));
  const current = sorted[0];
  const previous = sorted[1];
  if (!current || !previous) return [];
  if (current.market_id !== previous.market_id) return [];

  const anomalies: MarketAnomaly[] = [];

  const adrAnomaly = anomalyForMetric(
    current.market_id,
    current,
    previous,
    'adr_drop',
    current.adr_minor,
    previous.adr_minor,
    WATCHDOG_THRESHOLDS.adr_drop_pct,
  );
  if (adrAnomaly) anomalies.push(adrAnomaly);

  const occAnomaly = anomalyForMetric(
    current.market_id,
    current,
    previous,
    'occupancy_drop',
    current.occupancy_rate,
    previous.occupancy_rate,
    WATCHDOG_THRESHOLDS.occupancy_drop_pct,
  );
  if (occAnomaly) anomalies.push(occAnomaly);

  const listingsAnomaly = anomalyForMetric(
    current.market_id,
    current,
    previous,
    'listings_drop',
    current.active_listings,
    previous.active_listings,
    WATCHDOG_THRESHOLDS.listings_drop_pct,
  );
  if (listingsAnomaly) anomalies.push(listingsAnomaly);

  return anomalies;
}

export function scanMarketsForAnomalies(
  marketSnapshots: ReadonlyMap<string, readonly AnomalyMarketSnapshot[]>,
): MarketAnomaly[] {
  const allAnomalies: MarketAnomaly[] = [];
  for (const [, snaps] of marketSnapshots) {
    allAnomalies.push(...detectMarketAnomalies(snaps));
  }
  return allAnomalies;
}
