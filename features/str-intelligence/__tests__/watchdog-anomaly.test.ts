import { describe, expect, it } from 'vitest';
import {
  type AnomalyMarketSnapshot,
  detectMarketAnomalies,
  scanMarketsForAnomalies,
  WATCHDOG_THRESHOLDS,
} from '../lib/watchdog/anomaly-detector';

function snap(overrides: Partial<AnomalyMarketSnapshot> = {}): AnomalyMarketSnapshot {
  return {
    market_id: 'M1',
    period: '2026-04-01',
    adr_minor: 2_500_00,
    occupancy_rate: 0.65,
    active_listings: 100,
    ...overrides,
  };
}

describe('detectMarketAnomalies', () => {
  it('detecta ADR drop > 30%', () => {
    const anomalies = detectMarketAnomalies([
      snap({ period: '2026-04-01', adr_minor: 1_500_00 }),
      snap({ period: '2026-03-01', adr_minor: 2_500_00 }),
    ]);
    const adrAnomaly = anomalies.find((a) => a.anomaly_type === 'adr_drop');
    expect(adrAnomaly).toBeDefined();
    expect(adrAnomaly?.delta_pct).toBeCloseTo(-0.4, 2);
  });

  it('NO detecta ADR drop si está dentro del threshold', () => {
    const anomalies = detectMarketAnomalies([
      snap({ period: '2026-04-01', adr_minor: 2_400_00 }),
      snap({ period: '2026-03-01', adr_minor: 2_500_00 }),
    ]);
    expect(anomalies.find((a) => a.anomaly_type === 'adr_drop')).toBeUndefined();
  });

  it('detecta occupancy drop > 20%', () => {
    const anomalies = detectMarketAnomalies([
      snap({ period: '2026-04-01', occupancy_rate: 0.4 }),
      snap({ period: '2026-03-01', occupancy_rate: 0.6 }),
    ]);
    const occAnomaly = anomalies.find((a) => a.anomaly_type === 'occupancy_drop');
    expect(occAnomaly).toBeDefined();
    expect(occAnomaly?.severity).toBe('medium'); // -33% / -20% threshold = 1.67x = medium
  });

  it('detecta listings drop > 15%', () => {
    const anomalies = detectMarketAnomalies([
      snap({ period: '2026-04-01', active_listings: 70 }),
      snap({ period: '2026-03-01', active_listings: 100 }),
    ]);
    expect(anomalies.find((a) => a.anomaly_type === 'listings_drop')).toBeDefined();
  });

  it('severidad: -60% adr = high (2x threshold)', () => {
    const anomalies = detectMarketAnomalies([
      snap({ period: '2026-04-01', adr_minor: 1_000_00 }),
      snap({ period: '2026-03-01', adr_minor: 2_500_00 }),
    ]);
    const adrAnomaly = anomalies.find((a) => a.anomaly_type === 'adr_drop');
    expect(adrAnomaly?.severity).toBe('high');
  });

  it('severidad: -32% adr = low (apenas pasa threshold)', () => {
    const anomalies = detectMarketAnomalies([
      snap({ period: '2026-04-01', adr_minor: 1_700_00 }),
      snap({ period: '2026-03-01', adr_minor: 2_500_00 }),
    ]);
    const adrAnomaly = anomalies.find((a) => a.anomaly_type === 'adr_drop');
    expect(adrAnomaly?.severity).toBe('low');
  });

  it('valores null no producen anomalies', () => {
    const anomalies = detectMarketAnomalies([
      snap({ period: '2026-04-01', adr_minor: null, occupancy_rate: null, active_listings: null }),
      snap({ period: '2026-03-01' }),
    ]);
    expect(anomalies).toHaveLength(0);
  });

  it('< 2 snapshots → []', () => {
    expect(detectMarketAnomalies([snap()])).toHaveLength(0);
    expect(detectMarketAnomalies([])).toHaveLength(0);
  });

  it('thresholds tienen signo correcto (todos negativos)', () => {
    expect(WATCHDOG_THRESHOLDS.adr_drop_pct).toBeLessThan(0);
    expect(WATCHDOG_THRESHOLDS.occupancy_drop_pct).toBeLessThan(0);
    expect(WATCHDOG_THRESHOLDS.listings_drop_pct).toBeLessThan(0);
  });
});

describe('scanMarketsForAnomalies', () => {
  it('agrega anomalías de múltiples markets', () => {
    const map = new Map<string, AnomalyMarketSnapshot[]>();
    map.set('M1', [
      snap({ market_id: 'M1', period: '2026-04-01', adr_minor: 1_000_00 }),
      snap({ market_id: 'M1', period: '2026-03-01', adr_minor: 2_500_00 }),
    ]);
    map.set('M2', [
      snap({ market_id: 'M2', period: '2026-04-01', occupancy_rate: 0.3 }),
      snap({ market_id: 'M2', period: '2026-03-01', occupancy_rate: 0.7 }),
    ]);
    const anomalies = scanMarketsForAnomalies(map);
    expect(anomalies.length).toBeGreaterThanOrEqual(2);
    expect(anomalies.some((a) => a.market_id === 'M1' && a.anomaly_type === 'adr_drop')).toBe(true);
    expect(anomalies.some((a) => a.market_id === 'M2' && a.anomaly_type === 'occupancy_drop')).toBe(
      true,
    );
  });
});
