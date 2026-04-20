import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import b04, {
  type B04DemandaBusqueda,
  type B04ProjectUnit,
  computeB04ProductMarketFit,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../b04-product-market-fit';

const SAMPLE_UNITS_3REC_4M: readonly B04ProjectUnit[] = [
  { recamaras: 3, precio: 4_000_000, ubicacion_zona: 'Del Valle', superficie_m2: 85 },
  { recamaras: 3, precio: 4_100_000, ubicacion_zona: 'Del Valle', superficie_m2: 88 },
  { recamaras: 3, precio: 4_200_000, ubicacion_zona: 'Del Valle', superficie_m2: 90 },
  { recamaras: 3, precio: 3_900_000, ubicacion_zona: 'Del Valle', superficie_m2: 82 },
  { recamaras: 3, precio: 4_050_000, ubicacion_zona: 'Del Valle', superficie_m2: 86 },
];

const DEMANDA_2REC_3M: readonly B04DemandaBusqueda[] = [
  {
    recamaras_filter: [2],
    precio_range: { min: 2_500_000, max: 3_000_000 },
    ubicacion_filter: ['Del Valle'],
    count: 80,
  },
  {
    recamaras_filter: [2],
    precio_range: { max: 3_000_000 },
    ubicacion_filter: ['Del Valle'],
    count: 40,
  },
];

describe('B04 Product-Market Fit calculator', () => {
  it('declara version, methodology, reasoning_template correctamente', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('busquedas');
    expect(methodology.sources).toContain('project_units');
    expect(methodology.validity.unit).toBe('days');
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
    expect(reasoning_template).toContain('{unidades_match_pct}');
    expect(methodology.dependencies).toEqual([]);
  });

  it('getLabelKey mapea umbrales correctamente', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.b04.excelente');
    expect(getLabelKey(60, 'high')).toBe('ie.score.b04.bueno');
    expect(getLabelKey(30, 'medium')).toBe('ie.score.b04.regular');
    expect(getLabelKey(10, 'low')).toBe('ie.score.b04.mal_fit');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.b04.insufficient');
  });

  it('criterio done — proyecto 3rec $4M + demanda 2rec $3M → score bajo + sugerencias', () => {
    const res = computeB04ProductMarketFit({
      project_units: SAMPLE_UNITS_3REC_4M,
      demanda_busquedas: DEMANDA_2REC_3M,
    });
    // No hay unidades que calcen con 2rec <$3M → match = 0
    expect(res.components.unidades_match).toBe(0);
    expect(res.components.unidades_match_pct).toBe(0);
    // Con 0% match, score debe ser 0 (match_pct=0 × cualquier intensity = 0).
    expect(res.value).toBe(0);
    expect(res.components.bucket).toBe('mal_fit');
    // Sugerencias: debe proponer "Crear mix 2rec" y/o "Precio más accesible <$3M".
    expect(res.components.oportunidades_ajuste_producto.length).toBeGreaterThan(0);
    const opsStr = res.components.oportunidades_ajuste_producto.join(' | ');
    expect(opsStr).toMatch(/2rec|Precio más accesible/);
    // Confidence con demanda_total=120 → 'high'.
    expect(res.confidence).toBe('high');
  });

  it('unidades_match_pct cuando demanda calza perfecto → 100%', () => {
    // Demanda modesta que calza 100% con el inventario (no genera gap).
    const demanda_matching: readonly B04DemandaBusqueda[] = [
      {
        recamaras_filter: [3],
        precio_range: { min: 3_500_000, max: 4_500_000 },
        ubicacion_filter: ['Del Valle'],
        count: 8, // ≤ 5 units × 2 = 10 → no es gap.
      },
    ];
    const res = computeB04ProductMarketFit({
      project_units: SAMPLE_UNITS_3REC_4M,
      demanda_busquedas: demanda_matching,
    });
    expect(res.components.unidades_match).toBe(5);
    expect(res.components.unidades_match_pct).toBe(100);
    // intensity = 8/5 = 1.6, log10(2.6) ≈ 0.415 → score ≈ 41.
    expect(res.value).toBeGreaterThan(25);
    expect(res.components.demanda_no_satisfecha.length).toBe(0);
  });

  it('demanda excesiva vs oferta marcada como gap aun si calza bucket', () => {
    // Demanda 150 vs 5 unidades → ratio 30x → debe flaguearse como gap aunque calze.
    const demanda_overflow: readonly B04DemandaBusqueda[] = [
      {
        recamaras_filter: [3],
        precio_range: { min: 3_500_000, max: 4_500_000 },
        ubicacion_filter: ['Del Valle'],
        count: 150,
      },
    ];
    const res = computeB04ProductMarketFit({
      project_units: SAMPLE_UNITS_3REC_4M,
      demanda_busquedas: demanda_overflow,
    });
    expect(res.components.unidades_match).toBe(5);
    // intensity = 150/5 = 30, log10(31) ≈ 1.49 → score ≈ 100 (clamp).
    expect(res.value).toBeGreaterThan(75);
    expect(res.components.bucket).toBe('excelente');
    // demanda 150 > max(1, 5*2)=10 → gap detectado (supply no cubre volumen).
    expect(res.components.demanda_no_satisfecha.length).toBeGreaterThanOrEqual(1);
  });

  it('demanda_no_satisfecha lista buckets con gap ≥ 2x oferta', () => {
    const demanda_mixed: readonly B04DemandaBusqueda[] = [
      // Match perfecto — NO debe aparecer en gaps.
      {
        recamaras_filter: [3],
        precio_range: { min: 3_500_000, max: 4_500_000 },
        ubicacion_filter: ['Del Valle'],
        count: 20,
      },
      // Gap: 2rec, alta demanda, 0 oferta.
      {
        recamaras_filter: [2],
        precio_range: { max: 3_000_000 },
        count: 100,
      },
      // Gap: 1rec premium, demanda media, 0 oferta.
      {
        recamaras_filter: [1],
        precio_range: { min: 5_000_000 },
        count: 30,
      },
    ];
    const res = computeB04ProductMarketFit({
      project_units: SAMPLE_UNITS_3REC_4M,
      demanda_busquedas: demanda_mixed,
    });
    // Dos gaps esperados: el más grande (100) primero.
    expect(res.components.demanda_no_satisfecha.length).toBeGreaterThanOrEqual(2);
    const topGap = res.components.demanda_no_satisfecha[0];
    expect(topGap).toBeDefined();
    if (!topGap) throw new Error('topGap undefined');
    expect(topGap.count).toBe(100);
    expect(topGap.criteria).toMatch(/2rec/);
  });

  it('sugerencia "Precio más accesible <$3M" cuando demanda precio bajo > 3x oferta', () => {
    const demanda_precio_bajo: readonly B04DemandaBusqueda[] = [
      { precio_range: { max: 2_500_000 }, count: 200 },
      { precio_range: { min: 3_500_000, max: 4_500_000 }, count: 10 },
    ];
    const res = computeB04ProductMarketFit({
      project_units: SAMPLE_UNITS_3REC_4M, // todas >$3.9M
      demanda_busquedas: demanda_precio_bajo,
    });
    const opsStr = res.components.oportunidades_ajuste_producto.join(' | ');
    expect(opsStr).toContain('Precio más accesible <$3M');
  });

  it('sin data → insufficient_data + score=0', () => {
    const res_no_units = computeB04ProductMarketFit({
      project_units: [],
      demanda_busquedas: DEMANDA_2REC_3M,
    });
    expect(res_no_units.confidence).toBe('insufficient_data');
    expect(res_no_units.value).toBe(0);
    expect(res_no_units.components.bucket).toBe('insufficient');

    const res_no_demanda = computeB04ProductMarketFit({
      project_units: SAMPLE_UNITS_3REC_4M,
      demanda_busquedas: [],
    });
    expect(res_no_demanda.confidence).toBe('insufficient_data');
    expect(res_no_demanda.value).toBe(0);
    expect(res_no_demanda.components.oportunidades_ajuste_producto).toEqual([]);
  });

  it('confidence escala con volumen de demanda', () => {
    const low_demanda: readonly B04DemandaBusqueda[] = [
      { recamaras_filter: [3], precio_range: { max: 5_000_000 }, count: 5 },
    ];
    const resLow = computeB04ProductMarketFit({
      project_units: SAMPLE_UNITS_3REC_4M,
      demanda_busquedas: low_demanda,
    });
    expect(resLow.confidence).toBe('low');

    const medium_demanda: readonly B04DemandaBusqueda[] = [
      { recamaras_filter: [3], precio_range: { max: 5_000_000 }, count: 30 },
    ];
    const resMed = computeB04ProductMarketFit({
      project_units: SAMPLE_UNITS_3REC_4M,
      demanda_busquedas: medium_demanda,
    });
    expect(resMed.confidence).toBe('medium');

    const high_demanda: readonly B04DemandaBusqueda[] = [
      { recamaras_filter: [3], precio_range: { max: 5_000_000 }, count: 200 },
    ];
    const resHigh = computeB04ProductMarketFit({
      project_units: SAMPLE_UNITS_3REC_4M,
      demanda_busquedas: high_demanda,
    });
    expect(resHigh.confidence).toBe('high');
  });

  it('b04.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await b04.run(
      { projectId: 'proj-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.b04.insufficient');
    expect(out.score_value).toBe(0);
  });
});
