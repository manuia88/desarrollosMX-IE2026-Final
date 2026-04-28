// F14.F.11 Sprint 10 BIBLIA Tarea 10.2 — Lighthouse baseline schema test (mock).
// STUB ADR-018: real Lighthouse runs deferred H2 (founder defer 2026-04-27).
// Esta suite valida la *forma* del baseline JSON que el doc PERFORMANCE_BASELINE.md
// expone, para que cuando se active Lighthouse real H2 solo cambien los números.
//
// 4 señales canon ADR-018:
//   (1) STUB comment explícito en este archivo
//   (2) Test marca data como `synthetic: true` para detectar en runtime
//   (3) UI flag visible en PerformanceDashboard mostrando "Datos sintéticos H1"
//   (4) L-NEW-STUDIO-LIGHTHOUSE-BASELINE-ACTIVATE H2

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const LighthouseScoreSchema = z.object({
  route: z.string().min(1),
  fcp: z.number().nonnegative(), // First Contentful Paint (s)
  lcp: z.number().nonnegative(), // Largest Contentful Paint (s)
  tbt: z.number().nonnegative(), // Total Blocking Time (ms)
  cls: z.number().nonnegative(), // Cumulative Layout Shift
  score: z.number().min(0).max(100),
  synthetic: z.boolean(),
});

type LighthouseScore = z.infer<typeof LighthouseScoreSchema>;

// Mock baseline (synthetic H1 — real Lighthouse run defer H2).
// Numbers approximate Next.js 16 + Turbopack production build expectations
// for a Studio dashboard SSR-first PPR setup.
const MOCK_LIGHTHOUSE_BASELINE: ReadonlyArray<LighthouseScore> = [
  {
    route: '/studio',
    fcp: 1.2,
    lcp: 1.8,
    tbt: 120,
    cls: 0.02,
    score: 92,
    synthetic: true,
  },
  {
    route: '/studio-app/dashboard',
    fcp: 1.4,
    lcp: 2.1,
    tbt: 180,
    cls: 0.03,
    score: 88,
    synthetic: true,
  },
  {
    route: '/studio-app/library',
    fcp: 1.5,
    lcp: 2.4,
    tbt: 210,
    cls: 0.04,
    score: 85,
    synthetic: true,
  },
  {
    route: '/studio-app/projects/new',
    fcp: 1.3,
    lcp: 2.0,
    tbt: 150,
    cls: 0.02,
    score: 90,
    synthetic: true,
  },
];

// biome-ignore lint/suspicious/noExportsInTest: schema definitions reused by activation H2
export type { LighthouseScore };
// biome-ignore lint/suspicious/noExportsInTest: schema definitions reused by activation H2
export { LighthouseScoreSchema, MOCK_LIGHTHOUSE_BASELINE };

describe('Lighthouse baseline schema (mock H1)', () => {
  it('LighthouseScoreSchema validates correct shape', () => {
    const valid: LighthouseScore = {
      route: '/studio',
      fcp: 1.0,
      lcp: 2.0,
      tbt: 100,
      cls: 0.05,
      score: 95,
      synthetic: true,
    };
    expect(() => LighthouseScoreSchema.parse(valid)).not.toThrow();
  });

  it('rejects negative FCP', () => {
    expect(() =>
      LighthouseScoreSchema.parse({
        route: '/studio',
        fcp: -1,
        lcp: 2,
        tbt: 100,
        cls: 0,
        score: 50,
        synthetic: true,
      }),
    ).toThrow();
  });

  it('rejects score > 100', () => {
    expect(() =>
      LighthouseScoreSchema.parse({
        route: '/studio',
        fcp: 1,
        lcp: 2,
        tbt: 100,
        cls: 0,
        score: 110,
        synthetic: true,
      }),
    ).toThrow();
  });

  it('all 4 mock baseline rows pass schema', () => {
    for (const row of MOCK_LIGHTHOUSE_BASELINE) {
      expect(() => LighthouseScoreSchema.parse(row)).not.toThrow();
    }
  });

  it('mock baseline covers 4 canon Studio routes', () => {
    const routes = MOCK_LIGHTHOUSE_BASELINE.map((r) => r.route).sort();
    expect(routes).toEqual(
      [
        '/studio',
        '/studio-app/dashboard',
        '/studio-app/library',
        '/studio-app/projects/new',
      ].sort(),
    );
  });

  it('every mock row marked synthetic:true (STUB ADR-018)', () => {
    for (const row of MOCK_LIGHTHOUSE_BASELINE) {
      expect(row.synthetic).toBe(true);
    }
  });

  it('mock baseline FCP < 2s + LCP < 3s + score >= 80 (target H1)', () => {
    for (const row of MOCK_LIGHTHOUSE_BASELINE) {
      expect(row.fcp).toBeLessThan(2);
      expect(row.lcp).toBeLessThan(3);
      expect(row.score).toBeGreaterThanOrEqual(80);
    }
  });
});
