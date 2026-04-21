import { describe, expect, it } from 'vitest';
import {
  computeE04AnomalyDetector,
  computeRollingStats,
  getLabelKey,
  MIN_SAMPLES,
  methodology,
  THRESHOLD_HIGH_SIGMA,
  THRESHOLD_LOW_SIGMA,
  THRESHOLD_MEDIUM_SIGMA,
  version,
  zScore,
} from '../e04-anomaly-detector';

describe('E04 Anomaly Detector', () => {
  it('declara methodology + thresholds + min samples', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.severity_thresholds.alta).toBe(THRESHOLD_HIGH_SIGMA);
    expect(methodology.severity_thresholds.moderada).toBe(THRESHOLD_MEDIUM_SIGMA);
    expect(methodology.severity_thresholds.leve).toBe(THRESHOLD_LOW_SIGMA);
    expect(methodology.baseline_window_days).toBe(30);
  });

  it('computeRollingStats baseline con 30 samples estable', () => {
    const values = Array.from({ length: 30 }, () => 50); // constante
    const stats = computeRollingStats(values);
    expect(stats.mean).toBeCloseTo(50, 5);
    expect(stats.stddev).toBe(0);
    expect(stats.samples).toBe(30);
  });

  it('zScore devuelve null si samples < MIN_SAMPLES', () => {
    const stats = { mean: 10, stddev: 2, samples: MIN_SAMPLES - 1 };
    expect(zScore(20, stats)).toBeNull();
  });

  it('zScore devuelve null si stddev === 0', () => {
    const stats = { mean: 10, stddev: 0, samples: 20 };
    expect(zScore(20, stats)).toBeNull();
  });

  it('anomalía ALTA: delta_price con z=5 → severity alta + value bajo', () => {
    const res = computeE04AnomalyDetector({
      current_deltas: { delta_price: 25, delta_F08: 0, delta_search_volume: 0 },
      baselines: {
        delta_price: { mean: 0, stddev: 5, samples: 30 }, // z = 5
        delta_F08: { mean: 0, stddev: 1, samples: 30 },
        delta_search_volume: { mean: 0, stddev: 1, samples: 30 },
      },
    });
    expect(res.components.anomaly_severity).toBe('alta');
    expect(res.components.triggered_alerts).toContain('price');
    expect(res.components.max_abs_z).toBeGreaterThan(THRESHOLD_HIGH_SIGMA);
    // value = 100 - min(100, (5/3)*100) = 100 - 100 = 0
    expect(res.value).toBe(0);
    expect(res.confidence).toBe('high'); // 30 samples
  });

  it('anomalía MODERADA: delta_F08 con z=2.5 → severity moderada + value medio', () => {
    const res = computeE04AnomalyDetector({
      current_deltas: { delta_price: 0, delta_F08: 12.5, delta_search_volume: 0 },
      baselines: {
        delta_price: { mean: 0, stddev: 10, samples: 25 },
        delta_F08: { mean: 0, stddev: 5, samples: 25 }, // z = 2.5
        delta_search_volume: { mean: 0, stddev: 10, samples: 25 },
      },
    });
    expect(res.components.anomaly_severity).toBe('moderada');
    expect(res.components.triggered_alerts).toContain('score');
    expect(res.components.max_abs_z).toBeCloseTo(2.5, 1);
    // value = 100 - (2.5/3)*100 ≈ 16.67 → round = 17
    expect(res.value).toBe(17);
  });

  it('anomalía LEVE: search z=1.8 → severity leve + triggered search', () => {
    const res = computeE04AnomalyDetector({
      current_deltas: { delta_price: 0, delta_F08: 0, delta_search_volume: 9 },
      baselines: {
        delta_price: { mean: 0, stddev: 10, samples: 30 },
        delta_F08: { mean: 0, stddev: 10, samples: 30 },
        delta_search_volume: { mean: 0, stddev: 5, samples: 30 }, // z = 1.8
      },
    });
    expect(res.components.anomaly_severity).toBe('leve');
    expect(res.components.triggered_alerts).toContain('search');
    expect(res.components.triggered_alerts).not.toContain('price');
  });

  it('edge ESTABLE: todos los z bajos → severity estable + value alto', () => {
    const res = computeE04AnomalyDetector({
      current_deltas: { delta_price: 1, delta_F08: 0.5, delta_search_volume: 1 },
      baselines: {
        delta_price: { mean: 0, stddev: 2, samples: 30 }, // z = 0.5
        delta_F08: { mean: 0, stddev: 2, samples: 30 }, // z = 0.25
        delta_search_volume: { mean: 0, stddev: 2, samples: 30 }, // z = 0.5
      },
    });
    expect(res.components.anomaly_severity).toBe('estable');
    expect(res.components.triggered_alerts).toHaveLength(0);
    expect(res.value).toBeGreaterThanOrEqual(80);
    expect(res.confidence).toBe('high');
  });

  it('insufficient_data cuando ninguna baseline tiene samples suficientes', () => {
    const res = computeE04AnomalyDetector({
      current_deltas: { delta_price: 10, delta_F08: 5, delta_search_volume: 3 },
      baselines: {
        delta_price: { mean: 0, stddev: 2, samples: 3 }, // < MIN
        delta_F08: { mean: 0, stddev: 2, samples: 4 }, // < MIN
        delta_search_volume: null,
      },
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.triggered_alerts).toHaveLength(0);
  });

  it('max |z| correctamente identifica la peor métrica', () => {
    const res = computeE04AnomalyDetector({
      current_deltas: { delta_price: 2, delta_F08: 10, delta_search_volume: 5 },
      baselines: {
        delta_price: { mean: 0, stddev: 1, samples: 30 }, // z=2
        delta_F08: { mean: 0, stddev: 5, samples: 30 }, // z=2
        delta_search_volume: { mean: 0, stddev: 1, samples: 30 }, // z=5 → MAX
      },
    });
    expect(res.components.max_abs_z).toBeCloseTo(5, 1);
    expect(res.components.anomaly_severity).toBe('alta');
    expect(res.components.triggered_alerts).toContain('search');
  });

  it('entity_list_breakdown se propaga a components', () => {
    const breakdown = [
      { entity_id: 'p1', contribution: 0.6 },
      { entity_id: 'p2', contribution: 0.4 },
    ];
    const res = computeE04AnomalyDetector({
      current_deltas: { delta_price: 1, delta_F08: 0, delta_search_volume: 0 },
      baselines: {
        delta_price: { mean: 0, stddev: 2, samples: 30 },
        delta_F08: { mean: 0, stddev: 1, samples: 30 },
        delta_search_volume: { mean: 0, stddev: 1, samples: 30 },
      },
      entity_list_breakdown: breakdown,
    });
    expect(res.components.entity_list_breakdown).toEqual(breakdown);
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.e04.estable');
    expect(getLabelKey(65, 'high')).toBe('ie.score.e04.leve');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.e04.moderada');
    expect(getLabelKey(20, 'high')).toBe('ie.score.e04.alta');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.e04.insufficient');
  });
});
