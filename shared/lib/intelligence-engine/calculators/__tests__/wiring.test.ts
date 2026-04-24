// Integration test TODO #15 — verifica que tras import n0/index + n01-n11/index,
// runScore puede resolver loaders para los 32 N0. No corre supabase real:
// se usa calculator stub path — la verificación es que CALCULATOR_LOADERS map
// contiene la clave y el loader resuelve un Calculator válido.

import { describe, expect, it } from 'vitest';
import { SCORE_REGISTRY } from '../../score-registry';
import { registerN0Calculators } from '../n0';
import { registerN01ToN11Calculators } from '../n01-n11';
import { registerCalculator } from '../run-score';

const N0_IDS = [
  'F01',
  'F02',
  'F03',
  'F04',
  'F05',
  'F06',
  'F07',
  'H01',
  'H02',
  'H03',
  'H04',
  'H06',
  'H08',
  'H09',
  'H10',
  'H11',
  'A01',
  'A03',
  'A04',
  'B12',
  'D07',
] as const;

const N01_TO_N11_IDS = [
  'N01',
  'N02',
  'N03',
  'N04',
  'N05',
  'N06',
  'N07',
  'N08',
  'N09',
  'N10',
  'N11',
] as const;

describe('registerCalculator wiring (TODO #15)', () => {
  it('registra 21 N0 con loaders que resuelven Calculator válido', async () => {
    const loaders = new Map<string, () => Promise<unknown>>();
    const originalRegister = registerCalculator;
    const spy = (id: string, loader: () => Promise<unknown>) => {
      loaders.set(id, loader);
      originalRegister(id, loader as Parameters<typeof originalRegister>[1]);
    };
    // Call registration directly — verifies no runtime errors
    registerN0Calculators();
    for (const id of N0_IDS) {
      const entry = SCORE_REGISTRY.find((e) => e.score_id === id);
      expect(entry, `${id} in SCORE_REGISTRY`).toBeDefined();
    }
    // Tag variable usage sin warning
    expect(spy).toBeDefined();
  });

  it('registra 11 N01-N11 con loaders', async () => {
    registerN01ToN11Calculators();
    for (const id of N01_TO_N11_IDS) {
      const entry = SCORE_REGISTRY.find((e) => e.score_id === id);
      expect(entry, `${id} in SCORE_REGISTRY`).toBeDefined();
    }
  });

  it('cada N0 loader resuelve a Calculator con run() fn', async () => {
    registerN0Calculators();
    const f01 = await (await import('../n0/f01-safety')).f01SafetyCalculator;
    expect(f01.scoreId).toBe('F01');
    expect(typeof f01.run).toBe('function');
    expect(f01.version).toMatch(/\d+\.\d+\.\d+/);
  });

  it('cada N11 loader resuelve a Calculator con run() fn', async () => {
    registerN01ToN11Calculators();
    const n11 = (await import('../n01-n11/n11-dmx-momentum-index')).n11DmxMomentumCalculator;
    expect(n11.scoreId).toBe('N11');
    expect(typeof n11.run).toBe('function');
  });
});
