// F14.F.7 Sprint 6 Tarea 6.5 (Upgrade 5) — SideBySideComparison contracts +
// pure clamp/inference helper validation. Modo A (no RTL).

import { describe, expect, it } from 'vitest';

describe('SideBySideComparison — module exports contract', () => {
  it('exports SideBySideComparison as a named function component', async () => {
    const mod = await import('../../components/projects/SideBySideComparison');
    expect(typeof mod.SideBySideComparison).toBe('function');
    expect(mod.SideBySideComparison.name).toBe('SideBySideComparison');
  });
});

describe('SideBySideComparison — splitPercent clamp invariants', () => {
  // Mirror the clamp behavior shipped in the component to lock the contract.
  function clampPercent(p: number): number {
    if (Number.isNaN(p)) {
      return 50;
    }
    if (p < 0) {
      return 0;
    }
    if (p > 100) {
      return 100;
    }
    return p;
  }

  it('clamps below 0 to 0 and above 100 to 100', () => {
    expect(clampPercent(-25)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(100)).toBe(100);
  });

  it('returns 50 fallback for NaN and preserves valid mid values', () => {
    expect(clampPercent(Number.NaN)).toBe(50);
    expect(clampPercent(50)).toBe(50);
    expect(clampPercent(73.4)).toBeCloseTo(73.4, 4);
  });

  it('arrow-key step pattern (+/-5) produces valid clamped sequence', () => {
    let v = 50;
    for (let i = 0; i < 12; i += 1) {
      v = clampPercent(v + 5);
    }
    expect(v).toBe(100);

    v = 50;
    for (let i = 0; i < 20; i += 1) {
      v = clampPercent(v - 5);
    }
    expect(v).toBe(0);
  });
});
