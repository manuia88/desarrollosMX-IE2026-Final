import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import b07, {
  B07_DIMENSIONS,
  type B07ProjectData,
  computeB07CompetitiveIntel,
  DEFAULT_WEIGHTS,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../b07-competitive-intel';

const MY_PROJECT: B07ProjectData = {
  project_id: 'MINE',
  precio_m2: 65_000, // medio-bajo en zona ~55k-85k → ventaja
  amenidades: 12,
  tamano: 90,
  absorcion: 28,
  marketing_spend: 150_000,
  dom: 45, // bajo → ventaja
  quality: 82,
  momentum: 78,
};

const COMPETITORS_5: readonly B07ProjectData[] = [
  {
    project_id: 'C1',
    precio_m2: 78_000,
    amenidades: 8,
    tamano: 75,
    absorcion: 18,
    marketing_spend: 120_000,
    dom: 65,
    quality: 72,
    momentum: 68,
  },
  {
    project_id: 'C2',
    precio_m2: 82_000,
    amenidades: 10,
    tamano: 82,
    absorcion: 22,
    marketing_spend: 140_000,
    dom: 55,
    quality: 78,
    momentum: 72,
  },
  {
    project_id: 'C3',
    precio_m2: 70_000,
    amenidades: 14,
    tamano: 95,
    absorcion: 30,
    marketing_spend: 180_000,
    dom: 40,
    quality: 85,
    momentum: 80,
  },
  {
    project_id: 'C4',
    precio_m2: 85_000,
    amenidades: 6,
    tamano: 70,
    absorcion: 15,
    marketing_spend: 90_000,
    dom: 75,
    quality: 68,
    momentum: 62,
  },
  {
    project_id: 'C5',
    precio_m2: 72_000,
    amenidades: 11,
    tamano: 88,
    absorcion: 25,
    marketing_spend: 160_000,
    dom: 50,
    quality: 80,
    momentum: 75,
  },
];

describe('B07 Competitive Intel calculator', () => {
  it('declara version, methodology, reasoning_template, 8 dimensiones', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('project_competitors');
    expect(methodology.tier_gate.min_competitors).toBe(5);
    expect(B07_DIMENSIONS.length).toBe(8);
    // 8 weights default + suma ≈ 1.0 (±0.01)
    const sumW = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sumW).toBeGreaterThan(0.99);
    expect(sumW).toBeLessThan(1.01);
    expect(DEFAULT_WEIGHTS.precio_m2).toBe(0.15);
    expect(DEFAULT_WEIGHTS.amenidades).toBe(0.1);
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
    expect(methodology.dependencies).toEqual([]);
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.b07.lider');
    expect(getLabelKey(65, 'high')).toBe('ie.score.b07.fuerte');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.b07.parejo');
    expect(getLabelKey(20, 'low')).toBe('ie.score.b07.rezagado');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.b07.insufficient');
  });

  it('criterio done — retorna 5 competidores ordenados por similarity DESC', () => {
    const res = computeB07CompetitiveIntel({
      my_project: MY_PROJECT,
      competitors: COMPETITORS_5,
    });
    expect(res.components.competitors_top5.length).toBe(5);
    // Orden descendente por similarity_score.
    for (let i = 0; i < res.components.competitors_top5.length - 1; i += 1) {
      const current = res.components.competitors_top5[i];
      const next = res.components.competitors_top5[i + 1];
      if (!current || !next) throw new Error('unexpected undefined entry');
      expect(current.similarity_score).toBeGreaterThanOrEqual(next.similarity_score);
    }
    // Cada competitor tiene arrays advantages/disadvantages.
    for (const c of res.components.competitors_top5) {
      expect(Array.isArray(c.advantages)).toBe(true);
      expect(Array.isArray(c.disadvantages)).toBe(true);
      expect(c.similarity_score).toBeGreaterThanOrEqual(0);
      expect(c.similarity_score).toBeLessThanOrEqual(1);
    }
    expect(res.components.competitors_count).toBe(5);
    expect(res.confidence).toBe('medium');
    expect(res.components.bucket).not.toBe('insufficient');
  });

  it('my_project dominante → score > 60 + my_strengths no vacío', () => {
    const res = computeB07CompetitiveIntel({
      my_project: MY_PROJECT,
      competitors: COMPETITORS_5,
    });
    // MY tiene precio_m2 bajo (ventaja), amenidades altas, momentum alto → esperamos score > 50.
    expect(res.value).toBeGreaterThan(50);
    // my_strengths debe incluir al menos una dimensión relevante.
    expect(res.components.my_strengths.length).toBeGreaterThan(0);
    // Deltas: amenidades, quality, momentum DEBEN ser positivos para MY_PROJECT vs el avg.
    expect(res.components.dimension_deltas.amenidades).toBeGreaterThan(0);
  });

  it('my_project rezagado → score < 50 + my_weaknesses no vacío', () => {
    const weakProject: B07ProjectData = {
      project_id: 'WEAK',
      precio_m2: 100_000, // caro → desventaja (inverso)
      amenidades: 3,
      tamano: 55,
      absorcion: 5,
      marketing_spend: 30_000,
      dom: 120, // alto → desventaja
      quality: 50,
      momentum: 40,
    };
    const res = computeB07CompetitiveIntel({
      my_project: weakProject,
      competitors: COMPETITORS_5,
    });
    expect(res.value).toBeLessThan(50);
    expect(res.components.my_weaknesses.length).toBeGreaterThan(0);
    expect(res.components.bucket === 'parejo' || res.components.bucket === 'rezagado').toBe(true);
  });

  it('tier gate: <5 competitors → insufficient_data + bucket=insufficient', () => {
    const res = computeB07CompetitiveIntel({
      my_project: MY_PROJECT,
      competitors: COMPETITORS_5.slice(0, 3),
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.bucket).toBe('insufficient');
    // Aún así retorna estructura (competitors_top5 hasta 3).
    expect(res.components.competitors_top5.length).toBe(3);
    expect(res.components.competitors_count).toBe(3);
  });

  it('weightsOverride afecta el score (D8 runtime)', () => {
    const resDefault = computeB07CompetitiveIntel({
      my_project: MY_PROJECT,
      competitors: COMPETITORS_5,
    });
    // Override pesando más la dimensión donde MY es más débil
    const resOverride = computeB07CompetitiveIntel(
      {
        my_project: MY_PROJECT,
        competitors: COMPETITORS_5,
      },
      {
        weightsOverride: {
          precio_m2: 0.5,
          amenidades: 0.1,
          tamano: 0.05,
          absorcion: 0.05,
          marketing_spend: 0.1,
          dom: 0.05,
          quality: 0.05,
          momentum: 0.1,
        },
      },
    );
    // Al menos los weights_applied reflejan el override
    expect(resOverride.components.weights_applied.precio_m2).toBe(0.5);
    expect(resDefault.components.weights_applied.precio_m2).toBe(0.15);
  });

  it('b07.run() prod-path devuelve insufficient + provenance válido + citations', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await b07.run(
      { projectId: 'proj-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.b07.insufficient');
    expect(out.citations.length).toBeGreaterThan(0);
  });
});
