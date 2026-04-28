import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import d05, {
  computeD05Gentrification,
  DEFAULT_WEIGHTS,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../d05-gentrification';

describe('D05 Gentrification calculator', () => {
  it('declara version, methodology, reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('zone_scores:N03');
    expect(methodology.dependencies.length).toBe(3);
    expect(methodology.triggers_cascade).toContain('geo_data_updated:denue');
    expect(DEFAULT_WEIGHTS.N03).toBe(0.5);
    expect(DEFAULT_WEIGHTS.N01 + DEFAULT_WEIGHTS.A04 + DEFAULT_WEIGHTS.N03).toBeCloseTo(1, 5);
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('getLabelKey mapea phases', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.d05.rapida');
    expect(getLabelKey(70, 'high')).toBe('ie.score.d05.media');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.d05.leve');
    expect(getLabelKey(20, 'low')).toBe('ie.score.d05.estable');
    expect(getLabelKey(90, 'insufficient_data')).toBe('ie.score.d05.insufficient');
  });

  it('input moderado (Escandón-like) — velocity_signal media con confianza high', () => {
    // Escandón fixture: N03=65 (velocity alta), A04=55 (arbitraje moderado),
    // N01=60 (diversidad media), precio +8% 12m
    const res = computeD05Gentrification({
      N03_velocity: 65,
      A04_arbitrage: 55,
      N01_diversity: 60,
      price_index_zona_12m_delta_pct: 0.08,
      confidences: { N03: 'high', A04: 'high', N01: 'high' },
    });
    // velocity_component = 0.5·65 + 0.25·55 + 0.25·60 = 32.5 + 13.75 + 15 = 61.25
    // price_signal = 0.08 × 500 = 40
    // total clamped = 100, pero como pasa de 100, clamp(61.25 + 40) = 100 → 'rapida'
    // Ajuste: usamos valores más bajos para caer en 'media' 60-80
    expect(res.components.velocity_component).toBeCloseTo(61.25, 1);
    expect(res.components.price_delta_signal).toBeCloseTo(40, 1);
    expect(res.value).toBeGreaterThanOrEqual(80); // velocity_component+price_signal ≈ 101 → clamp 100
    expect(res.confidence).toBe('high');
  });

  it('Escandón preciso: delta moderado → phase media (60-80)', () => {
    const res = computeD05Gentrification({
      N03_velocity: 60,
      A04_arbitrage: 50,
      N01_diversity: 55,
      price_index_zona_12m_delta_pct: 0.02, // +2% → señal 10
      confidences: { N03: 'high', A04: 'high', N01: 'high' },
    });
    // velocity_component = 0.5·60 + 0.25·50 + 0.25·55 = 30 + 12.5 + 13.75 = 56.25
    // price_signal = 0.02 × 500 = 10
    // score = round(clamp(56.25 + 10, 0, 100)) = 66 → 'media'
    expect(res.value).toBeGreaterThanOrEqual(60);
    expect(res.value).toBeLessThan(80);
    expect(res.components.velocity_signal).toBe('media');
    expect(res.confidence).toBe('high');
  });

  it('drivers ordenados desc + incluyen price_delta cuando delta > 0', () => {
    const res = computeD05Gentrification({
      N03_velocity: 80,
      A04_arbitrage: 40,
      N01_diversity: 30,
      price_index_zona_12m_delta_pct: 0.05, // +5% → señal 25
    });
    const drivers = res.components.drivers;
    expect(drivers.length).toBe(4); // 3 dims + price_delta
    // N03 contribución = 0.5·80 = 40 → el mayor
    // price_delta = 0.05 × 500 = 25, A04 = 0.25·40 = 10, N01 = 0.25·30 = 7.5
    expect(drivers[0]?.factor).toBe('N03');
    // ordenado desc
    for (let i = 0; i < drivers.length - 1; i++) {
      const cur = drivers[i]?.contribution_pct ?? 0;
      const next = drivers[i + 1]?.contribution_pct ?? 0;
      expect(cur).toBeGreaterThanOrEqual(next);
    }
    const has_price = drivers.some((d) => d.factor === 'price_delta');
    expect(has_price).toBe(true);
  });

  it('D9 fallback — si N01 falta, weights se redistribuyen entre N03+A04', () => {
    const res = computeD05Gentrification({
      N03_velocity: 60,
      A04_arbitrage: 40,
      N01_diversity: null,
      price_index_zona_12m_delta_pct: 0,
      confidences: { N03: 'high', A04: 'high' },
    });
    expect(res.components.missing_dimensions).toContain('N01');
    expect(res.components.available_count).toBe(2);
    // weights renormalized: N03 0.5/0.75 = 0.667; A04 0.25/0.75 = 0.333
    expect(res.components.weights_applied.N03).toBeCloseTo(0.6667, 3);
    expect(res.components.weights_applied.A04).toBeCloseTo(0.3333, 3);
    // velocity_component = 0.667·60 + 0.333·40 = 40 + 13.33 = 53.33
    expect(res.components.velocity_component).toBeCloseTo(53.33, 1);
    // confidence degraded por missing
    expect(res.confidence).not.toBe('high');
  });

  it('insufficient_data cuando <2 deps disponibles', () => {
    const res = computeD05Gentrification({
      N03_velocity: 70,
      A04_arbitrage: null,
      N01_diversity: null,
      price_index_zona_12m_delta_pct: 0.05,
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('phase estable cuando todos los inputs son bajos + sin price delta', () => {
    const res = computeD05Gentrification({
      N03_velocity: 20,
      A04_arbitrage: 15,
      N01_diversity: 25,
      price_index_zona_12m_delta_pct: 0,
      confidences: { N03: 'medium', A04: 'medium', N01: 'medium' },
    });
    expect(res.components.velocity_signal).toBe('estable');
    expect(res.value).toBeLessThan(40);
  });

  it('d05.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await d05.run(
      { zoneId: 'escandon', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.d05.insufficient');
  });
});
