// 9.E.1 — Snapshot harness N1: 16 calculators × 16 zonas CDMX = 256 casos.
// Genera matriz estable para detectar regresiones cuando se tocan fórmulas.
// Perfiles sintéticos derivados de CDMX_ZONE_IDS — NO son data real de zona,
// solo un gradient determinístico que discrimina premium vs medio vs bajo.

import { describe, expect, it } from 'vitest';
import { CDMX_ZONE_IDS } from '../../__fixtures__/cdmx-zones';
import { computeA02InvestmentSimulation } from '../n1/a02-investment-simulation';
import { computeA05Tco10y } from '../n1/a05-tco-10y';
import { computeA06Neighborhood } from '../n1/a06-neighborhood';
import { computeA12PriceFairness } from '../n1/a12-price-fairness';
import { computeB01DemandHeatmap } from '../n1/b01-demand-heatmap';
import { computeB02MarginPressure } from '../n1/b02-margin-pressure';
import { computeB04ProductMarketFit } from '../n1/b04-product-market-fit';
import { computeB07CompetitiveIntel } from '../n1/b07-competitive-intel';
import { computeB08AbsorptionForecast } from '../n1/b08-absorption-forecast';
import { computeD05Gentrification } from '../n1/d05-gentrification';
import { computeD06AffordabilityCrisis } from '../n1/d06-affordability-crisis';
import { computeF08LifeQualityIndex } from '../n1/f08-life-quality-index';
import { computeF12RiskMap } from '../n1/f12-risk-map';
import { computeH05TrustScore } from '../n1/h05-trust-score';
import { computeH07Environmental } from '../n1/h07-environmental';
import { computeH14BuyerPersona } from '../n1/h14-buyer-persona';

interface ZoneProfile {
  readonly key: string;
  readonly zone_id: string;
  readonly tier: 'premium' | 'medio' | 'bajo';
  readonly intensity: number;
  readonly precio_m2: number;
  readonly safety: number;
  readonly transit: number;
  readonly ecosystem: number;
  readonly schools: number;
  readonly health: number;
  readonly walkability: number;
  readonly crime: number;
  readonly env: number;
  readonly macro_momentum: number;
}

function buildProfile(idx: number, key: string, zoneId: string): ZoneProfile {
  const premiumKeys = new Set(['polanco', 'roma_norte', 'del_valle', 'san_angel']);
  const bajoKeys = new Set(['iztapalapa_sur', 'tepito', 'milpa_alta_centro', 'xochimilco_centro']);
  const tier: ZoneProfile['tier'] = premiumKeys.has(key)
    ? 'premium'
    : bajoKeys.has(key)
      ? 'bajo'
      : 'medio';
  const base = tier === 'premium' ? 85 : tier === 'medio' ? 60 : 35;
  const drift = ((idx * 7) % 11) - 5;
  const n = (v: number) => Math.max(0, Math.min(100, v + drift));
  return {
    key,
    zone_id: zoneId,
    tier,
    intensity: base,
    precio_m2: tier === 'premium' ? 65_000 : tier === 'medio' ? 38_000 : 18_000,
    safety: n(base + 2),
    transit: n(base - 3),
    ecosystem: n(base + 1),
    schools: n(base + 4),
    health: n(base - 1),
    walkability: n(base + 3),
    crime: n(100 - base),
    env: n(base - 2),
    macro_momentum: tier === 'premium' ? 8 : tier === 'medio' ? 4 : 1,
  };
}

const ZONES: readonly ZoneProfile[] = Object.entries(CDMX_ZONE_IDS).map(([k, id], i) =>
  buildProfile(i, k, id),
);

function runA02(p: ZoneProfile) {
  return computeA02InvestmentSimulation({
    propertyValue: p.precio_m2 * 80,
    downPayment: 0.2,
    loanYears: 20,
    macro: { tasa_hipotecaria_avg: 0.105 },
    momentum: {
      p10: Math.max(0, (p.macro_momentum - 3) / 100),
      p25: Math.max(0, (p.macro_momentum - 2) / 100),
      p50: p.macro_momentum / 100,
      p75: (p.macro_momentum + 2) / 100,
    },
  });
}

function runA05(p: ZoneProfile) {
  return computeA05Tco10y({
    propertyValue: p.precio_m2 * 80,
    downPayment: 0.2,
    loanYears: 20,
    predial_anual_2026_mxn: p.precio_m2 * 80 * 0.001,
    macro: { tasa_hipotecaria_avg: 10.5 },
    plusvalia_10y_estimada_mxn: p.precio_m2 * 80 * (p.macro_momentum / 100) * 10,
  });
}

function runA06(p: ZoneProfile) {
  return computeA06Neighborhood({
    subscores: {
      F08: p.safety,
      H01: p.schools,
      H02: p.health,
      N08: p.walkability,
      N10: Math.max(0, p.safety - 10),
    },
  });
}

function runA12(p: ZoneProfile) {
  const precio_justo = p.precio_m2 * 80;
  const gap = p.tier === 'premium' ? 0.02 : p.tier === 'medio' ? 0.1 : 0.25;
  return computeA12PriceFairness({
    precio_ofertado: precio_justo * (1 + gap),
    precio_justo_avm: precio_justo,
    percentil_zona_p50: 50,
    comparables: Array.from({ length: 15 }, (_, i) => ({
      propertyId: `${p.key}-comp-${i}`,
      precio_m2_mxn: p.precio_m2 + i * 100,
    })),
  });
}

function runB01(p: ZoneProfile) {
  return computeB01DemandHeatmap({
    searches_count: Math.round(p.intensity * 10),
    wishlist_count: Math.round(p.intensity * 3),
    views_count: Math.round(p.intensity * 20),
    period_days: 30,
  });
}

function runB02(p: ZoneProfile) {
  return computeB02MarginPressure({
    precio_total_unidad: p.precio_m2 * 80 * 1.2,
    construccion_m2: 80,
    terreno_m2: 40,
    roof_garden_m2: 10,
    balcon_m2: 6,
    costo_construccion_m2_inpp: p.precio_m2 * 0.6,
    zona_margen_p50_pct: 18,
  });
}

function runB04(p: ZoneProfile) {
  return computeB04ProductMarketFit({
    project_units: [
      { unit_id: `${p.key}-u1`, recamaras: 2, precio_mxn: p.precio_m2 * 80, m2: 80 },
      { unit_id: `${p.key}-u2`, recamaras: 3, precio_mxn: p.precio_m2 * 120, m2: 120 },
    ],
    demanda_busquedas: [
      { recamaras: 2, precio_max_mxn: p.precio_m2 * 85, count: Math.round(p.intensity) },
      { recamaras: 3, precio_max_mxn: p.precio_m2 * 130, count: Math.round(p.intensity / 2) },
    ],
  });
}

function runB07(p: ZoneProfile) {
  const mk = (id: string, mult: number) => ({
    project_id: id,
    precio_m2: p.precio_m2 * mult,
    amenidades_count: Math.round(p.intensity / 10),
    tamano_promedio_m2: 90,
    absorcion_12m_pct: p.intensity / 2,
    marketing_spend_proxy: p.intensity,
    days_on_market: 180 - p.intensity,
    quality_score: p.intensity,
    momentum_zona_n11: p.macro_momentum,
  });
  return computeB07CompetitiveIntel({
    my_project: mk(`${p.key}-self`, 1),
    competitors: [mk('c1', 1.05), mk('c2', 0.95), mk('c3', 1.1), mk('c4', 0.9), mk('c5', 1.0)],
  });
}

function runB08(p: ZoneProfile) {
  return computeB08AbsorptionForecast({
    project_id: `${p.key}-proj`,
    ventas_ultimos_6m: Array.from({ length: 6 }, (_, i) => ({
      month: `2025-${String(i + 1).padStart(2, '0')}`,
      unidades: Math.max(1, Math.round(p.intensity / 20) + (i % 3)),
    })),
    momentum_zone_n11: p.macro_momentum,
    b01_demand: p.intensity,
    b04_pmf: p.intensity * 0.8,
    macro_tiie: 10.5,
    units_remaining: 24,
    period: '2026-04-01',
    proyectos_zona: 60,
  });
}

function runD05(p: ZoneProfile) {
  return computeD05Gentrification({
    N03_velocity: p.macro_momentum * 8,
    A04_arbitrage: p.intensity - 10,
    N01_diversity: p.ecosystem,
    price_index_zona_12m_delta_pct: p.macro_momentum * 1.5,
  });
}

function runD06(p: ZoneProfile) {
  return computeD06AffordabilityCrisis({
    A01_affordability: p.intensity,
    sobrecosto_vivienda_pct: 100 - p.intensity,
    salario_mediano_zona: p.tier === 'premium' ? 45_000 : p.tier === 'medio' ? 20_000 : 9_000,
    renta_p50_zona: p.precio_m2 * 0.4,
    precio_m2_zona_p50: p.precio_m2,
  });
}

function runF08(p: ZoneProfile) {
  return computeF08LifeQualityIndex({
    subscores: {
      F01: p.safety,
      F02: p.transit,
      F03: p.ecosystem,
      H01: p.schools,
      H02: p.health,
      N08: p.walkability,
      N01: p.ecosystem - 5,
      N04: p.crime,
      H07: p.env,
    },
  });
}

function runF12(p: ZoneProfile) {
  return computeF12RiskMap({
    H03: 100 - p.safety,
    N07: 100 - p.env,
    F01: p.safety,
    F06: 80,
    N05: p.intensity,
  });
}

function runH05(p: ZoneProfile) {
  return computeH05TrustScore({
    desarrolladora_id: `dev-${p.key}`,
    reviews_avg: p.intensity / 20,
    cumplimiento_entrega_pct: p.intensity,
    volumen_ops_3y_count: Math.round(p.intensity / 3),
    projects_count: 15,
    deliveries_count: 10,
    profeco_quejas_count: p.tier === 'bajo' ? 5 : 1,
  });
}

function runH07(p: ZoneProfile) {
  return computeH07Environmental({
    F04: p.env,
    parques_densidad: p.tier === 'premium' ? 0.15 : p.tier === 'medio' ? 0.08 : 0.03,
  });
}

function runH14(p: ZoneProfile) {
  return computeH14BuyerPersona({
    user_id: `user-${p.key}`,
    wishlist_projects: Array.from({ length: 5 }, (_, i) => ({
      project_id: `${p.key}-wl-${i}`,
      precio: p.precio_m2 * 80,
      recamaras: 2 + (i % 2),
    })),
    search_logs_last_90d: Array.from({ length: 10 }, (_, i) => ({
      filter_data: { precio_max: p.precio_m2 * 90, recamaras: 2 + (i % 2) },
    })),
  });
}

const CALCULATORS: readonly {
  id: string;
  run: (p: ZoneProfile) => { value: number; confidence: string };
}[] = [
  { id: 'A02', run: (p) => runA02(p) },
  { id: 'A05', run: (p) => runA05(p) },
  { id: 'A06', run: (p) => runA06(p) },
  { id: 'A12', run: (p) => runA12(p) },
  { id: 'B01', run: (p) => runB01(p) },
  { id: 'B02', run: (p) => runB02(p) },
  { id: 'B04', run: (p) => runB04(p) },
  { id: 'B07', run: (p) => runB07(p) },
  { id: 'B08', run: (p) => runB08(p) },
  { id: 'D05', run: (p) => runD05(p) },
  { id: 'D06', run: (p) => runD06(p) },
  { id: 'F08', run: (p) => runF08(p) },
  { id: 'F12', run: (p) => runF12(p) },
  { id: 'H05', run: (p) => runH05(p) },
  { id: 'H07', run: (p) => runH07(p) },
  { id: 'H14', run: (p) => runH14(p) },
];

describe('N1 snapshot harness — 16 calculators × 16 zonas CDMX = 256 casos', () => {
  it('ejerce los 16 calculators en las 16 zonas (256 combinaciones)', () => {
    const matrix: Record<string, Record<string, { value: number; confidence: string }>> = {};
    for (const zone of ZONES) {
      matrix[zone.key] = {};
      for (const calc of CALCULATORS) {
        const out = calc.run(zone);
        const row = matrix[zone.key];
        if (row) {
          row[calc.id] = {
            value: out.value,
            confidence: out.confidence,
          };
        }
      }
    }
    const total = Object.values(matrix).reduce((n, r) => n + Object.keys(r).length, 0);
    expect(total).toBe(256);
    expect(matrix).toMatchSnapshot();
  });

  it('premium zones produce A06 scores mayores que bajo zones', () => {
    const premium = ZONES.find((z) => z.tier === 'premium');
    const bajo = ZONES.find((z) => z.tier === 'bajo');
    if (!premium || !bajo) throw new Error('profile fixture broken');
    const a06p = runA06(premium).value;
    const a06b = runA06(bajo).value;
    expect(a06p).toBeGreaterThan(a06b);
  });

  it('A12 gap 25% en zonas bajas → score bajo (fórmula × 4)', () => {
    const bajo = ZONES.find((z) => z.tier === 'bajo');
    if (!bajo) throw new Error('profile fixture broken');
    const out = runA12(bajo);
    expect(out.value).toBeLessThanOrEqual(10);
  });
});
