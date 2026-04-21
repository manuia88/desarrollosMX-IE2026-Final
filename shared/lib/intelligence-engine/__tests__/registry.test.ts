import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getCascadeTargets,
  getScoreById,
  getScoresByCategory,
  getScoresByLevel,
  getScoresByTier,
  SCORE_REGISTRY,
} from '../registry';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

async function fileExists(relPath: string): Promise<boolean> {
  try {
    await access(resolve(REPO_ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

describe('SCORE_REGISTRY shape', () => {
  it('contiene exactamente 126 entries (118 pre-FASE 11 XL + 8 nuevos índices DMX)', () => {
    expect(SCORE_REGISTRY).toHaveLength(126);
  });

  it('cada score_id es único', () => {
    const ids = SCORE_REGISTRY.map((e) => e.score_id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('todas las dependencies apuntan a score_ids existentes', () => {
    const ids = new Set(SCORE_REGISTRY.map((e) => e.score_id));
    const missing: Array<{ score: string; missing: string }> = [];
    for (const entry of SCORE_REGISTRY) {
      for (const dep of entry.dependencies) {
        if (!ids.has(dep)) missing.push({ score: entry.score_id, missing: dep });
      }
    }
    expect(missing).toEqual([]);
  });

  it('los 32 N0 con calculator_path no-stub siguen el pattern shared/lib/intelligence-engine/calculators/', () => {
    const n0 = SCORE_REGISTRY.filter((e) => e.level === 0);
    expect(n0).toHaveLength(32);
    const pathPattern = /^shared\/lib\/intelligence-engine\/calculators\/[^/]+\/[a-z0-9-]+\.ts$/;
    for (const entry of n0) {
      expect(entry.calculator_path).toMatch(pathPattern);
    }
  });
});

describe('helpers', () => {
  it('getScoreById devuelve la entry correcta y undefined si no existe', () => {
    expect(getScoreById('F01')?.name).toBe('Safety');
    expect(getScoreById('DOES_NOT_EXIST')).toBeUndefined();
  });

  it('getScoresByLevel(0) devuelve exactamente 32', () => {
    expect(getScoresByLevel(0)).toHaveLength(32);
  });

  it('getScoresByTier(1) incluye F01-F07 y varios otros N0 tier 1', () => {
    const tier1Ids = new Set(getScoresByTier(1).map((e) => e.score_id));
    for (const id of ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07']) {
      expect(tier1Ids.has(id)).toBe(true);
    }
  });

  it('getScoresByCategory("zona") incluye los F* y N* de zona', () => {
    const zonaIds = new Set(getScoresByCategory('zona').map((e) => e.score_id));
    expect(zonaIds.has('F01')).toBe(true);
    expect(zonaIds.has('N01')).toBe(true);
  });

  it('getCascadeTargets("unit_sold") devuelve la cascada oficial B08/E01/D02/B03/B09', () => {
    const expected = ['B03', 'B08', 'B09', 'D02', 'E01'];
    const actual = [...getCascadeTargets('unit_sold')].sort();
    expect(actual).toEqual(expected);
  });

  it('getCascadeTargets("geo_data_updated:fgj") cubre F01, N04, N09 (plan 8.F.2.1)', () => {
    const ids = new Set(getCascadeTargets('geo_data_updated:fgj'));
    expect(ids.has('F01')).toBe(true);
    expect(ids.has('N04')).toBe(true);
    expect(ids.has('N09')).toBe(true);
  });

  it('getCascadeTargets("geo_data_updated:denue") cubre F03, N01, N03, N09 (plan 8.F.2.1)', () => {
    const ids = new Set(getCascadeTargets('geo_data_updated:denue'));
    for (const id of ['F03', 'N01', 'N03', 'N09']) {
      expect(ids.has(id)).toBe(true);
    }
  });
});

describe('counts por nivel', () => {
  it('32 N0 + 16 N1 + 14 N2 + 12 N3 + 7 N4 + 25 N5 + 15 índices DMX + 5 stubs = 126', () => {
    expect(getScoresByLevel(0)).toHaveLength(32);
    expect(getScoresByLevel(1)).toHaveLength(18); // 16 + 1 stub F15 + 1 stub H17
    expect(getScoresByLevel(2)).toHaveLength(15); // 14 + 1 stub D11
    expect(getScoresByLevel(3)).toHaveLength(12);
    expect(getScoresByLevel(4)).toHaveLength(7);
    // N5 = 25 (AI content + I01-I06) + 15 DMX índices (7 pre + 8 FASE 11 XL) + 2 stubs I07/I08 = 42
    expect(getScoresByLevel(5)).toHaveLength(42);
  });
});

describe('calculator_path de los 32 N0', () => {
  // Los archivos se crean en BLOQUE 8.B/8.C. En BLOQUE 8.A el calculator_path
  // sólo necesita pattern válido. Cuando 8.B/8.C cierren, este test verificará
  // la existencia física vía fs.access.
  it('todos los N0 tienen calculator_path dentro de shared/lib/intelligence-engine/calculators/', async () => {
    const n0 = SCORE_REGISTRY.filter((e) => e.level === 0);
    for (const entry of n0) {
      expect(entry.calculator_path).toMatch(/^shared\/lib\/intelligence-engine\/calculators\//);
    }
    // Smoke test: verificar que al menos el directorio padre existe.
    expect(await fileExists('shared/lib/intelligence-engine/calculators')).toBe(true);
  });
});
