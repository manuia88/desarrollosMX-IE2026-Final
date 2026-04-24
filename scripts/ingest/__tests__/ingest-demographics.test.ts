import { describe, expect, it } from 'vitest';
import {
  computeMedianSalaryMxn,
  generateAgeDistribution,
  generateCensusForZone,
  generateEnighForZone,
  generateProfessionDistribution,
  generateSalaryRangeDistribution,
  hashSeed,
  seedToUnit,
} from '../03_ingest-demographics.ts';

const PROFESSION_SET = new Set([
  'servicios_profesionales',
  'comercio',
  'educacion',
  'salud',
  'construccion',
  'manufactura',
  'transporte',
  'hosteleria',
  'tecnologia',
  'gobierno',
]);

const AGE_GROUPS_SET = new Set(['0-14', '15-29', '30-44', '45-59', '60-74', '75+']);

const SALARY_BRACKETS_ORDER = [
  '0-7500',
  '7500-15000',
  '15000-30000',
  '30000-60000',
  '60000+',
] as const;

const SUM_TOLERANCE = 0.5;

function sumPercentages(arr: Array<{ percentage: number }>): number {
  return arr.reduce((acc, e) => acc + e.percentage, 0);
}

describe('hashSeed', () => {
  it('determinismo: mismo input string retorna mismo número', () => {
    expect(hashSeed('roma-norte')).toBe(hashSeed('roma-norte'));
    expect(hashSeed('condesa')).toBe(hashSeed('condesa'));
    expect(hashSeed('')).toBe(hashSeed(''));
  });

  it('inputs distintos producen outputs distintos (>95% unicidad en 100 strings)', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) {
      seen.add(hashSeed(`scope-${i}`));
    }
    // Espera >=95 únicos (5% colisión tolerancia — en práctica FNV-1a da 100).
    expect(seen.size).toBeGreaterThanOrEqual(95);
  });

  it('devuelve uint32 (no negativo, finito)', () => {
    const h = hashSeed('test-string-arbitrario');
    expect(Number.isFinite(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe('seedToUnit', () => {
  it('rango [0, 1) para múltiples inputs', () => {
    for (let i = 0; i < 50; i++) {
      const u = seedToUnit(`scope-${i}`, 'step-x');
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it('determinismo: mismo (scope, step) retorna mismo valor', () => {
    expect(seedToUnit('roma-norte', 'profession::comercio')).toBe(
      seedToUnit('roma-norte', 'profession::comercio'),
    );
  });

  it('steps distintos producen valores distintos para mismo scope', () => {
    const a = seedToUnit('roma-norte', 'step-1');
    const b = seedToUnit('roma-norte', 'step-2');
    // Alta probabilidad de diferir — strings distintos.
    expect(a).not.toBe(b);
  });
});

describe('generateProfessionDistribution', () => {
  it('retorna 10 entries con strings exactos del array canónico', () => {
    const dist = generateProfessionDistribution('roma-norte');
    expect(dist.length).toBe(10);
    for (const entry of dist) {
      expect(PROFESSION_SET.has(entry.profession)).toBe(true);
    }
    // Todos presentes (no duplicados cubren via .length + set below)
    const uniqueProfessions = new Set(dist.map((e) => e.profession));
    expect(uniqueProfessions.size).toBe(10);
  });

  it('suma de percentages = 100 (±0.5)', () => {
    const dist = generateProfessionDistribution('condesa');
    const sum = sumPercentages(dist);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(SUM_TOLERANCE);
  });

  it('determinismo: misma zona 3 veces produce mismo output bit-exact', () => {
    const a = generateProfessionDistribution('polanco');
    const b = generateProfessionDistribution('polanco');
    const c = generateProfessionDistribution('polanco');
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('todos los percentages >= 0', () => {
    const dist = generateProfessionDistribution('coyoacan');
    for (const entry of dist) {
      expect(entry.percentage).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('generateAgeDistribution', () => {
  it('retorna 6 entries con age_groups exactos', () => {
    const dist = generateAgeDistribution('roma-norte');
    expect(dist.length).toBe(6);
    for (const entry of dist) {
      expect(AGE_GROUPS_SET.has(entry.age_group)).toBe(true);
    }
  });

  it('suma de percentages = 100 (±0.5)', () => {
    const dist = generateAgeDistribution('condesa');
    const sum = sumPercentages(dist);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(SUM_TOLERANCE);
  });

  it('determinismo: mismo scopeId produce mismo output', () => {
    const a = generateAgeDistribution('polanco');
    const b = generateAgeDistribution('polanco');
    expect(a).toEqual(b);
  });
});

describe('generateCensusForZone', () => {
  it('dominant_profession coincide con argmax de profession_distribution', () => {
    const scopeIds = ['roma-norte', 'condesa', 'polanco', 'coyoacan', 'tlatelolco'];
    for (const scope of scopeIds) {
      const census = generateCensusForZone(scope);
      let topPct = -Infinity;
      let topProfession = '';
      for (const entry of census.profession_distribution) {
        if (entry.percentage > topPct) {
          topPct = entry.percentage;
          topProfession = entry.profession;
        }
      }
      expect(census.dominant_profession).toBe(topProfession);
    }
  });

  it('retorna estructura con los 3 campos requeridos', () => {
    const census = generateCensusForZone('roma-norte');
    expect(Array.isArray(census.profession_distribution)).toBe(true);
    expect(Array.isArray(census.age_distribution)).toBe(true);
    expect(typeof census.dominant_profession).toBe('string');
    expect(census.dominant_profession.length).toBeGreaterThan(0);
  });
});

describe('generateSalaryRangeDistribution', () => {
  it('retorna 5 brackets en orden canónico', () => {
    const dist = generateSalaryRangeDistribution('roma-norte');
    expect(dist.length).toBe(5);
    for (let i = 0; i < SALARY_BRACKETS_ORDER.length; i++) {
      expect(dist[i]?.bracket).toBe(SALARY_BRACKETS_ORDER[i]);
    }
  });

  it('suma de percentages = 100 (±0.5)', () => {
    const dist = generateSalaryRangeDistribution('condesa');
    const sum = sumPercentages(dist);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(SUM_TOLERANCE);
  });

  it('determinismo: mismo scopeId produce mismo output', () => {
    const a = generateSalaryRangeDistribution('polanco');
    const b = generateSalaryRangeDistribution('polanco');
    expect(a).toEqual(b);
  });
});

describe('computeMedianSalaryMxn', () => {
  it('weighted average formula con input manual conocido ([100% en 15000-30000] → 22500)', () => {
    const dist = [
      { bracket: '0-7500', percentage: 0 },
      { bracket: '7500-15000', percentage: 0 },
      { bracket: '15000-30000', percentage: 100 },
      { bracket: '30000-60000', percentage: 0 },
      { bracket: '60000+', percentage: 0 },
    ];
    expect(computeMedianSalaryMxn(dist)).toBe(22500);
  });

  it('con 50/50 entre brackets calcula promedio de midpoints', () => {
    // 50% en 7500-15000 (mid 11250) + 50% en 30000-60000 (mid 45000) → 28125
    const dist = [
      { bracket: '0-7500', percentage: 0 },
      { bracket: '7500-15000', percentage: 50 },
      { bracket: '15000-30000', percentage: 0 },
      { bracket: '30000-60000', percentage: 50 },
      { bracket: '60000+', percentage: 0 },
    ];
    expect(computeMedianSalaryMxn(dist)).toBe(28125);
  });

  it('siempre > 0 para cualquier distribución válida CDMX baseline', () => {
    const scopeIds = ['roma-norte', 'condesa', 'polanco', 'doctores', 'iztapalapa-centro'];
    for (const scope of scopeIds) {
      const dist = generateSalaryRangeDistribution(scope);
      const median = computeMedianSalaryMxn(dist);
      expect(median).toBeGreaterThan(0);
    }
  });

  it('retorna entero (Math.round aplicado)', () => {
    const dist = generateSalaryRangeDistribution('roma-norte');
    const median = computeMedianSalaryMxn(dist);
    expect(Number.isInteger(median)).toBe(true);
  });

  it('con distribución vacía (total 0) retorna 0', () => {
    expect(computeMedianSalaryMxn([])).toBe(0);
  });
});

describe('generateEnighForZone', () => {
  it('median_salary_mxn > 0 y entero', () => {
    const enigh = generateEnighForZone('roma-norte');
    expect(enigh.median_salary_mxn).toBeGreaterThan(0);
    expect(Number.isInteger(enigh.median_salary_mxn)).toBe(true);
  });

  it('determinismo: mismo scopeId produce mismo output', () => {
    const a = generateEnighForZone('polanco');
    const b = generateEnighForZone('polanco');
    expect(a).toEqual(b);
  });

  it('retorna estructura con ambos campos', () => {
    const enigh = generateEnighForZone('condesa');
    expect(Array.isArray(enigh.salary_range_distribution)).toBe(true);
    expect(enigh.salary_range_distribution.length).toBe(5);
    expect(typeof enigh.median_salary_mxn).toBe('number');
  });
});

describe('cross-zone entropy (seed afecta resultado)', () => {
  it('zonas distintas producen profession_distribution distinta', () => {
    const a = generateProfessionDistribution('roma-norte');
    const b = generateProfessionDistribution('iztapalapa-centro');
    const aJson = JSON.stringify(a);
    const bJson = JSON.stringify(b);
    expect(aJson).not.toBe(bJson);
  });

  it('zonas distintas producen salary_range_distribution distinta', () => {
    const a = generateSalaryRangeDistribution('polanco');
    const b = generateSalaryRangeDistribution('doctores');
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('zonas distintas producen median_salary_mxn distinto (al menos en algunos casos)', () => {
    const scopes = [
      'roma-norte',
      'condesa',
      'polanco',
      'doctores',
      'iztapalapa-centro',
      'tlatelolco',
    ];
    const medians = scopes.map((s) => generateEnighForZone(s).median_salary_mxn);
    const uniqueMedians = new Set(medians);
    // Al menos 3 valores distintos entre 6 zonas — confirma que la entropía funciona.
    expect(uniqueMedians.size).toBeGreaterThanOrEqual(3);
  });
});
