import { describe, expect, it } from 'vitest';
import {
  computeA08Comparador,
  DIMENSIONS,
  getLabelKey,
  methodology,
  version,
} from '../a08-comparador-multi-d';

function mkProject(id: string, overrides: Record<string, number | null> = {}) {
  return {
    projectId: id,
    precio: 70,
    lqi: 75,
    risk: 65,
    momentum: 60,
    walkability: 70,
    schools: 65,
    community_fit: 70,
    ecosystem: 60,
    ...overrides,
  };
}

describe('A08 Comparador Multi-Dimensional', () => {
  it('declara methodology + 8 dimensiones + validity 7d', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(DIMENSIONS).toHaveLength(8);
    expect(methodology.validity.value).toBe(7);
    expect(methodology.sources).toContain('project_scores:F08');
  });

  it('happy path 4 proyectos → ranking por score descendente', () => {
    const res = computeA08Comparador({
      projects: [
        mkProject('A', { precio: 90, lqi: 85 }),
        mkProject('B'),
        mkProject('C', { precio: 50, lqi: 50 }),
        mkProject('D'),
      ],
    });
    expect(res.components.projects_ranked).toHaveLength(4);
    expect(res.components.top_project_id).toBe('A');
    expect(res.components.projects_ranked[0]?.projectId).toBe('A');
    expect(res.components.projects_ranked[0]?.score).toBeGreaterThan(
      res.components.projects_ranked[3]?.score ?? 0,
    );
  });

  it('per_dimension_rank asigna 1 al mejor en cada dimensión', () => {
    const res = computeA08Comparador({
      projects: [mkProject('A', { precio: 95 }), mkProject('B', { precio: 50 })],
    });
    const aPrecioRank = res.components.projects_ranked.find((p) => p.projectId === 'A')
      ?.per_dimension_rank.precio;
    expect(aPrecioRank).toBe(1);
  });

  it('rechaza <2 proyectos → insufficient_data', () => {
    const res = computeA08Comparador({ projects: [mkProject('A')] });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
  });

  it('rechaza >6 proyectos → insufficient_data', () => {
    const res = computeA08Comparador({
      projects: [1, 2, 3, 4, 5, 6, 7].map((n) => mkProject(`P${n}`)),
    });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('dimension_coverage refleja % con valor no-null', () => {
    const res = computeA08Comparador({
      projects: [
        mkProject('A', { schools: null }),
        mkProject('B', { schools: null }),
        mkProject('C'),
      ],
    });
    expect(res.components.dimension_coverage.schools).toBe(33);
    expect(res.components.dimension_coverage.precio).toBe(100);
  });

  it('L-31 multiplayer: 2 users → consensus + agreement_level', () => {
    const res = computeA08Comparador({
      projects: [mkProject('A'), mkProject('B')],
      per_user_scores: {
        user1: { precio: 80, lqi: 75, risk: 60 },
        user2: { precio: 85, lqi: 70, risk: 55 },
      },
    });
    expect(res.components.multiplayer_consensus).not.toBeNull();
    expect(res.components.multiplayer_consensus?.agreement_level).toBe('alto');
  });

  it('L-31 multiplayer: disagreement stddev alto → marca dimension', () => {
    const res = computeA08Comparador({
      projects: [mkProject('A'), mkProject('B')],
      per_user_scores: {
        user1: { precio: 20 },
        user2: { precio: 90 },
      },
    });
    expect(res.components.multiplayer_consensus?.disagreement_dimensions).toHaveLength(1);
    expect(res.components.multiplayer_consensus?.disagreement_dimensions[0]?.dimension).toBe(
      'precio',
    );
  });

  it('getLabelKey buckets top_claro/competitivo/mid/rezagado', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.a08.top_claro');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.a08.competitivo');
    expect(getLabelKey(40, 'low')).toBe('ie.score.a08.mid');
    expect(getLabelKey(20, 'low')).toBe('ie.score.a08.rezagado');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.a08.insufficient');
  });
});
