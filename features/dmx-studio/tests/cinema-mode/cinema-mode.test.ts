// F14.F.7 Sprint 6 Tarea 6.5 — Cinema Mode lib pure tests.
// Modo A: zero red dependencies. Validates feature catalog + builder defaults
// + override behavior + prerequisites validator.

import { describe, expect, it } from 'vitest';
import {
  buildCinemaModeConfig,
  CINEMA_MODE_FEATURES,
  validateCinemaModePrerequisites,
} from '../../lib/cinema-mode';

describe('cinema-mode — CINEMA_MODE_FEATURES catalog', () => {
  it('exports the canon 5 features in stable order', () => {
    expect(CINEMA_MODE_FEATURES).toEqual([
      'drone_reveal',
      'seedance_ambient',
      'branded_overlay',
      'multi_format',
      'beat_sync',
    ]);
    expect(CINEMA_MODE_FEATURES).toHaveLength(5);
  });

  it('every feature is a non-empty unique snake_case string', () => {
    const seen = new Set<string>();
    for (const f of CINEMA_MODE_FEATURES) {
      expect(typeof f).toBe('string');
      expect(f.length).toBeGreaterThan(0);
      expect(seen.has(f)).toBe(false);
      seen.add(f);
    }
  });
});

describe('cinema-mode — buildCinemaModeConfig', () => {
  it('returns canon defaults when no opts passed', () => {
    const cfg = buildCinemaModeConfig();
    expect(cfg.features).toEqual(CINEMA_MODE_FEATURES);
    expect(cfg.dronePattern).toBe('reveal');
    expect(cfg.ambientContext).toBe('auto');
    expect(cfg.brandedOverlay).toBe(true);
    expect(cfg.multiFormat).toEqual(['9x16', '1x1', '16x9']);
    expect(cfg.beatSync).toBe(true);
  });

  it('honors droneOverride and ambientOverride when provided', () => {
    const cfg = buildCinemaModeConfig({
      droneOverride: 'orbit_360',
      ambientOverride: 'urban_loft',
    });
    expect(cfg.dronePattern).toBe('orbit_360');
    expect(cfg.ambientContext).toBe('urban_loft');
    // Other fields preserved
    expect(cfg.brandedOverlay).toBe(true);
    expect(cfg.beatSync).toBe(true);
  });

  it('falls back to defaults when override strings are empty', () => {
    const cfg = buildCinemaModeConfig({ droneOverride: '', ambientOverride: '' });
    expect(cfg.dronePattern).toBe('reveal');
    expect(cfg.ambientContext).toBe('auto');
  });
});

describe('cinema-mode — validateCinemaModePrerequisites', () => {
  it('returns valid=true when all prereqs satisfied', () => {
    const r = validateCinemaModePrerequisites({
      hasDroneAsset: true,
      hasSeedanceAccess: true,
      hasBrandKit: true,
    });
    expect(r.valid).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('reports each missing prereq individually', () => {
    const r = validateCinemaModePrerequisites({
      hasDroneAsset: false,
      hasSeedanceAccess: false,
      hasBrandKit: false,
    });
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual(['drone_asset', 'seedance_access', 'brand_kit']);
  });

  it('returns partial missing when some prereqs satisfied', () => {
    const r = validateCinemaModePrerequisites({
      hasDroneAsset: true,
      hasSeedanceAccess: false,
      hasBrandKit: true,
    });
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual(['seedance_access']);
  });
});
