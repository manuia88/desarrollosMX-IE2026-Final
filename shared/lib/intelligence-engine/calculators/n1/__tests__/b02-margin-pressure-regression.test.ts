// B02 Margin Pressure — tests de regresión bug-proof.
//
// Objetivo: garantizar que NUNCA se reintroduce el bug del repo viejo
// (register-all.ts:82) donde se calculaba precio_m2 = precio_total /
// construccion_m2 (solo construcción), inflando artificialmente el precio/m².
//
// Fórmula correcta del rewrite v1:
//   precio_m2_real = precio_total / (construccion + terreno + roof + balcon)
//
// Cada test asserta:
//   1. precio_m2_real usa m2_totales (todos los m² vendibles).
//   2. precio_m2_buggy_viejo (campo de defensa eterna) expone la cifra
//      inflada que la fórmula buggy hubiera producido.
//   3. En fixtures con terreno/roof_garden, las dos cifras DIFIEREN por
//      margen significativo (≥ 1.5×) → si alguien re-introduce el bug,
//      estos asserts fallan inmediatamente.
//
// Si alguno de estos tests falla en CI, NO parchear los numbers — leer
// `b02-margin-pressure.ts` buscando la expresión `precio_total_unidad /
// construccion_m2` sola (sin suma con terreno+roof+balcon). Esa es la
// señal del regreso al bug.

import { describe, expect, it } from 'vitest';
import { computeB02MarginPressure } from '../b02-margin-pressure';

describe('B02 Margin Pressure — regression bug-proof', () => {
  it('fixture repo viejo: precio=$5M, construccion=100, terreno=50, roof=20 → precio_m2_real=$29,411 (NO $50k)', () => {
    const res = computeB02MarginPressure({
      precio_total_unidad: 5_000_000,
      construccion_m2: 100,
      terreno_m2: 50,
      roof_garden_m2: 20,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 15_000,
      zona_margen_p50_pct: 0.2,
    });
    // m2_totales = 100 + 50 + 20 + 0 = 170
    // precio_m2_real = 5_000_000 / 170 = 29,411.76470588...
    expect(res.components.m2_totales).toBe(170);
    expect(res.components.precio_m2_real).toBeCloseTo(29411.76, 0);
    // La cifra buggy histórica DEBE estar expuesta como campo para defensa.
    expect(res.components.precio_m2_buggy_viejo).toBeCloseTo(50000, 0);
  });

  it('bug viejo: precio_total / construccion_m2 = 50,000 (CIFRA INFLADA INCORRECTA) — fórmula correcta DIFIERE', () => {
    // Test negativo: simulamos la fórmula buggy (5M/100=50,000) y verificamos
    // que la fórmula correcta (precio_m2_real) difiere significativamente.
    const res = computeB02MarginPressure({
      precio_total_unidad: 5_000_000,
      construccion_m2: 100,
      terreno_m2: 50,
      roof_garden_m2: 20,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 15_000,
      zona_margen_p50_pct: 0.2,
    });
    const buggy_price_m2 = 5_000_000 / 100; // 50,000 — la cifra inflada del repo viejo
    expect(res.components.precio_m2_real).not.toBeCloseTo(buggy_price_m2, 0);
    // Ratio buggy/correct debe ser ≥ 1.5 (inflación sustancial).
    expect(buggy_price_m2 / res.components.precio_m2_real).toBeGreaterThan(1.5);
    // Defensa eterna: el campo buggy_viejo DEBE coincidir con la cifra inflada.
    expect(res.components.precio_m2_buggy_viejo).toBeCloseTo(buggy_price_m2, 0);
  });

  it('margen correcto usa precio_m2_real (NO buggy) para diagnóstico honesto', () => {
    // Mismo fixture. Si usáramos precio_m2_buggy_viejo ($50,000/m²) y costo
    // $15,000/m², margen_pct buggy = (50k-15k)/50k = 0.70 = 70% → score 100.
    // Margen CORRECTO: ($29,411-$15,000)/$29,411 = 0.490 = 49% → score 100
    // porque margen > p50. Pero el diagnóstico (diff buggy vs correcto) es
    // lo que medimos aquí.
    const res = computeB02MarginPressure({
      precio_total_unidad: 5_000_000,
      construccion_m2: 100,
      terreno_m2: 50,
      roof_garden_m2: 20,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 15_000,
      zona_margen_p50_pct: 0.2,
    });
    // margen_pct correcto (precio_m2_real=29411 - costo=15000) / 29411 ≈ 0.49
    expect(res.components.margen_pct).toBeGreaterThan(0.45);
    expect(res.components.margen_pct).toBeLessThan(0.55);
    // margen_pct buggy hubiera sido ≈ 0.70 — test verifica que NO está ahí.
    expect(res.components.margen_pct).toBeLessThan(0.65);
  });

  it('fixture crítico: cuando costo ≈ precio, bug ocultaría el colapso de margen', () => {
    // precio_total = 3M, construccion=60, terreno=40 → m2_totales=100
    //   precio_m2_real = 30,000
    //   precio_m2_buggy_viejo = 3M/60 = 50,000
    // costo_inpp = 32,000 → margen_pct correcto = -0.067 (NEGATIVO!)
    //                    → margen_pct buggy ≈ 0.36 (falsamente sano)
    // El bug hubiera escondido un proyecto con pérdida.
    const res = computeB02MarginPressure({
      precio_total_unidad: 3_000_000,
      construccion_m2: 60,
      terreno_m2: 40,
      roof_garden_m2: 0,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 32_000,
      zona_margen_p50_pct: 0.2,
    });
    expect(res.components.m2_totales).toBe(100);
    expect(res.components.precio_m2_real).toBeCloseTo(30000, 0);
    expect(res.components.precio_m2_buggy_viejo).toBeCloseTo(50000, 0);
    // Margen REAL es negativo — proyecto en pérdida.
    expect(res.components.margen_pct).toBeLessThan(0);
    // Bucket crítico — el bug lo habría pintado de 'sana'.
    expect(res.components.bucket).toBe('critica');
    expect(res.value).toBeLessThan(10);
  });

  it('10 fixtures proyectos seed CDMX → distribución coherente margen_pct 8-25%', () => {
    // Fixtures realistas CDMX 2026 — precio_total/m2_totales producen
    // precio_m2 entre $30k y $80k (rango mercado real), margen 8-25%.
    //
    // Estructura: [nombre_zona, precio_total, construccion, terreno, roof,
    // balcon, costo_inpp]
    const fixtures: ReadonlyArray<
      readonly [string, number, number, number, number, number, number]
    > = [
      // Zona prime (Polanco) — precios altos, margen sano.
      ['polanco-torre-a', 12_000_000, 120, 0, 30, 10, 35_000],
      ['polanco-torre-b', 15_000_000, 150, 0, 40, 10, 38_000],
      // Zona familiar (Del Valle) — mid-high.
      ['del-valle-01', 6_500_000, 110, 40, 20, 5, 30_000],
      ['del-valle-02', 5_800_000, 95, 50, 15, 5, 28_000],
      // Zona emergente (Narvarte) — mid.
      ['narvarte-01', 4_200_000, 85, 45, 10, 5, 26_000],
      ['narvarte-02', 3_800_000, 75, 40, 10, 5, 25_000],
      // Zona popular (Iztacalco) — low-mid margen apretado.
      ['iztacalco-01', 2_600_000, 70, 35, 0, 5, 22_000],
      ['iztacalco-02', 2_400_000, 65, 30, 0, 5, 21_000],
      // Zona baja (Iztapalapa) — margen más apretado aún.
      ['iztapalapa-01', 1_800_000, 60, 30, 0, 5, 19_000],
      ['iztapalapa-02', 2_000_000, 65, 35, 0, 5, 19_500],
    ];

    const margenes: number[] = [];
    for (const [label, precio, con, ter, roof, bal, costo] of fixtures) {
      const res = computeB02MarginPressure({
        precio_total_unidad: precio,
        construccion_m2: con,
        terreno_m2: ter,
        roof_garden_m2: roof,
        balcon_m2: bal,
        costo_construccion_m2_inpp: costo,
        zona_margen_p50_pct: 0.15,
      });
      // Todos los fixtures tienen inputs válidos → confidence nunca insufficient.
      expect(res.confidence, label).not.toBe('insufficient_data');
      // precio_m2_real usa m2_totales — assert por fixture.
      const m2_totales_esperado = con + ter + roof + bal;
      expect(res.components.m2_totales, label).toBe(m2_totales_esperado);
      expect(res.components.precio_m2_real, label).toBeCloseTo(precio / m2_totales_esperado, 0);
      // Buggy_viejo ≠ real cuando hay extras (todos los fixtures).
      if (ter + roof + bal > 0) {
        expect(res.components.precio_m2_buggy_viejo, label).not.toBe(res.components.precio_m2_real);
      }
      margenes.push(res.components.margen_pct);
    }

    // Distribución coherente — promedio margen 8-25% según criterio plan.
    const avg = margenes.reduce((a, b) => a + b, 0) / margenes.length;
    expect(avg).toBeGreaterThanOrEqual(0.08);
    expect(avg).toBeLessThanOrEqual(0.25);
    // Zona prime (Polanco) debe tener margen_pct > zona baja (Iztapalapa).
    expect(margenes[0]).toBeGreaterThan(margenes[8] ?? 0);
    expect(margenes[1]).toBeGreaterThan(margenes[9] ?? 0);
  });

  it('guardia formal: campo precio_m2_buggy_viejo SIEMPRE presente en components (defensa eterna)', () => {
    // Este test existe para garantizar que NADIE remueve el campo buggy_viejo
    // del shape de components. Si alguien lo quita "porque es feo", este
    // test falla y los reviewers leen el comment explicando por qué existe.
    const fixtures = [
      {
        precio_total_unidad: 5_000_000,
        construccion_m2: 100,
        terreno_m2: 50,
        roof_garden_m2: 20,
        balcon_m2: 0,
        costo_construccion_m2_inpp: 15_000,
        zona_margen_p50_pct: 0.2,
      },
      {
        precio_total_unidad: 3_000_000,
        construccion_m2: 70,
        terreno_m2: 0,
        roof_garden_m2: 0,
        balcon_m2: 0,
        costo_construccion_m2_inpp: 20_000,
        zona_margen_p50_pct: 0.2,
      },
      {
        precio_total_unidad: 100,
        construccion_m2: 0,
        terreno_m2: 0,
        roof_garden_m2: 0,
        balcon_m2: 0,
        costo_construccion_m2_inpp: 15_000,
        zona_margen_p50_pct: 0.2,
      },
    ];
    for (const f of fixtures) {
      const res = computeB02MarginPressure(f);
      expect(res.components).toHaveProperty('precio_m2_buggy_viejo');
      expect(typeof res.components.precio_m2_buggy_viejo).toBe('number');
    }
  });
});
