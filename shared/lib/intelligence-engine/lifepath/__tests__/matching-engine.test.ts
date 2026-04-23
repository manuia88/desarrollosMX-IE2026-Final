import { describe, expect, it } from 'vitest';
import type { LifePathAnswers, LifePathComponentBreakdown } from '@/features/lifepath/types';
import { weightedSum } from '../matching-engine';

const PERFECT_COMPONENTS: LifePathComponentBreakdown = {
  familia: 100,
  budget: 100,
  movilidad: 100,
  amenidades: 100,
  seguridad: 100,
  verde: 100,
  vibe: 100,
};

const EMPTY_COMPONENTS: LifePathComponentBreakdown = {
  familia: 0,
  budget: 0,
  movilidad: 0,
  amenidades: 0,
  seguridad: 0,
  verde: 0,
  vibe: 0,
};

const SAMPLE_ANSWERS: LifePathAnswers = {
  family_state: 'familia_chica',
  family_priority: 8,
  income_range: '60k_100k',
  budget_monthly_mxn: 25_000,
  work_mode: 'hibrido',
  mobility_pref: 'mixto',
  amenities_priority: 7,
  shopping_priority: 5,
  security_priority: 9,
  green_priority: 6,
  vibe_pace: 'equilibrado',
  vibe_nightlife: 4,
  vibe_walkable: 9,
  has_pet: true,
  horizon: '3_5y',
};

describe('weightedSum', () => {
  it('suma 100 con todos los componentes a 100', () => {
    expect(weightedSum(PERFECT_COMPONENTS)).toBe(100);
  });

  it('retorna 0 cuando todos los componentes son 0', () => {
    expect(weightedSum(EMPTY_COMPONENTS)).toBe(0);
  });

  it('determinístico (misma entrada → mismo output)', () => {
    const mixed: LifePathComponentBreakdown = {
      familia: 75,
      budget: 50,
      movilidad: 80,
      amenidades: 60,
      seguridad: 90,
      verde: 40,
      vibe: 70,
    };
    const a = weightedSum(mixed);
    const b = weightedSum(mixed);
    expect(a).toBe(b);
    // Weighted: 75*0.15 + 50*0.20 + 80*0.15 + 60*0.15 + 90*0.10 + 40*0.10 + 70*0.15
    //        = 11.25 + 10 + 12 + 9 + 9 + 4 + 10.5 = 65.75
    expect(a).toBeCloseTo(65.75, 1);
  });

  it('respeta pesos declarados (budget domina con 20%)', () => {
    const budgetOnly: LifePathComponentBreakdown = {
      ...EMPTY_COMPONENTS,
      budget: 100,
    };
    expect(weightedSum(budgetOnly)).toBe(20);
  });

  it('familia/movilidad/amenidades/vibe pesan 15 cada uno', () => {
    for (const key of ['familia', 'movilidad', 'amenidades', 'vibe'] as const) {
      const single: LifePathComponentBreakdown = { ...EMPTY_COMPONENTS, [key]: 100 };
      expect(weightedSum(single)).toBe(15);
    }
  });

  it('seguridad/verde pesan 10 cada uno', () => {
    for (const key of ['seguridad', 'verde'] as const) {
      const single: LifePathComponentBreakdown = { ...EMPTY_COMPONENTS, [key]: 100 };
      expect(weightedSum(single)).toBe(10);
    }
  });
});

describe('LifePathAnswers shape', () => {
  it('acepta 15 preguntas v1 SEED válidas', () => {
    expect(SAMPLE_ANSWERS.family_state).toBe('familia_chica');
    expect(SAMPLE_ANSWERS.vibe_nightlife).toBeLessThanOrEqual(10);
    expect(SAMPLE_ANSWERS.security_priority).toBeGreaterThanOrEqual(0);
    expect(SAMPLE_ANSWERS.has_pet).toBe(true);
  });
});
