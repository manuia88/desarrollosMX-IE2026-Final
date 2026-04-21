import { describe, expect, it } from 'vitest';
import {
  computeDmxGnt,
  DEFAULT_GNT_WEIGHTS,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../gnt';

describe('DMX-GNT Gentrificación Tracker', () => {
  it('declara version, methodology (sin critical deps duras) + weights sum 1', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toContain('MOM_12m');
    const sumW = Object.values(DEFAULT_GNT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 3);
    expect(methodology.sources.length).toBeGreaterThanOrEqual(6);
    expect(reasoning_template).toContain('{fase}');
  });

  it('getLabelKey cubre 5 fases + insufficient', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.index.gnt.post_gentrification');
    expect(getLabelKey(70, 'medium')).toBe('ie.index.gnt.peaked');
    expect(getLabelKey(50, 'medium')).toBe('ie.index.gnt.active');
    expect(getLabelKey(30, 'low')).toBe('ie.index.gnt.early');
    expect(getLabelKey(10, 'low')).toBe('ie.index.gnt.dormant');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.gnt.insufficient');
  });

  it('happy path — zone en etapa active con datos completos', () => {
    const result = computeDmxGnt({
      MOM_now: 75,
      MOM_12m_ago: 55,
      influencer_heat_raw: 70,
      denue_alpha_count_6m: 8,
      migration_high_income_score: 65,
      N09_now: 80,
      N09_12m_ago: 60,
      price_m2_now: 60000,
      price_m2_6m_ago: 52000,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).not.toBe('insufficient_data');
    expect(['early', 'active', 'peaked', 'post_gentrification']).toContain(result.components.fase);
    expect(result.components.coverage_pct).toBe(100);
    expect(result.components.limitations).toEqual([]);
  });

  it('missing data con fallback — limitations arrays registradas para tablas futuras', () => {
    const result = computeDmxGnt({
      MOM_now: 70,
      MOM_12m_ago: 55,
      influencer_heat_raw: null, // tabla H2 futura no disponible
      denue_alpha_count_6m: 5,
      migration_high_income_score: null, // tabla H2 futura no disponible
      N09_now: 75,
      N09_12m_ago: 60,
      price_m2_now: 55000,
      price_m2_6m_ago: 50000,
      universe_period: '2026-04-01',
      limitations_external: [
        'tabla_influencer_heat_zones_no_disponible',
        'tabla_zone_migration_flows_no_disponible',
      ],
    });
    expect(result.confidence).not.toBe('insufficient_data');
    expect(result.components.limitations).toContain('tabla_influencer_heat_zones_no_disponible');
    expect(result.components.limitations).toContain('tabla_zone_migration_flows_no_disponible');
    expect(result.components._meta.limitation).toBeTruthy();
    expect(result.confidence).not.toBe('high');
  });

  it('insufficient_data — coverage < 40%', () => {
    const result = computeDmxGnt({
      MOM_now: null,
      MOM_12m_ago: null,
      influencer_heat_raw: null,
      denue_alpha_count_6m: null,
      migration_high_income_score: null,
      N09_now: null,
      N09_12m_ago: null,
      price_m2_now: null,
      price_m2_6m_ago: null,
      universe_period: '2026-04-01',
    });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.value).toBe(0);
  });

  it('edge 0 — todos signals neutros/negativos → value bajo, fase dormant/early', () => {
    const result = computeDmxGnt({
      MOM_now: 40,
      MOM_12m_ago: 42, // delta negativo
      influencer_heat_raw: 0,
      denue_alpha_count_6m: 0,
      migration_high_income_score: 0,
      N09_now: 50,
      N09_12m_ago: 52,
      price_m2_now: 50000,
      price_m2_6m_ago: 51000, // velocity negativo
      universe_period: '2026-04-01',
    });
    expect(['dormant', 'early']).toContain(result.components.fase);
    expect(result.value).toBeLessThan(45);
  });

  it('edge 100 — gentrificación explosiva → peaked/post_gentrification', () => {
    const result = computeDmxGnt({
      MOM_now: 95,
      MOM_12m_ago: 30,
      influencer_heat_raw: 100,
      denue_alpha_count_6m: 30,
      migration_high_income_score: 100,
      N09_now: 95,
      N09_12m_ago: 50,
      price_m2_now: 80000,
      price_m2_6m_ago: 50000,
      universe_period: '2026-04-01',
    });
    expect(['peaked', 'post_gentrification']).toContain(result.components.fase);
    expect(result.value).toBeGreaterThanOrEqual(65);
  });

  it('circuit breaker — Δ>20% triggers flag', () => {
    const result = computeDmxGnt({
      MOM_now: 85,
      MOM_12m_ago: 50,
      influencer_heat_raw: 80,
      denue_alpha_count_6m: 12,
      migration_high_income_score: 75,
      N09_now: 85,
      N09_12m_ago: 60,
      price_m2_now: 70000,
      price_m2_6m_ago: 55000,
      universe_period: '2026-04-01',
      previous_value: 30,
    });
    expect(result.components._meta.circuit_breaker_triggered).toBe(true);
  });

  it('limitation preserva cuando tablas futuras no disponibles pero resto suficiente', () => {
    const result = computeDmxGnt({
      MOM_now: 80,
      MOM_12m_ago: 60,
      influencer_heat_raw: 0, // proxy cuando tabla no existe
      denue_alpha_count_6m: 10,
      migration_high_income_score: 0, // proxy cuando tabla no existe
      N09_now: 75,
      N09_12m_ago: 60,
      price_m2_now: 62000,
      price_m2_6m_ago: 55000,
      universe_period: '2026-04-01',
      limitations_external: [
        'tabla_influencer_heat_zones_no_disponible',
        'tabla_zone_migration_flows_no_disponible',
      ],
    });
    expect(result.components.limitations.length).toBeGreaterThanOrEqual(2);
    expect(result.confidence).not.toBe('high');
  });

  it('shadow_mode propaga a _meta', () => {
    const result = computeDmxGnt({
      MOM_now: 65,
      MOM_12m_ago: 55,
      influencer_heat_raw: 50,
      denue_alpha_count_6m: 5,
      migration_high_income_score: 50,
      N09_now: 65,
      N09_12m_ago: 60,
      price_m2_now: 55000,
      price_m2_6m_ago: 52000,
      universe_period: '2026-04-01',
      shadow_mode: true,
    });
    expect(result.components._meta.shadow).toBe(true);
  });
});
