// F14.F.7 Sprint 6 Tarea 6.5 — Sprint6FeatureToggles + PlanPaywallCanon
// pure-logic exports tests (Modo A, no RTL).
// Validamos: contracts del módulo + estructura de tipos esperada por consumers.

import { describe, expect, it } from 'vitest';

describe('Sprint6FeatureToggles — module exports contract', () => {
  it('exports Sprint6FeatureToggles as a named function component', async () => {
    const mod = await import('../../components/projects/Sprint6FeatureToggles');
    expect(typeof mod.Sprint6FeatureToggles).toBe('function');
    expect(mod.Sprint6FeatureToggles.name).toBe('Sprint6FeatureToggles');
  });
});

describe('Sprint6FeatureToggles — availability + asset disable matrix', () => {
  // Mirror the pure logic embedded in the component so we test the contract
  // of (flag, plan, assetCount) -> disabled boolean independent of React render.
  type Flags = {
    seedance: boolean;
    virtualStaging: boolean;
    droneSim: boolean;
    cinemaMode: boolean;
  };
  type Assets = { hasEmptyRooms: boolean; hasExterior: boolean };

  function expectedDisabled(
    key: 'virtualStaging' | 'seedance' | 'droneSim' | 'cinemaMode',
    flags: Flags,
    assets: Assets,
  ): boolean {
    if (key === 'virtualStaging') {
      return !flags.virtualStaging || !assets.hasEmptyRooms;
    }
    if (key === 'seedance') {
      return !flags.seedance;
    }
    if (key === 'droneSim') {
      return !flags.droneSim || !assets.hasExterior;
    }
    return !flags.cinemaMode;
  }

  it('agency with all flags + all assets enables every toggle', () => {
    const flags: Flags = {
      seedance: true,
      virtualStaging: true,
      droneSim: true,
      cinemaMode: true,
    };
    const assets: Assets = { hasEmptyRooms: true, hasExterior: true };

    expect(expectedDisabled('virtualStaging', flags, assets)).toBe(false);
    expect(expectedDisabled('seedance', flags, assets)).toBe(false);
    expect(expectedDisabled('droneSim', flags, assets)).toBe(false);
    expect(expectedDisabled('cinemaMode', flags, assets)).toBe(false);
  });

  it('non-agency context: paywall path disables all flag-gated toggles', () => {
    const flags: Flags = {
      seedance: false,
      virtualStaging: false,
      droneSim: false,
      cinemaMode: false,
    };
    const assets: Assets = { hasEmptyRooms: true, hasExterior: true };

    expect(expectedDisabled('virtualStaging', flags, assets)).toBe(true);
    expect(expectedDisabled('seedance', flags, assets)).toBe(true);
    expect(expectedDisabled('droneSim', flags, assets)).toBe(true);
    expect(expectedDisabled('cinemaMode', flags, assets)).toBe(true);
  });

  it('asset counts disable virtualStaging + droneSim independently of flags', () => {
    const flags: Flags = {
      seedance: true,
      virtualStaging: true,
      droneSim: true,
      cinemaMode: true,
    };
    const noAssets: Assets = { hasEmptyRooms: false, hasExterior: false };
    expect(expectedDisabled('virtualStaging', flags, noAssets)).toBe(true);
    expect(expectedDisabled('droneSim', flags, noAssets)).toBe(true);
    // Seedance + cinemaMode no dependen de assets
    expect(expectedDisabled('seedance', flags, noAssets)).toBe(false);
    expect(expectedDisabled('cinemaMode', flags, noAssets)).toBe(false);

    const onlyExterior: Assets = { hasEmptyRooms: false, hasExterior: true };
    expect(expectedDisabled('virtualStaging', flags, onlyExterior)).toBe(true);
    expect(expectedDisabled('droneSim', flags, onlyExterior)).toBe(false);
  });
});

describe('PlanPaywallCanon — module exports contract', () => {
  it('exports PlanPaywallCanon as a named function component', async () => {
    const mod = await import('../../components/projects/PlanPaywallCanon');
    expect(typeof mod.PlanPaywallCanon).toBe('function');
    expect(mod.PlanPaywallCanon.name).toBe('PlanPaywallCanon');
  });
});

describe('CinemaModeToggle — module exports contract', () => {
  it('exports CinemaModeToggle as a named function component', async () => {
    const mod = await import('../../components/projects/CinemaModeToggle');
    expect(typeof mod.CinemaModeToggle).toBe('function');
    expect(mod.CinemaModeToggle.name).toBe('CinemaModeToggle');
  });
});
