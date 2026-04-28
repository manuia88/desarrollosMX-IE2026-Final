// FASE 14.1 — Guadalajara city expansion tests (Modo A: createCaller-style mocks).
// 8 tests covering GDL_ZONES_CANON shape + IE scores baseline + i18n parity + index exports.

import { describe, expect, it } from 'vitest';
import * as gdlIndex from '@/features/cities/guadalajara';
import {
  buildGdlSyntheticScores,
  GDL_I18N_EN_US,
  GDL_I18N_ES_MX,
  GDL_ZONES_CANON,
} from '@/features/cities/guadalajara';

const VALID_SCORE_TYPES = new Set(['pulse', 'futures_alpha', 'ghost', 'zone_alpha']);

describe('FASE 14.1 — Guadalajara city expansion (ADR-059)', () => {
  it('Test 1: GDL_ZONES_CANON contains exactly 8 zones', () => {
    expect(GDL_ZONES_CANON).toHaveLength(8);
    const slugs = GDL_ZONES_CANON.map((z) => z.slug);
    expect(new Set(slugs).size).toBe(8);
  });

  it('Test 2: every zone has country_code=MX and parent_scope_id=guadalajara', () => {
    for (const zone of GDL_ZONES_CANON) {
      expect(zone.country_code).toBe('MX');
      expect(zone.parent_scope_id).toBe('guadalajara');
      expect(zone.scope_type).toBe('colonia');
    }
  });

  it('Test 3: every zone has lat in 20.6..20.8 and lng in -103.5..-103.3', () => {
    for (const zone of GDL_ZONES_CANON) {
      expect(zone.lat).toBeGreaterThanOrEqual(20.6);
      expect(zone.lat).toBeLessThanOrEqual(20.8);
      expect(zone.lng).toBeGreaterThanOrEqual(-103.5);
      expect(zone.lng).toBeLessThanOrEqual(-103.3);
    }
  });

  it('Test 4: buildGdlSyntheticScores returns 4 score_types per zone (32 total)', () => {
    const scores = buildGdlSyntheticScores();
    expect(scores).toHaveLength(GDL_ZONES_CANON.length * 4);
    for (const zone of GDL_ZONES_CANON) {
      const zoneScores = scores.filter((s) => s.zoneSlug === zone.slug);
      expect(zoneScores).toHaveLength(4);
      const types = new Set(zoneScores.map((s) => s.scoreType));
      expect(types).toEqual(VALID_SCORE_TYPES);
    }
  });

  it('Test 5: synthetic scores fall within canonical GDL ranges per type', () => {
    const ranges: Record<string, readonly [number, number]> = {
      pulse: [75, 92],
      futures_alpha: [65, 85],
      ghost: [8, 25],
      zone_alpha: [60, 80],
    };
    const scores = buildGdlSyntheticScores();
    for (const score of scores) {
      const [min, max] = ranges[score.scoreType] as readonly [number, number];
      expect(score.scoreValue).toBeGreaterThanOrEqual(min);
      expect(score.scoreValue).toBeLessThanOrEqual(max);
      expect(score.level).toBeGreaterThanOrEqual(0);
      expect(score.level).toBeLessThanOrEqual(5);
      expect(score.tier).toBeGreaterThanOrEqual(1);
      expect(score.tier).toBeLessThanOrEqual(4);
    }
  });

  it('Test 6: every score declares provenance.is_synthetic=true + adr=ADR-059', () => {
    const scores = buildGdlSyntheticScores();
    for (const score of scores) {
      expect(score.provenance.is_synthetic).toBe(true);
      expect(score.provenance.adr).toBe('ADR-059');
      expect(score.provenance.source).toBe('F14.1.0_synthetic_baseline');
    }
  });

  it('Test 7: i18n keys parity es-MX vs en-US (same key set)', () => {
    const esKeys = Object.keys(GDL_I18N_ES_MX).sort();
    const enKeys = Object.keys(GDL_I18N_EN_US).sort();
    expect(esKeys).toEqual(enKeys);
    for (const key of esKeys) {
      expect(GDL_I18N_ES_MX[key]).toBeTruthy();
      expect(GDL_I18N_EN_US[key]).toBeTruthy();
    }
    expect(esKeys).toContain('Cities.guadalajara.name');
    expect(esKeys).toContain('Cities.guadalajara.heroTitle');
    expect(esKeys).toContain('Cities.guadalajara.synthBadge');
  });

  it('Test 8: index.ts re-exports the public API surface', () => {
    expect(gdlIndex.GDL_ZONES_CANON).toBeDefined();
    expect(typeof gdlIndex.loadGuadalajaraZones).toBe('function');
    expect(typeof gdlIndex.calculateGuadalajaraIEScores).toBe('function');
    expect(typeof gdlIndex.buildGdlSyntheticScores).toBe('function');
    expect(gdlIndex.GDL_I18N_ES_MX).toBeDefined();
    expect(gdlIndex.GDL_I18N_EN_US).toBeDefined();
  });
});
