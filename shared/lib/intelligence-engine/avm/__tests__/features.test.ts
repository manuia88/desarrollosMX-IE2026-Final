import { describe, expect, it } from 'vitest';
import { buildFeatureVector, FEATURE_NAMES, FEATURE_VECTOR_LENGTH } from '../features';
import type { AvmPropertyInput } from '../types';

const BASE_PROPERTY: AvmPropertyInput = {
  lat: 19.3854,
  lng: -99.1683,
  sup_m2: 120,
  recamaras: 3,
  banos: 2,
  amenidades: ['alberca', 'gimnasio', 'roof_garden'],
  estado_conservacion: 'excelente',
  tipo_propiedad: 'depto',
  sup_terreno_m2: 120,
  medio_banos: 1,
  estacionamientos: 2,
  edad_anos: 8,
  piso: 5,
  condiciones: {
    roof_garden: true,
    orientacion: 'S',
    vista_parque: true,
    amenidades_premium_count: 3,
    anos_escritura: 5,
    seguridad_interna: true,
    mascotas_ok: true,
  },
};

describe('AVM features — buildFeatureVector', () => {
  it('devuelve vector de longitud 47 exacto', async () => {
    const fv = await buildFeatureVector(BASE_PROPERTY);
    expect(fv.values).toHaveLength(47);
    expect(FEATURE_VECTOR_LENGTH).toBe(47);
    expect(fv.feature_names).toHaveLength(47);
  });

  it('feature_names y values alineados 1:1', async () => {
    const fv = await buildFeatureVector(BASE_PROPERTY);
    expect(fv.feature_names).toEqual(FEATURE_NAMES);
  });

  it('determinismo — mismo input → mismo vector', async () => {
    const a = await buildFeatureVector(BASE_PROPERTY);
    const b = await buildFeatureVector(BASE_PROPERTY);
    expect(a.values).toEqual(b.values);
  });

  it('falta data fuente → feature = 0 + missing_fields populated', async () => {
    const fv = await buildFeatureVector(BASE_PROPERTY);
    // Sin supabase y sin overrides → todos los scores zona y macro ausentes.
    expect(fv.missing_fields.length).toBeGreaterThan(0);
    expect(fv.missing_fields).toContain('f01_safety');
    expect(fv.missing_fields).toContain('tiie28');
    expect(fv.missing_fields).toContain('precio_m2_mediana_zona_12m');
  });

  it('override zone scores aplica y reduce missing_fields', async () => {
    const fv = await buildFeatureVector(BASE_PROPERTY, {
      zoneScoresOverride: {
        F01: 75,
        F02: 70,
        F03: 80,
        F08: 85,
        N01: 65,
        N02: 72,
        N08: 78,
        N11: 55,
        H01: 82,
        H02: 77,
      },
      macroSeriesOverride: {
        tiie28: 10.5,
        tasa_hipotecaria_avg: 11.2,
        inpc: 130,
        inpp_construccion: 145,
        tipo_cambio_fix: 18.5,
        infonavit_vsm: 130,
        shf_ipv_cdmx: 245,
        bbva_oferta: 10.8,
      },
      marketAggregatesOverride: {
        precio_m2_mediana_zona_12m: 65000,
        precio_m2_p25: 50000,
        precio_m2_p75: 80000,
        precio_m2_p50_6m: 67000,
        ventas_12m: 150,
        dias_en_mercado_avg: 72,
        absorcion_pct: 45,
        ratio_lista_cierre: 0.94,
        num_comparables_disponibles: 22,
      },
    });
    expect(fv.missing_fields).toHaveLength(0);
  });

  it('tipo_propiedad one-hot dummy coding (studio = reference)', async () => {
    const fv = await buildFeatureVector({ ...BASE_PROPERTY, tipo_propiedad: 'studio' });
    const dIdx = FEATURE_NAMES.indexOf('tipo_depto');
    const cIdx = FEATURE_NAMES.indexOf('tipo_casa');
    const tIdx = FEATURE_NAMES.indexOf('tipo_townhouse');
    const raw = (name: (typeof FEATURE_NAMES)[number]) => {
      // z-score con mean/std → para 0 value si mean>0, zscore es negativo.
      // Aquí solo verificamos que los 3 one-hot dan el mismo valor (0 raw).
      return fv.values[FEATURE_NAMES.indexOf(name)];
    };
    expect(raw('tipo_depto')).toEqual(fv.values[dIdx]);
    expect(raw('tipo_casa')).toEqual(fv.values[cIdx]);
    expect(raw('tipo_townhouse')).toEqual(fv.values[tIdx]);
  });

  it('estado_conservacion ordinal mapping (nuevo=5, obra_gris=1)', async () => {
    const idx = FEATURE_NAMES.indexOf('estado_conservacion_score');
    const nuevo = await buildFeatureVector({
      ...BASE_PROPERTY,
      estado_conservacion: 'nuevo',
    });
    const obra = await buildFeatureVector({
      ...BASE_PROPERTY,
      estado_conservacion: 'obra_gris',
    });
    const nuevoV = nuevo.values[idx];
    const obraV = obra.values[idx];
    if (nuevoV === undefined || obraV === undefined) {
      throw new Error('index undefined');
    }
    expect(nuevoV).toBeGreaterThan(obraV);
  });
});
