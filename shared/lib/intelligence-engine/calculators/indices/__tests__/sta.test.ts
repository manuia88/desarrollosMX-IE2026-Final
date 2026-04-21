import { describe, expect, it } from 'vitest';
import {
  computeDmxSta,
  DEFAULT_STA_WEIGHTS,
  getLabelKey,
  HISTORY_WINDOW_MONTHS,
  methodology,
  reasoning_template,
  scoreBandFor,
  version,
} from '../sta';

// Helper — genera historia de precios estable (low volatility).
function stableHistory(months: number, basePrice: number, variationPct = 0.02): readonly number[] {
  return Array.from({ length: months }, (_, i) => basePrice * (1 + ((i % 3) - 1) * variationPct));
}

// Helper — genera historia volátil.
function volatileHistory(months: number, basePrice: number): readonly number[] {
  return Array.from({ length: months }, (_, i) => basePrice * (1 + ((i * 37) % 100) / 100 - 0.5));
}

describe('DMX-STA Estabilidad Institucional', () => {
  it('declara version, methodology volatility critical + score_bands + reasoning', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toContain('stddev_price_36m');
    const critical = methodology.dependencies.filter((d) => d.critical).map((d) => d.score_id);
    expect(critical).toContain('volatility_36m_inv');
    const sumW = Object.values(DEFAULT_STA_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 3);
    expect(HISTORY_WINDOW_MONTHS).toBe(36);
    expect(methodology.score_bands.excelente_min).toBe(80);
    expect(reasoning_template).toContain('{score_band}');
  });

  it('getLabelKey + scoreBandFor — 4 bandas + insufficient', () => {
    expect(scoreBandFor(85)).toBe('Excelente');
    expect(scoreBandFor(70)).toBe('Bueno');
    expect(scoreBandFor(50)).toBe('Regular');
    expect(scoreBandFor(30)).toBe('Bajo');
    expect(getLabelKey(85, 'high')).toBe('ie.index.sta.excelente');
    expect(getLabelKey(70, 'medium')).toBe('ie.index.sta.bueno');
    expect(getLabelKey(50, 'medium')).toBe('ie.index.sta.regular');
    expect(getLabelKey(30, 'low')).toBe('ie.index.sta.bajo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.sta.insufficient');
  });

  it('happy path — zona estable tipo Polanco con 36m history + liquidez + IRE', () => {
    const result = computeDmxSta({
      price_m2_history_36m: stableHistory(36, 85000, 0.01),
      transactions_count_12m: 100,
      IRE_value: 85,
      MOM_history_12m: stableHistory(12, 70, 0.01),
      F08_value: 85,
      universe_period: '2026-04-01',
    });
    expect(result.value).toBeGreaterThanOrEqual(70);
    expect(['Bueno', 'Excelente']).toContain(result.components.score_band);
    expect(result.confidence).toBe('high');
    expect(result.components.history_months_available).toBe(36);
  });

  it('missing data con fallback — IRE null + F08 null pero history 36m ok', () => {
    const result = computeDmxSta({
      price_m2_history_36m: stableHistory(36, 80000, 0.015),
      transactions_count_12m: 80,
      IRE_value: null,
      MOM_history_12m: stableHistory(12, 65, 0.02),
      F08_value: null,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).not.toBe('insufficient_data');
    expect(result.components.IRE).toBeNull();
    expect(result.components.F08).toBeNull();
    expect(result.components._meta.missing_components).toContain('IRE');
    expect(result.components._meta.missing_components).toContain('F08');
  });

  it('insufficient — history <12m → insufficient_data', () => {
    const result = computeDmxSta({
      price_m2_history_36m: stableHistory(6, 70000),
      transactions_count_12m: 50,
      IRE_value: 70,
      MOM_history_12m: stableHistory(6, 60),
      F08_value: 70,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.value).toBe(0);
    expect(result.components._meta.fallback_reason).toContain('history_below_min');
  });

  it('nested IRE lookup funciona — cuando IRE disponible se incluye en score', () => {
    const result = computeDmxSta({
      price_m2_history_36m: stableHistory(36, 75000, 0.02),
      transactions_count_12m: 70,
      IRE_value: 75,
      MOM_history_12m: stableHistory(12, 60, 0.03),
      F08_value: 75,
      universe_period: '2026-04-01',
    });
    expect(result.components.IRE).not.toBeNull();
    expect(result.components.IRE?.value).toBe(75);
  });

  it('nested IRE lookup falla — IRE null, pero volatility presente → no insufficient (solo degrade)', () => {
    const result = computeDmxSta({
      price_m2_history_36m: stableHistory(36, 75000, 0.02),
      transactions_count_12m: 70,
      IRE_value: null,
      MOM_history_12m: stableHistory(12, 60, 0.03),
      F08_value: 75,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).not.toBe('insufficient_data');
    expect(result.components.IRE).toBeNull();
  });

  it('edge 0 — precios muy volátiles → volatility_inv bajo → score bajo', () => {
    const result = computeDmxSta({
      price_m2_history_36m: volatileHistory(36, 50000),
      transactions_count_12m: 20,
      IRE_value: 30,
      MOM_history_12m: volatileHistory(12, 50),
      F08_value: 40,
      universe_period: '2026-04-01',
    });
    expect(result.value).toBeLessThan(65);
    expect(['Bajo', 'Regular']).toContain(result.components.score_band);
  });

  it('edge 100 — estabilidad perfecta (std=0) + liquidez máxima + todos altos', () => {
    const flat = Array.from({ length: 36 }, () => 80000);
    const flatMom = Array.from({ length: 12 }, () => 70);
    const result = computeDmxSta({
      price_m2_history_36m: flat,
      transactions_count_12m: 150,
      IRE_value: 100,
      MOM_history_12m: flatMom,
      F08_value: 100,
      universe_period: '2026-04-01',
    });
    expect(result.value).toBeGreaterThanOrEqual(95);
    expect(result.components.score_band).toBe('Excelente');
  });

  it('score band correcto — zona mediana estable → Bueno/Regular', () => {
    const result = computeDmxSta({
      price_m2_history_36m: stableHistory(36, 55000, 0.04),
      transactions_count_12m: 50,
      IRE_value: 60,
      MOM_history_12m: stableHistory(12, 55, 0.04),
      F08_value: 55,
      universe_period: '2026-04-01',
    });
    expect(['Regular', 'Bueno']).toContain(result.components.score_band);
  });

  it('circuit breaker — Δ>20% triggers flag', () => {
    const result = computeDmxSta({
      price_m2_history_36m: stableHistory(36, 80000, 0.01),
      transactions_count_12m: 100,
      IRE_value: 85,
      MOM_history_12m: stableHistory(12, 70, 0.01),
      F08_value: 85,
      universe_period: '2026-04-01',
      previous_value: 30,
    });
    expect(result.components._meta.circuit_breaker_triggered).toBe(true);
  });

  it('confidence proportional a history — 24m+ → medium; <24m → low', () => {
    const res24 = computeDmxSta({
      price_m2_history_36m: stableHistory(24, 70000, 0.02),
      transactions_count_12m: 60,
      IRE_value: 70,
      MOM_history_12m: stableHistory(12, 60, 0.02),
      F08_value: 70,
      universe_period: '2026-04-01',
    });
    expect(['medium', 'high']).toContain(res24.confidence);

    const res15 = computeDmxSta({
      price_m2_history_36m: stableHistory(15, 70000, 0.02),
      transactions_count_12m: 40,
      IRE_value: 70,
      MOM_history_12m: stableHistory(12, 60, 0.02),
      F08_value: 70,
      universe_period: '2026-04-01',
    });
    expect(res15.confidence).toBe('low');
    expect(res15.components._meta.limitation).toContain('history_partial');
  });

  it('shadow_mode propaga a _meta', () => {
    const result = computeDmxSta({
      price_m2_history_36m: stableHistory(36, 70000, 0.02),
      transactions_count_12m: 60,
      IRE_value: 70,
      MOM_history_12m: stableHistory(12, 60, 0.02),
      F08_value: 70,
      universe_period: '2026-04-01',
      shadow_mode: true,
    });
    expect(result.components._meta.shadow).toBe(true);
  });
});
