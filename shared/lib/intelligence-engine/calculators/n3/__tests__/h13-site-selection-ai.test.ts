import { describe, expect, it } from 'vitest';
import type { ZoneDemographics } from '../../../sources/zone-demographics';
import {
  computeH13Site,
  getLabelKey,
  methodology,
  version,
  WEIGHTS,
} from '../h13-site-selection-ai';

function mkZone(id: string, overrides: Record<string, number | null> = {}) {
  return {
    zone_id: id,
    value: 70,
    gentrification: 60,
    demand: 75,
    supply_pressure: 40,
    uso_suelo_compat: 80,
    momentum: 65,
    ...overrides,
  };
}

function mkDemographics(id: string, stub = true): ZoneDemographics {
  return {
    zone_id: id,
    profession_distribution: stub ? [] : [{ cmo_code: 'abogado', label: 'Abogado', pct: 0.4 }],
    salary_range_distribution: stub
      ? []
      : [{ range_mxn_min: 100000, range_mxn_max: 200000, pct: 0.5 }],
    age_distribution: [],
    dominant_profession: stub ? null : 'abogado',
    median_salary_mxn: stub ? null : 150000,
    confidence: stub ? 'insufficient_data' : 'high',
    source: stub ? 'stub' : 'materialized_view',
    snapshot_date: '2026-04-20',
    stub,
    pending_sources: stub ? ['inegi_census'] : [],
  };
}

describe('H13 Site Selection AI', () => {
  it('methodology + L-69 demographics ref + 7 weights suman 1', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('zone_demographics_cache');
    const sum = Object.values(WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('criterio done: polígono con 10 zonas → ranked con rank 1..10', () => {
    const zones = Array.from({ length: 10 }, (_, i) =>
      mkZone(`z${i}`, { value: 50 + i * 4, demand: 50 + i * 3 }),
    );
    const demographics_by_zone = Object.fromEntries(
      zones.map((z) => [z.zone_id, mkDemographics(z.zone_id)]),
    );
    const res = computeH13Site({
      objetivo: 'residencial',
      zones,
      demographics_by_zone,
    });
    expect(res.components.ranked_sites).toHaveLength(10);
    expect(res.components.ranked_sites[0]?.rank).toBe(1);
    expect(res.components.ranked_sites[9]?.rank).toBe(10);
  });

  it('L-69: target_profession match aplica boost → zona con alta concentración rankea arriba', () => {
    const zones = [mkZone('z1'), mkZone('z2')];
    const demographics_by_zone = {
      z1: mkDemographics('z1', false), // rich, abogado 40%
      z2: mkDemographics('z2', true),
    };
    const res = computeH13Site({
      objetivo: 'residencial',
      zones,
      target_profession: 'abogado',
      target_salary_mxn: 150000,
      demographics_by_zone,
    });
    const z1 = res.components.ranked_sites.find((s) => s.zone_id === 'z1');
    const z2 = res.components.ranked_sites.find((s) => s.zone_id === 'z2');
    expect(z1?.profession_boost).toBeGreaterThan(0);
    expect(z2?.profession_boost).toBe(0);
    expect(z1?.score).toBeGreaterThan(z2?.score ?? 0);
  });

  it('demographics_source refleja stub vs materialized_view', () => {
    const zones = [mkZone('z1'), mkZone('z2')];
    const demographics_by_zone = {
      z1: mkDemographics('z1', false),
      z2: mkDemographics('z2', true),
    };
    const res = computeH13Site({
      objetivo: 'comercial',
      zones,
      demographics_by_zone,
    });
    const z1 = res.components.ranked_sites.find((s) => s.zone_id === 'z1');
    expect(z1?.demographics_source).toBe('materialized_view');
    const z2 = res.components.ranked_sites.find((s) => s.zone_id === 'z2');
    expect(z2?.demographics_source).toBe('stub');
  });

  it('zones empty → insufficient_data', () => {
    const res = computeH13Site({
      objetivo: 'residencial',
      zones: [],
      demographics_by_zone: {},
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('rationale incluye notas human-readable', () => {
    const zones = [mkZone('z1', { value: 80, demand: 85, momentum: 80 })];
    const res = computeH13Site({
      objetivo: 'residencial',
      zones,
      demographics_by_zone: { z1: mkDemographics('z1') },
    });
    const rat = res.components.ranked_sites[0]?.rationale ?? [];
    expect(rat.length).toBeGreaterThan(0);
    expect(rat.some((r) => r.includes('Demanda'))).toBe(true);
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.h13.top_site');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.h13.candidato');
    expect(getLabelKey(40, 'medium')).toBe('ie.score.h13.marginal');
    expect(getLabelKey(20, 'low')).toBe('ie.score.h13.descartar');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.h13.insufficient');
  });
});
