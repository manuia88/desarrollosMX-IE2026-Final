// 16 fixtures CDMX (1 por alcaldía) para tests de calculators IE N0.
// Counts aproximados basados en literatura pública (DENUE 2024, FGJ CDMX
// reportes trimestrales, GTFS Metro CDMX abierto, SIGED SEP dir. de escuelas,
// DGIS CLUES establecimientos, Atlas de Riesgos CDMX microzonificación,
// reportes SACMEX abiertos, INEGI INPP construcción serie histórica).
//
// Los valores NO representan data real verificada — son razonables para
// producir scores snapshot-ables que discriminan entre extremos (Polanco vs
// Iztapalapa vs Milpa Alta) en tests de los 14 calculators de sesión 1.
//
// Estructura aditiva: source keys que aún no tienen data (inah, conagua,
// airroi, mapbox, infonavit, market_prices_secondary, macro_series, census)
// se añaden en sesión 2 sin restructurar.
//
// Reutilizable: BLOQUE 8.B parte 2, BLOQUE 8.C (N01-N11), BLOQUE 8.D (AVM),
// BLOQUE 8.E (UI), BLOQUE 8.F (cascades).

export type AtlasZonaGeotecnica = 'I' | 'II' | 'IIIa' | 'IIIb' | 'IIIc' | 'IIId';
export type AtlasAmplificacion = 'baja' | 'media' | 'alta';
export type AtlasLicuacion = 'bajo' | 'medio' | 'alto';
export type InppLevel = 'normal' | 'warning' | 'critical';

export interface DenueCounts {
  readonly total: number;
  readonly tier_counts: {
    readonly high: number;
    readonly standard: number;
    readonly basic: number;
  };
  readonly by_macro_category: Readonly<Record<string, number>>;
}

export interface FgjCounts {
  readonly count_12m: number;
  readonly count_12m_prev: number;
  readonly by_categoria: {
    readonly violentos: number;
    readonly patrimoniales: number;
    readonly no_violentos: number;
  };
  readonly hora_max_riesgo: string;
}

export interface GtfsCounts {
  readonly estaciones_metro_1km: number;
  readonly paradas_metrobus_500m: number;
  readonly estaciones_tren_2km: number;
  readonly ecobici_400m: number;
  readonly densidad_rutas_brt: number;
}

export interface SigedCounts {
  readonly total_1km: number;
  readonly publicas: number;
  readonly privadas: number;
  readonly top_20_count: number;
  readonly nivel_primaria: number;
  readonly nivel_secundaria: number;
  readonly nivel_preparatoria: number;
  readonly enlace_percentil: number;
}

export interface DgisCounts {
  readonly total_2km: number;
  readonly clues_1er_nivel: number;
  readonly clues_2do_nivel: number;
  readonly urgencias_24h: number;
  readonly distancia_hospital_2do_km: number;
}

export interface AtlasData {
  readonly zona_geotecnica: AtlasZonaGeotecnica;
  readonly amplificacion_onda: AtlasAmplificacion;
  readonly licuacion_riesgo: AtlasLicuacion;
}

export interface SacmexCounts {
  readonly meses_datos: number;
  readonly dias_sin_agua_anual: number;
  readonly presion_promedio_kpa: number;
  readonly tandeos_mes_promedio: number;
}

export interface InppData {
  readonly inpp_construccion_delta_12m: number;
  readonly mano_obra_delta_12m: number;
  readonly materiales_delta_12m: number;
  readonly level: InppLevel;
}

export interface CdmxZoneSources {
  readonly denue: DenueCounts;
  readonly fgj: FgjCounts;
  readonly gtfs: GtfsCounts;
  readonly siged: SigedCounts;
  readonly dgis: DgisCounts;
  readonly atlas: AtlasData;
  readonly sacmex: SacmexCounts;
  readonly inegi_inpp: InppData;
  readonly rama: null;
  readonly seduvi: null;
  readonly catastro: null;
  readonly locatel_0311: null;
}

export interface CdmxZoneFixture {
  readonly alcaldia: string;
  readonly zona_id: string;
  readonly zona_name: string;
  readonly lat: number;
  readonly lng: number;
  readonly poblacion: number;
  readonly sources: CdmxZoneSources;
}

// UUIDs deterministas — pre-generados una sola vez y hardcodeados.
// Formato válido UUID v4: 3ra tupla empieza con `4`, 4ta con [8-b].
export const CDMX_ZONE_IDS = {
  san_angel: 'a1b1c1d1-0001-4008-9b01-000000000cd1',
  claveria: 'a1b1c1d1-0002-4008-9b01-000000000cd2',
  del_valle: 'a1b1c1d1-0003-4008-9b01-000000000cd3',
  coyoacan_centro: 'a1b1c1d1-0004-4008-9b01-000000000cd4',
  cuajimalpa_centro: 'a1b1c1d1-0005-4008-9b01-000000000cd5',
  roma_norte: 'a1b1c1d1-0006-4008-9b01-000000000cd6',
  lindavista: 'a1b1c1d1-0007-4008-9b01-000000000cd7',
  iztacalco_centro: 'a1b1c1d1-0008-4008-9b01-000000000cd8',
  iztapalapa_sur: 'a1b1c1d1-0009-4008-9b01-000000000cd9',
  contreras_centro: 'a1b1c1d1-000a-4008-9b01-000000000cda',
  polanco: 'a1b1c1d1-000b-4008-9b01-000000000cdb',
  milpa_alta_centro: 'a1b1c1d1-000c-4008-9b01-000000000cdc',
  tlahuac_centro: 'a1b1c1d1-000d-4008-9b01-000000000cdd',
  tlalpan_centro: 'a1b1c1d1-000e-4008-9b01-000000000cde',
  tepito: 'a1b1c1d1-000f-4008-9b01-000000000cdf',
  xochimilco_centro: 'a1b1c1d1-0010-4008-9b01-000000000ce0',
} as const;

export const CDMX_ZONES: readonly CdmxZoneFixture[] = [
  {
    alcaldia: 'Álvaro Obregón',
    zona_id: CDMX_ZONE_IDS.san_angel,
    zona_name: 'San Ángel',
    lat: 19.3459,
    lng: -99.1905,
    poblacion: 42000,
    sources: {
      denue: {
        total: 620,
        tier_counts: { high: 185, standard: 320, basic: 115 },
        by_macro_category: {
          gastronomia: 135,
          retail: 155,
          salud: 65,
          educacion: 45,
          servicios_profesionales: 80,
          cultura_entretenimiento: 45,
          financiero: 30,
          fitness_wellness: 30,
          servicios_publicos: 5,
          automotriz: 18,
          manufacturas: 8,
          logistica: 4,
        },
      },
      fgj: {
        count_12m: 42,
        count_12m_prev: 48,
        by_categoria: { violentos: 6, patrimoniales: 28, no_violentos: 8 },
        hora_max_riesgo: '20:00-22:00',
      },
      gtfs: {
        estaciones_metro_1km: 1,
        paradas_metrobus_500m: 3,
        estaciones_tren_2km: 0,
        ecobici_400m: 4,
        densidad_rutas_brt: 0.6,
      },
      siged: {
        total_1km: 9,
        publicas: 4,
        privadas: 5,
        top_20_count: 3,
        nivel_primaria: 4,
        nivel_secundaria: 3,
        nivel_preparatoria: 2,
        enlace_percentil: 78,
      },
      dgis: {
        total_2km: 11,
        clues_1er_nivel: 7,
        clues_2do_nivel: 3,
        urgencias_24h: 1,
        distancia_hospital_2do_km: 1.2,
      },
      atlas: {
        zona_geotecnica: 'II',
        amplificacion_onda: 'media',
        licuacion_riesgo: 'bajo',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 6,
        presion_promedio_kpa: 180,
        tandeos_mes_promedio: 0,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 9.0,
        mano_obra_delta_12m: 7.5,
        materiales_delta_12m: 10.2,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Azcapotzalco',
    zona_id: CDMX_ZONE_IDS.claveria,
    zona_name: 'Clavería',
    lat: 19.4759,
    lng: -99.1863,
    poblacion: 55000,
    sources: {
      denue: {
        total: 420,
        tier_counts: { high: 60, standard: 220, basic: 140 },
        by_macro_category: {
          gastronomia: 95,
          retail: 145,
          salud: 38,
          educacion: 32,
          servicios_profesionales: 25,
          cultura_entretenimiento: 12,
          financiero: 18,
          fitness_wellness: 14,
          servicios_publicos: 6,
          automotriz: 22,
          manufacturas: 8,
          logistica: 5,
        },
      },
      fgj: {
        count_12m: 58,
        count_12m_prev: 62,
        by_categoria: { violentos: 10, patrimoniales: 35, no_violentos: 13 },
        hora_max_riesgo: '21:00-23:00',
      },
      gtfs: {
        estaciones_metro_1km: 1,
        paradas_metrobus_500m: 2,
        estaciones_tren_2km: 0,
        ecobici_400m: 0,
        densidad_rutas_brt: 0.3,
      },
      siged: {
        total_1km: 8,
        publicas: 6,
        privadas: 2,
        top_20_count: 1,
        nivel_primaria: 4,
        nivel_secundaria: 2,
        nivel_preparatoria: 2,
        enlace_percentil: 62,
      },
      dgis: {
        total_2km: 9,
        clues_1er_nivel: 6,
        clues_2do_nivel: 2,
        urgencias_24h: 1,
        distancia_hospital_2do_km: 1.8,
      },
      atlas: {
        zona_geotecnica: 'II',
        amplificacion_onda: 'media',
        licuacion_riesgo: 'bajo',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 8,
        presion_promedio_kpa: 165,
        tandeos_mes_promedio: 1,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 8.0,
        mano_obra_delta_12m: 7.0,
        materiales_delta_12m: 9.0,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Benito Juárez',
    zona_id: CDMX_ZONE_IDS.del_valle,
    zona_name: 'Del Valle',
    lat: 19.3854,
    lng: -99.1683,
    poblacion: 63000,
    sources: {
      denue: {
        total: 820,
        tier_counts: { high: 240, standard: 420, basic: 160 },
        by_macro_category: {
          gastronomia: 185,
          retail: 210,
          salud: 75,
          educacion: 60,
          servicios_profesionales: 95,
          cultura_entretenimiento: 25,
          financiero: 35,
          fitness_wellness: 45,
          servicios_publicos: 8,
          automotriz: 25,
          manufacturas: 12,
          logistica: 8,
        },
      },
      fgj: {
        count_12m: 38,
        count_12m_prev: 45,
        by_categoria: { violentos: 5, patrimoniales: 24, no_violentos: 9 },
        hora_max_riesgo: '19:00-22:00',
      },
      gtfs: {
        estaciones_metro_1km: 2,
        paradas_metrobus_500m: 4,
        estaciones_tren_2km: 0,
        ecobici_400m: 8,
        densidad_rutas_brt: 1.4,
      },
      siged: {
        total_1km: 12,
        publicas: 4,
        privadas: 8,
        top_20_count: 3,
        nivel_primaria: 5,
        nivel_secundaria: 4,
        nivel_preparatoria: 3,
        enlace_percentil: 85,
      },
      dgis: {
        total_2km: 14,
        clues_1er_nivel: 9,
        clues_2do_nivel: 4,
        urgencias_24h: 2,
        distancia_hospital_2do_km: 0.8,
      },
      atlas: {
        zona_geotecnica: 'II',
        amplificacion_onda: 'media',
        licuacion_riesgo: 'bajo',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 4,
        presion_promedio_kpa: 195,
        tandeos_mes_promedio: 0,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 8.5,
        mano_obra_delta_12m: 7.2,
        materiales_delta_12m: 9.8,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Coyoacán',
    zona_id: CDMX_ZONE_IDS.coyoacan_centro,
    zona_name: 'Coyoacán Centro',
    lat: 19.3467,
    lng: -99.1618,
    poblacion: 48000,
    sources: {
      denue: {
        total: 520,
        tier_counts: { high: 140, standard: 280, basic: 100 },
        by_macro_category: {
          gastronomia: 145,
          retail: 120,
          salud: 42,
          educacion: 40,
          servicios_profesionales: 55,
          cultura_entretenimiento: 45,
          financiero: 22,
          fitness_wellness: 20,
          servicios_publicos: 6,
          automotriz: 15,
          manufacturas: 6,
          logistica: 4,
        },
      },
      fgj: {
        count_12m: 52,
        count_12m_prev: 60,
        by_categoria: { violentos: 8, patrimoniales: 32, no_violentos: 12 },
        hora_max_riesgo: '20:00-23:00',
      },
      gtfs: {
        estaciones_metro_1km: 1,
        paradas_metrobus_500m: 2,
        estaciones_tren_2km: 0,
        ecobici_400m: 2,
        densidad_rutas_brt: 0.4,
      },
      siged: {
        total_1km: 10,
        publicas: 5,
        privadas: 5,
        top_20_count: 2,
        nivel_primaria: 4,
        nivel_secundaria: 3,
        nivel_preparatoria: 3,
        enlace_percentil: 72,
      },
      dgis: {
        total_2km: 12,
        clues_1er_nivel: 8,
        clues_2do_nivel: 3,
        urgencias_24h: 1,
        distancia_hospital_2do_km: 1.4,
      },
      atlas: {
        zona_geotecnica: 'II',
        amplificacion_onda: 'media',
        licuacion_riesgo: 'bajo',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 12,
        presion_promedio_kpa: 160,
        tandeos_mes_promedio: 1,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 7.0,
        mano_obra_delta_12m: 6.5,
        materiales_delta_12m: 7.8,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Cuajimalpa',
    zona_id: CDMX_ZONE_IDS.cuajimalpa_centro,
    zona_name: 'Cuajimalpa Centro',
    lat: 19.3567,
    lng: -99.2942,
    poblacion: 22000,
    sources: {
      denue: {
        total: 260,
        tier_counts: { high: 40, standard: 130, basic: 90 },
        by_macro_category: {
          gastronomia: 55,
          retail: 90,
          salud: 18,
          educacion: 15,
          servicios_profesionales: 25,
          cultura_entretenimiento: 8,
          financiero: 10,
          fitness_wellness: 6,
          servicios_publicos: 3,
          automotriz: 20,
          manufacturas: 6,
          logistica: 4,
        },
      },
      fgj: {
        count_12m: 34,
        count_12m_prev: 38,
        by_categoria: { violentos: 6, patrimoniales: 20, no_violentos: 8 },
        hora_max_riesgo: '21:00-23:00',
      },
      gtfs: {
        estaciones_metro_1km: 0,
        paradas_metrobus_500m: 0,
        estaciones_tren_2km: 0,
        ecobici_400m: 0,
        densidad_rutas_brt: 0,
      },
      siged: {
        total_1km: 5,
        publicas: 3,
        privadas: 2,
        top_20_count: 0,
        nivel_primaria: 2,
        nivel_secundaria: 2,
        nivel_preparatoria: 1,
        enlace_percentil: 55,
      },
      dgis: {
        total_2km: 6,
        clues_1er_nivel: 4,
        clues_2do_nivel: 1,
        urgencias_24h: 0,
        distancia_hospital_2do_km: 3.5,
      },
      atlas: {
        zona_geotecnica: 'IIIa',
        amplificacion_onda: 'alta',
        licuacion_riesgo: 'medio',
      },
      sacmex: {
        meses_datos: 10,
        dias_sin_agua_anual: 18,
        presion_promedio_kpa: 140,
        tandeos_mes_promedio: 2,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 9.0,
        mano_obra_delta_12m: 8.0,
        materiales_delta_12m: 10.0,
        level: 'warning',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Cuauhtémoc',
    zona_id: CDMX_ZONE_IDS.roma_norte,
    zona_name: 'Roma Norte',
    lat: 19.4143,
    lng: -99.1628,
    poblacion: 35000,
    sources: {
      denue: {
        total: 1240,
        tier_counts: { high: 480, standard: 540, basic: 220 },
        by_macro_category: {
          gastronomia: 340,
          retail: 285,
          salud: 85,
          educacion: 55,
          servicios_profesionales: 165,
          cultura_entretenimiento: 95,
          financiero: 45,
          fitness_wellness: 72,
          servicios_publicos: 10,
          automotriz: 35,
          manufacturas: 35,
          logistica: 18,
        },
      },
      fgj: {
        count_12m: 145,
        count_12m_prev: 155,
        by_categoria: { violentos: 24, patrimoniales: 95, no_violentos: 26 },
        hora_max_riesgo: '22:00-02:00',
      },
      gtfs: {
        estaciones_metro_1km: 3,
        paradas_metrobus_500m: 6,
        estaciones_tren_2km: 0,
        ecobici_400m: 14,
        densidad_rutas_brt: 2.2,
      },
      siged: {
        total_1km: 11,
        publicas: 4,
        privadas: 7,
        top_20_count: 2,
        nivel_primaria: 4,
        nivel_secundaria: 4,
        nivel_preparatoria: 3,
        enlace_percentil: 75,
      },
      dgis: {
        total_2km: 18,
        clues_1er_nivel: 11,
        clues_2do_nivel: 5,
        urgencias_24h: 2,
        distancia_hospital_2do_km: 0.6,
      },
      atlas: {
        zona_geotecnica: 'II',
        amplificacion_onda: 'media',
        licuacion_riesgo: 'bajo',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 14,
        presion_promedio_kpa: 170,
        tandeos_mes_promedio: 1,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 10.0,
        mano_obra_delta_12m: 8.5,
        materiales_delta_12m: 11.5,
        level: 'warning',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Gustavo A. Madero',
    zona_id: CDMX_ZONE_IDS.lindavista,
    zona_name: 'Lindavista',
    lat: 19.4892,
    lng: -99.1295,
    poblacion: 68000,
    sources: {
      denue: {
        total: 380,
        tier_counts: { high: 55, standard: 200, basic: 125 },
        by_macro_category: {
          gastronomia: 85,
          retail: 130,
          salud: 32,
          educacion: 25,
          servicios_profesionales: 22,
          cultura_entretenimiento: 14,
          financiero: 15,
          fitness_wellness: 10,
          servicios_publicos: 5,
          automotriz: 26,
          manufacturas: 10,
          logistica: 6,
        },
      },
      fgj: {
        count_12m: 88,
        count_12m_prev: 92,
        by_categoria: { violentos: 14, patrimoniales: 58, no_violentos: 16 },
        hora_max_riesgo: '21:00-00:00',
      },
      gtfs: {
        estaciones_metro_1km: 1,
        paradas_metrobus_500m: 2,
        estaciones_tren_2km: 0,
        ecobici_400m: 0,
        densidad_rutas_brt: 0.5,
      },
      siged: {
        total_1km: 7,
        publicas: 5,
        privadas: 2,
        top_20_count: 0,
        nivel_primaria: 3,
        nivel_secundaria: 2,
        nivel_preparatoria: 2,
        enlace_percentil: 58,
      },
      dgis: {
        total_2km: 9,
        clues_1er_nivel: 6,
        clues_2do_nivel: 2,
        urgencias_24h: 1,
        distancia_hospital_2do_km: 1.5,
      },
      atlas: {
        zona_geotecnica: 'IIIb',
        amplificacion_onda: 'alta',
        licuacion_riesgo: 'medio',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 16,
        presion_promedio_kpa: 150,
        tandeos_mes_promedio: 1,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 8.0,
        mano_obra_delta_12m: 7.0,
        materiales_delta_12m: 9.0,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Iztacalco',
    zona_id: CDMX_ZONE_IDS.iztacalco_centro,
    zona_name: 'Iztacalco Centro',
    lat: 19.3988,
    lng: -99.0972,
    poblacion: 52000,
    sources: {
      denue: {
        total: 290,
        tier_counts: { high: 20, standard: 140, basic: 130 },
        by_macro_category: {
          gastronomia: 72,
          retail: 110,
          salud: 22,
          educacion: 18,
          servicios_profesionales: 12,
          cultura_entretenimiento: 6,
          financiero: 8,
          fitness_wellness: 8,
          servicios_publicos: 4,
          automotriz: 20,
          manufacturas: 6,
          logistica: 4,
        },
      },
      fgj: {
        count_12m: 72,
        count_12m_prev: 78,
        by_categoria: { violentos: 14, patrimoniales: 42, no_violentos: 16 },
        hora_max_riesgo: '20:00-00:00',
      },
      gtfs: {
        estaciones_metro_1km: 1,
        paradas_metrobus_500m: 1,
        estaciones_tren_2km: 0,
        ecobici_400m: 0,
        densidad_rutas_brt: 0.2,
      },
      siged: {
        total_1km: 6,
        publicas: 5,
        privadas: 1,
        top_20_count: 0,
        nivel_primaria: 3,
        nivel_secundaria: 2,
        nivel_preparatoria: 1,
        enlace_percentil: 48,
      },
      dgis: {
        total_2km: 7,
        clues_1er_nivel: 5,
        clues_2do_nivel: 1,
        urgencias_24h: 1,
        distancia_hospital_2do_km: 2.2,
      },
      atlas: {
        zona_geotecnica: 'IIIc',
        amplificacion_onda: 'alta',
        licuacion_riesgo: 'alto',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 22,
        presion_promedio_kpa: 130,
        tandeos_mes_promedio: 2,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 9.0,
        mano_obra_delta_12m: 7.8,
        materiales_delta_12m: 10.0,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Iztapalapa',
    zona_id: CDMX_ZONE_IDS.iztapalapa_sur,
    zona_name: 'Iztapalapa Sur',
    lat: 19.3259,
    lng: -99.0462,
    poblacion: 120000,
    sources: {
      denue: {
        total: 220,
        tier_counts: { high: 10, standard: 80, basic: 130 },
        by_macro_category: {
          gastronomia: 55,
          retail: 95,
          salud: 12,
          educacion: 10,
          servicios_profesionales: 6,
          cultura_entretenimiento: 3,
          financiero: 5,
          fitness_wellness: 3,
          servicios_publicos: 4,
          automotriz: 18,
          manufacturas: 5,
          logistica: 4,
        },
      },
      fgj: {
        count_12m: 210,
        count_12m_prev: 190,
        by_categoria: { violentos: 58, patrimoniales: 112, no_violentos: 40 },
        hora_max_riesgo: '21:00-02:00',
      },
      gtfs: {
        estaciones_metro_1km: 1,
        paradas_metrobus_500m: 0,
        estaciones_tren_2km: 0,
        ecobici_400m: 0,
        densidad_rutas_brt: 0.1,
      },
      siged: {
        total_1km: 4,
        publicas: 4,
        privadas: 0,
        top_20_count: 0,
        nivel_primaria: 2,
        nivel_secundaria: 1,
        nivel_preparatoria: 1,
        enlace_percentil: 32,
      },
      dgis: {
        total_2km: 5,
        clues_1er_nivel: 4,
        clues_2do_nivel: 0,
        urgencias_24h: 0,
        distancia_hospital_2do_km: 4.5,
      },
      atlas: {
        zona_geotecnica: 'IIIc',
        amplificacion_onda: 'alta',
        licuacion_riesgo: 'alto',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 85,
        presion_promedio_kpa: 90,
        tandeos_mes_promedio: 4,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 11.0,
        mano_obra_delta_12m: 9.5,
        materiales_delta_12m: 12.5,
        level: 'critical',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'La Magdalena Contreras',
    zona_id: CDMX_ZONE_IDS.contreras_centro,
    zona_name: 'Contreras Centro',
    lat: 19.3334,
    lng: -99.2376,
    poblacion: 18000,
    sources: {
      denue: {
        total: 180,
        tier_counts: { high: 20, standard: 90, basic: 70 },
        by_macro_category: {
          gastronomia: 42,
          retail: 65,
          salud: 12,
          educacion: 10,
          servicios_profesionales: 12,
          cultura_entretenimiento: 4,
          financiero: 6,
          fitness_wellness: 4,
          servicios_publicos: 3,
          automotriz: 14,
          manufacturas: 5,
          logistica: 3,
        },
      },
      fgj: {
        count_12m: 24,
        count_12m_prev: 28,
        by_categoria: { violentos: 3, patrimoniales: 16, no_violentos: 5 },
        hora_max_riesgo: '20:00-22:00',
      },
      gtfs: {
        estaciones_metro_1km: 0,
        paradas_metrobus_500m: 0,
        estaciones_tren_2km: 0,
        ecobici_400m: 0,
        densidad_rutas_brt: 0,
      },
      siged: {
        total_1km: 4,
        publicas: 3,
        privadas: 1,
        top_20_count: 0,
        nivel_primaria: 2,
        nivel_secundaria: 1,
        nivel_preparatoria: 1,
        enlace_percentil: 52,
      },
      dgis: {
        total_2km: 4,
        clues_1er_nivel: 3,
        clues_2do_nivel: 1,
        urgencias_24h: 0,
        distancia_hospital_2do_km: 3.8,
      },
      atlas: {
        zona_geotecnica: 'I',
        amplificacion_onda: 'baja',
        licuacion_riesgo: 'bajo',
      },
      sacmex: {
        meses_datos: 10,
        dias_sin_agua_anual: 20,
        presion_promedio_kpa: 135,
        tandeos_mes_promedio: 2,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 8.0,
        mano_obra_delta_12m: 7.0,
        materiales_delta_12m: 9.0,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Miguel Hidalgo',
    zona_id: CDMX_ZONE_IDS.polanco,
    zona_name: 'Polanco',
    lat: 19.4336,
    lng: -99.1981,
    poblacion: 28000,
    sources: {
      denue: {
        total: 1480,
        tier_counts: { high: 640, standard: 580, basic: 260 },
        by_macro_category: {
          gastronomia: 320,
          retail: 340,
          salud: 110,
          educacion: 55,
          servicios_profesionales: 220,
          cultura_entretenimiento: 110,
          financiero: 85,
          fitness_wellness: 95,
          servicios_publicos: 12,
          automotriz: 55,
          manufacturas: 45,
          logistica: 33,
        },
      },
      fgj: {
        count_12m: 72,
        count_12m_prev: 68,
        by_categoria: { violentos: 10, patrimoniales: 52, no_violentos: 10 },
        hora_max_riesgo: '22:00-01:00',
      },
      gtfs: {
        estaciones_metro_1km: 3,
        paradas_metrobus_500m: 5,
        estaciones_tren_2km: 0,
        ecobici_400m: 12,
        densidad_rutas_brt: 2.0,
      },
      siged: {
        total_1km: 8,
        publicas: 1,
        privadas: 7,
        top_20_count: 4,
        nivel_primaria: 3,
        nivel_secundaria: 3,
        nivel_preparatoria: 2,
        enlace_percentil: 92,
      },
      dgis: {
        total_2km: 22,
        clues_1er_nivel: 11,
        clues_2do_nivel: 8,
        urgencias_24h: 3,
        distancia_hospital_2do_km: 0.4,
      },
      atlas: {
        zona_geotecnica: 'II',
        amplificacion_onda: 'media',
        licuacion_riesgo: 'bajo',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 2,
        presion_promedio_kpa: 210,
        tandeos_mes_promedio: 0,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 9.0,
        mano_obra_delta_12m: 8.0,
        materiales_delta_12m: 10.0,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Milpa Alta',
    zona_id: CDMX_ZONE_IDS.milpa_alta_centro,
    zona_name: 'Milpa Alta Centro',
    lat: 19.1928,
    lng: -99.0237,
    poblacion: 9500,
    sources: {
      denue: {
        total: 85,
        tier_counts: { high: 2, standard: 30, basic: 53 },
        by_macro_category: {
          gastronomia: 22,
          retail: 35,
          salud: 5,
          educacion: 4,
          servicios_profesionales: 3,
          cultura_entretenimiento: 1,
          financiero: 2,
          fitness_wellness: 1,
          servicios_publicos: 2,
          automotriz: 6,
          manufacturas: 3,
          logistica: 1,
        },
      },
      fgj: {
        count_12m: 18,
        count_12m_prev: 20,
        by_categoria: { violentos: 2, patrimoniales: 12, no_violentos: 4 },
        hora_max_riesgo: '19:00-22:00',
      },
      gtfs: {
        estaciones_metro_1km: 0,
        paradas_metrobus_500m: 0,
        estaciones_tren_2km: 0,
        ecobici_400m: 0,
        densidad_rutas_brt: 0,
      },
      siged: {
        total_1km: 3,
        publicas: 3,
        privadas: 0,
        top_20_count: 0,
        nivel_primaria: 1,
        nivel_secundaria: 1,
        nivel_preparatoria: 1,
        enlace_percentil: 42,
      },
      dgis: {
        total_2km: 2,
        clues_1er_nivel: 2,
        clues_2do_nivel: 0,
        urgencias_24h: 0,
        distancia_hospital_2do_km: 12.5,
      },
      atlas: {
        zona_geotecnica: 'I',
        amplificacion_onda: 'baja',
        licuacion_riesgo: 'bajo',
      },
      sacmex: {
        meses_datos: 10,
        dias_sin_agua_anual: 45,
        presion_promedio_kpa: 110,
        tandeos_mes_promedio: 3,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 9.0,
        mano_obra_delta_12m: 8.0,
        materiales_delta_12m: 10.0,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Tláhuac',
    zona_id: CDMX_ZONE_IDS.tlahuac_centro,
    zona_name: 'Tláhuac Centro',
    lat: 19.283,
    lng: -99.0001,
    poblacion: 42000,
    sources: {
      denue: {
        total: 210,
        tier_counts: { high: 15, standard: 95, basic: 100 },
        by_macro_category: {
          gastronomia: 55,
          retail: 78,
          salud: 14,
          educacion: 10,
          servicios_profesionales: 6,
          cultura_entretenimiento: 3,
          financiero: 4,
          fitness_wellness: 3,
          servicios_publicos: 3,
          automotriz: 18,
          manufacturas: 8,
          logistica: 4,
        },
      },
      fgj: {
        count_12m: 55,
        count_12m_prev: 62,
        by_categoria: { violentos: 10, patrimoniales: 32, no_violentos: 13 },
        hora_max_riesgo: '20:00-00:00',
      },
      gtfs: {
        estaciones_metro_1km: 1,
        paradas_metrobus_500m: 0,
        estaciones_tren_2km: 0,
        ecobici_400m: 0,
        densidad_rutas_brt: 0.1,
      },
      siged: {
        total_1km: 5,
        publicas: 4,
        privadas: 1,
        top_20_count: 0,
        nivel_primaria: 2,
        nivel_secundaria: 2,
        nivel_preparatoria: 1,
        enlace_percentil: 38,
      },
      dgis: {
        total_2km: 5,
        clues_1er_nivel: 4,
        clues_2do_nivel: 1,
        urgencias_24h: 0,
        distancia_hospital_2do_km: 2.8,
      },
      atlas: {
        zona_geotecnica: 'IIIc',
        amplificacion_onda: 'alta',
        licuacion_riesgo: 'alto',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 38,
        presion_promedio_kpa: 100,
        tandeos_mes_promedio: 3,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 9.0,
        mano_obra_delta_12m: 8.0,
        materiales_delta_12m: 10.0,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Tlalpan',
    zona_id: CDMX_ZONE_IDS.tlalpan_centro,
    zona_name: 'Tlalpan Centro',
    lat: 19.2929,
    lng: -99.167,
    poblacion: 38000,
    sources: {
      denue: {
        total: 310,
        tier_counts: { high: 70, standard: 160, basic: 80 },
        by_macro_category: {
          gastronomia: 80,
          retail: 100,
          salud: 25,
          educacion: 22,
          servicios_profesionales: 30,
          cultura_entretenimiento: 12,
          financiero: 12,
          fitness_wellness: 10,
          servicios_publicos: 4,
          automotriz: 10,
          manufacturas: 3,
          logistica: 2,
        },
      },
      fgj: {
        count_12m: 48,
        count_12m_prev: 52,
        by_categoria: { violentos: 7, patrimoniales: 30, no_violentos: 11 },
        hora_max_riesgo: '20:00-23:00',
      },
      gtfs: {
        estaciones_metro_1km: 0,
        paradas_metrobus_500m: 1,
        estaciones_tren_2km: 0,
        ecobici_400m: 0,
        densidad_rutas_brt: 0.3,
      },
      siged: {
        total_1km: 7,
        publicas: 3,
        privadas: 4,
        top_20_count: 1,
        nivel_primaria: 3,
        nivel_secundaria: 2,
        nivel_preparatoria: 2,
        enlace_percentil: 68,
      },
      dgis: {
        total_2km: 8,
        clues_1er_nivel: 5,
        clues_2do_nivel: 2,
        urgencias_24h: 1,
        distancia_hospital_2do_km: 1.6,
      },
      atlas: {
        zona_geotecnica: 'II',
        amplificacion_onda: 'media',
        licuacion_riesgo: 'bajo',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 10,
        presion_promedio_kpa: 170,
        tandeos_mes_promedio: 1,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 8.0,
        mano_obra_delta_12m: 7.0,
        materiales_delta_12m: 9.0,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Venustiano Carranza',
    zona_id: CDMX_ZONE_IDS.tepito,
    zona_name: 'Tepito',
    lat: 19.4447,
    lng: -99.1301,
    poblacion: 41000,
    sources: {
      denue: {
        total: 840,
        tier_counts: { high: 60, standard: 300, basic: 480 },
        by_macro_category: {
          gastronomia: 140,
          retail: 520,
          salud: 25,
          educacion: 15,
          servicios_profesionales: 18,
          cultura_entretenimiento: 20,
          financiero: 14,
          fitness_wellness: 8,
          servicios_publicos: 6,
          automotriz: 45,
          manufacturas: 18,
          logistica: 11,
        },
      },
      fgj: {
        count_12m: 380,
        count_12m_prev: 360,
        by_categoria: { violentos: 95, patrimoniales: 220, no_violentos: 65 },
        hora_max_riesgo: '22:00-04:00',
      },
      gtfs: {
        estaciones_metro_1km: 2,
        paradas_metrobus_500m: 3,
        estaciones_tren_2km: 0,
        ecobici_400m: 6,
        densidad_rutas_brt: 1.2,
      },
      siged: {
        total_1km: 6,
        publicas: 5,
        privadas: 1,
        top_20_count: 0,
        nivel_primaria: 3,
        nivel_secundaria: 2,
        nivel_preparatoria: 1,
        enlace_percentil: 28,
      },
      dgis: {
        total_2km: 8,
        clues_1er_nivel: 6,
        clues_2do_nivel: 2,
        urgencias_24h: 1,
        distancia_hospital_2do_km: 1.0,
      },
      atlas: {
        zona_geotecnica: 'IIIa',
        amplificacion_onda: 'alta',
        licuacion_riesgo: 'medio',
      },
      sacmex: {
        meses_datos: 12,
        dias_sin_agua_anual: 18,
        presion_promedio_kpa: 140,
        tandeos_mes_promedio: 2,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 9.0,
        mano_obra_delta_12m: 7.8,
        materiales_delta_12m: 10.0,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
  {
    alcaldia: 'Xochimilco',
    zona_id: CDMX_ZONE_IDS.xochimilco_centro,
    zona_name: 'Xochimilco Centro',
    lat: 19.2597,
    lng: -99.1033,
    poblacion: 32000,
    sources: {
      denue: {
        total: 240,
        tier_counts: { high: 35, standard: 110, basic: 95 },
        by_macro_category: {
          gastronomia: 70,
          retail: 85,
          salud: 14,
          educacion: 12,
          servicios_profesionales: 10,
          cultura_entretenimiento: 15,
          financiero: 5,
          fitness_wellness: 4,
          servicios_publicos: 3,
          automotriz: 14,
          manufacturas: 5,
          logistica: 3,
        },
      },
      fgj: {
        count_12m: 42,
        count_12m_prev: 45,
        by_categoria: { violentos: 6, patrimoniales: 26, no_violentos: 10 },
        hora_max_riesgo: '20:00-23:00',
      },
      gtfs: {
        estaciones_metro_1km: 0,
        paradas_metrobus_500m: 0,
        estaciones_tren_2km: 1,
        ecobici_400m: 0,
        densidad_rutas_brt: 0.2,
      },
      siged: {
        total_1km: 5,
        publicas: 3,
        privadas: 2,
        top_20_count: 0,
        nivel_primaria: 2,
        nivel_secundaria: 2,
        nivel_preparatoria: 1,
        enlace_percentil: 48,
      },
      dgis: {
        total_2km: 5,
        clues_1er_nivel: 4,
        clues_2do_nivel: 1,
        urgencias_24h: 0,
        distancia_hospital_2do_km: 3.2,
      },
      atlas: {
        zona_geotecnica: 'IIIc',
        amplificacion_onda: 'alta',
        licuacion_riesgo: 'alto',
      },
      sacmex: {
        meses_datos: 11,
        dias_sin_agua_anual: 35,
        presion_promedio_kpa: 115,
        tandeos_mes_promedio: 3,
      },
      inegi_inpp: {
        inpp_construccion_delta_12m: 8.0,
        mano_obra_delta_12m: 7.0,
        materiales_delta_12m: 9.0,
        level: 'normal',
      },
      rama: null,
      seduvi: null,
      catastro: null,
      locatel_0311: null,
    },
  },
];

export function getFixtureByName(name: string): CdmxZoneFixture | undefined {
  return CDMX_ZONES.find((z) => z.zona_name === name);
}

export function getFixtureByZoneId(zoneId: string): CdmxZoneFixture | undefined {
  return CDMX_ZONES.find((z) => z.zona_id === zoneId);
}

// ============================================================
// Extensiones sesión 2 BLOQUE 8.B parte 2/2 — sources adicionales
// Mantienen schema separado del CdmxZoneSources core para no romper tests
// sesión 1. Cada calculator consume su tabla por zona_name.
// ============================================================

// H04 Credit Demand — CNBV créditos hipotecarios + Infonavit demanda.
export interface CnbvData {
  readonly creditos_hipotecarios_12m: number;
  readonly hogares_municipio: number;
  readonly creditos_6m_anteriores: number;
  readonly creditos_6m_actual: number;
}

export const CDMX_CNBV: Readonly<Record<string, CnbvData>> = {
  'San Ángel': {
    creditos_hipotecarios_12m: 800,
    hogares_municipio: 14000,
    creditos_6m_anteriores: 380,
    creditos_6m_actual: 420,
  },
  Clavería: {
    creditos_hipotecarios_12m: 600,
    hogares_municipio: 18000,
    creditos_6m_anteriores: 290,
    creditos_6m_actual: 310,
  },
  'Del Valle': {
    creditos_hipotecarios_12m: 1400,
    hogares_municipio: 21000,
    creditos_6m_anteriores: 680,
    creditos_6m_actual: 720,
  },
  'Coyoacán Centro': {
    creditos_hipotecarios_12m: 650,
    hogares_municipio: 16000,
    creditos_6m_anteriores: 320,
    creditos_6m_actual: 330,
  },
  'Cuajimalpa Centro': {
    creditos_hipotecarios_12m: 180,
    hogares_municipio: 7300,
    creditos_6m_anteriores: 85,
    creditos_6m_actual: 95,
  },
  'Roma Norte': {
    creditos_hipotecarios_12m: 500,
    hogares_municipio: 11700,
    creditos_6m_anteriores: 230,
    creditos_6m_actual: 270,
  },
  Lindavista: {
    creditos_hipotecarios_12m: 700,
    hogares_municipio: 22700,
    creditos_6m_anteriores: 340,
    creditos_6m_actual: 360,
  },
  'Iztacalco Centro': {
    creditos_hipotecarios_12m: 300,
    hogares_municipio: 17300,
    creditos_6m_anteriores: 150,
    creditos_6m_actual: 150,
  },
  'Iztapalapa Sur': {
    creditos_hipotecarios_12m: 600,
    hogares_municipio: 40000,
    creditos_6m_anteriores: 310,
    creditos_6m_actual: 290,
  },
  'Contreras Centro': {
    creditos_hipotecarios_12m: 120,
    hogares_municipio: 6000,
    creditos_6m_anteriores: 58,
    creditos_6m_actual: 62,
  },
  Polanco: {
    creditos_hipotecarios_12m: 380,
    hogares_municipio: 9300,
    creditos_6m_anteriores: 190,
    creditos_6m_actual: 190,
  },
  'Milpa Alta Centro': {
    creditos_hipotecarios_12m: 40,
    hogares_municipio: 3200,
    creditos_6m_anteriores: 18,
    creditos_6m_actual: 22,
  },
  'Tláhuac Centro': {
    creditos_hipotecarios_12m: 200,
    hogares_municipio: 14000,
    creditos_6m_anteriores: 105,
    creditos_6m_actual: 95,
  },
  'Tlalpan Centro': {
    creditos_hipotecarios_12m: 420,
    hogares_municipio: 12700,
    creditos_6m_anteriores: 200,
    creditos_6m_actual: 220,
  },
  Tepito: {
    creditos_hipotecarios_12m: 100,
    hogares_municipio: 13700,
    creditos_6m_anteriores: 50,
    creditos_6m_actual: 50,
  },
  'Xochimilco Centro': {
    creditos_hipotecarios_12m: 180,
    hogares_municipio: 10700,
    creditos_6m_anteriores: 90,
    creditos_6m_actual: 90,
  },
};

// H08 Heritage Zone — INAH polígonos + monumentos + zonas arqueológicas.
export interface InahData {
  readonly dentro_centro_historico: boolean;
  readonly dentro_buffer_centro: boolean;
  readonly monumentos_500m: number;
  readonly zonas_arqueologicas_2km: number;
}

export const CDMX_INAH: Readonly<Record<string, InahData>> = {
  'San Ángel': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 6,
    zonas_arqueologicas_2km: 0,
  },
  Clavería: {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 1,
    zonas_arqueologicas_2km: 0,
  },
  'Del Valle': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 0,
    zonas_arqueologicas_2km: 0,
  },
  'Coyoacán Centro': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 8,
    zonas_arqueologicas_2km: 0,
  },
  'Cuajimalpa Centro': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 0,
    zonas_arqueologicas_2km: 0,
  },
  'Roma Norte': {
    dentro_centro_historico: false,
    dentro_buffer_centro: true,
    monumentos_500m: 4,
    zonas_arqueologicas_2km: 0,
  },
  Lindavista: {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 0,
    zonas_arqueologicas_2km: 0,
  },
  'Iztacalco Centro': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 2,
    zonas_arqueologicas_2km: 0,
  },
  'Iztapalapa Sur': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 1,
    zonas_arqueologicas_2km: 1,
  },
  'Contreras Centro': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 1,
    zonas_arqueologicas_2km: 0,
  },
  Polanco: {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 3,
    zonas_arqueologicas_2km: 0,
  },
  'Milpa Alta Centro': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 2,
    zonas_arqueologicas_2km: 1,
  },
  'Tláhuac Centro': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 1,
    zonas_arqueologicas_2km: 0,
  },
  'Tlalpan Centro': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 3,
    zonas_arqueologicas_2km: 1,
  },
  Tepito: {
    dentro_centro_historico: true,
    dentro_buffer_centro: true,
    monumentos_500m: 12,
    zonas_arqueologicas_2km: 1,
  },
  'Xochimilco Centro': {
    dentro_centro_historico: false,
    dentro_buffer_centro: false,
    monumentos_500m: 5,
    zonas_arqueologicas_2km: 2,
  },
};

// H10 Water Crisis — CONAGUA acuíferos + SACMEX cortes (extiende SacmexCounts).
export interface ConaguaData {
  readonly sobreexplotacion_acuifero_pct: number;
  readonly nivel_acuifero_delta_12m_m: number; // negativo = descenso (crisis)
}

export const CDMX_CONAGUA: Readonly<Record<string, ConaguaData>> = {
  'San Ángel': { sobreexplotacion_acuifero_pct: 8, nivel_acuifero_delta_12m_m: -0.4 },
  Clavería: { sobreexplotacion_acuifero_pct: 12, nivel_acuifero_delta_12m_m: -0.6 },
  'Del Valle': { sobreexplotacion_acuifero_pct: 5, nivel_acuifero_delta_12m_m: -0.2 },
  'Coyoacán Centro': { sobreexplotacion_acuifero_pct: 6, nivel_acuifero_delta_12m_m: -0.3 },
  'Cuajimalpa Centro': { sobreexplotacion_acuifero_pct: 15, nivel_acuifero_delta_12m_m: -0.8 },
  'Roma Norte': { sobreexplotacion_acuifero_pct: 10, nivel_acuifero_delta_12m_m: -0.5 },
  Lindavista: { sobreexplotacion_acuifero_pct: 14, nivel_acuifero_delta_12m_m: -0.7 },
  'Iztacalco Centro': { sobreexplotacion_acuifero_pct: 18, nivel_acuifero_delta_12m_m: -0.9 },
  'Iztapalapa Sur': { sobreexplotacion_acuifero_pct: 35, nivel_acuifero_delta_12m_m: -2.8 },
  'Contreras Centro': { sobreexplotacion_acuifero_pct: 4, nivel_acuifero_delta_12m_m: -0.1 },
  Polanco: { sobreexplotacion_acuifero_pct: 3, nivel_acuifero_delta_12m_m: -0.1 },
  'Milpa Alta Centro': { sobreexplotacion_acuifero_pct: 22, nivel_acuifero_delta_12m_m: -1.4 },
  'Tláhuac Centro': { sobreexplotacion_acuifero_pct: 28, nivel_acuifero_delta_12m_m: -2.1 },
  'Tlalpan Centro': { sobreexplotacion_acuifero_pct: 8, nivel_acuifero_delta_12m_m: -0.3 },
  Tepito: { sobreexplotacion_acuifero_pct: 16, nivel_acuifero_delta_12m_m: -0.8 },
  'Xochimilco Centro': { sobreexplotacion_acuifero_pct: 30, nivel_acuifero_delta_12m_m: -2.5 },
};

// A04 Arbitrage + A01 Affordability — mercado primario vs secundario.
export interface MarketData {
  readonly precio_m2_primaria_mxn: number;
  readonly precio_m2_secundaria_mxn: number;
  readonly ingreso_mediano_mensual_mxn: number;
}

export const CDMX_MARKET: Readonly<Record<string, MarketData>> = {
  'San Ángel': {
    precio_m2_primaria_mxn: 58000,
    precio_m2_secundaria_mxn: 50000,
    ingreso_mediano_mensual_mxn: 42000,
  },
  Clavería: {
    precio_m2_primaria_mxn: 32000,
    precio_m2_secundaria_mxn: 28000,
    ingreso_mediano_mensual_mxn: 18000,
  },
  'Del Valle': {
    precio_m2_primaria_mxn: 62000,
    precio_m2_secundaria_mxn: 55000,
    ingreso_mediano_mensual_mxn: 45000,
  },
  'Coyoacán Centro': {
    precio_m2_primaria_mxn: 54000,
    precio_m2_secundaria_mxn: 48000,
    ingreso_mediano_mensual_mxn: 35000,
  },
  'Cuajimalpa Centro': {
    precio_m2_primaria_mxn: 48000,
    precio_m2_secundaria_mxn: 38000,
    ingreso_mediano_mensual_mxn: 28000,
  },
  'Roma Norte': {
    precio_m2_primaria_mxn: 78000,
    precio_m2_secundaria_mxn: 60000,
    ingreso_mediano_mensual_mxn: 40000,
  },
  Lindavista: {
    precio_m2_primaria_mxn: 36000,
    precio_m2_secundaria_mxn: 32000,
    ingreso_mediano_mensual_mxn: 22000,
  },
  'Iztacalco Centro': {
    precio_m2_primaria_mxn: 28000,
    precio_m2_secundaria_mxn: 25000,
    ingreso_mediano_mensual_mxn: 15000,
  },
  'Iztapalapa Sur': {
    precio_m2_primaria_mxn: 22000,
    precio_m2_secundaria_mxn: 20000,
    ingreso_mediano_mensual_mxn: 12000,
  },
  'Contreras Centro': {
    precio_m2_primaria_mxn: 35000,
    precio_m2_secundaria_mxn: 30000,
    ingreso_mediano_mensual_mxn: 20000,
  },
  Polanco: {
    precio_m2_primaria_mxn: 95000,
    precio_m2_secundaria_mxn: 85000,
    ingreso_mediano_mensual_mxn: 80000,
  },
  'Milpa Alta Centro': {
    precio_m2_primaria_mxn: 18000,
    precio_m2_secundaria_mxn: 16000,
    ingreso_mediano_mensual_mxn: 10000,
  },
  'Tláhuac Centro': {
    precio_m2_primaria_mxn: 20000,
    precio_m2_secundaria_mxn: 18000,
    ingreso_mediano_mensual_mxn: 12000,
  },
  'Tlalpan Centro': {
    precio_m2_primaria_mxn: 38000,
    precio_m2_secundaria_mxn: 34000,
    ingreso_mediano_mensual_mxn: 24000,
  },
  Tepito: {
    precio_m2_primaria_mxn: 30000,
    precio_m2_secundaria_mxn: 27000,
    ingreso_mediano_mensual_mxn: 12000,
  },
  'Xochimilco Centro': {
    precio_m2_primaria_mxn: 26000,
    precio_m2_secundaria_mxn: 22000,
    ingreso_mediano_mensual_mxn: 14000,
  },
};

// A03 Migration — % búsquedas foraneas hacia zona.
export interface SearchDemographicData {
  readonly pct_busquedas_foraneas: number; // % de búsquedas que vienen de otras alcaldías/estados
  readonly top_origen_estado: string;
}

export const CDMX_SEARCH: Readonly<Record<string, SearchDemographicData>> = {
  'San Ángel': { pct_busquedas_foraneas: 38, top_origen_estado: 'MX Edo' },
  Clavería: { pct_busquedas_foraneas: 22, top_origen_estado: 'MX Edo' },
  'Del Valle': { pct_busquedas_foraneas: 45, top_origen_estado: 'Jalisco' },
  'Coyoacán Centro': { pct_busquedas_foraneas: 42, top_origen_estado: 'Nuevo León' },
  'Cuajimalpa Centro': { pct_busquedas_foraneas: 30, top_origen_estado: 'MX Edo' },
  'Roma Norte': { pct_busquedas_foraneas: 65, top_origen_estado: 'US/CA (remote)' },
  Lindavista: { pct_busquedas_foraneas: 18, top_origen_estado: 'MX Edo' },
  'Iztacalco Centro': { pct_busquedas_foraneas: 12, top_origen_estado: 'MX Edo' },
  'Iztapalapa Sur': { pct_busquedas_foraneas: 8, top_origen_estado: 'MX Edo' },
  'Contreras Centro': { pct_busquedas_foraneas: 20, top_origen_estado: 'MX Edo' },
  Polanco: { pct_busquedas_foraneas: 58, top_origen_estado: 'Nuevo León' },
  'Milpa Alta Centro': { pct_busquedas_foraneas: 5, top_origen_estado: 'MX Edo' },
  'Tláhuac Centro': { pct_busquedas_foraneas: 10, top_origen_estado: 'MX Edo' },
  'Tlalpan Centro': { pct_busquedas_foraneas: 32, top_origen_estado: 'MX Edo' },
  Tepito: { pct_busquedas_foraneas: 15, top_origen_estado: 'MX Edo' },
  'Xochimilco Centro': { pct_busquedas_foraneas: 25, top_origen_estado: 'MX Edo' },
};

// ============================================================
// Extensiones BLOQUE 8.C — fixtures N01-N11 (IP propietaria DMX).
// ============================================================

// N03 Gentrification Velocity — snapshot previo DENUE (≥3 meses atrás).
// Mismo shape que CdmxZoneSources.denue. Habilita Δ(ratio_PB)/Δ(meses).
export interface DenueSnapshotEntry {
  readonly snapshot_date: string; // ISO YYYY-MM-DD
  readonly total: number;
  readonly tier_counts: {
    readonly high: number;
    readonly standard: number;
    readonly basic: number;
  };
  readonly by_macro_category: Readonly<Record<string, number>>;
}

// 2 snapshots por zona: T-6m y T-0 (actual). El de T-0 espeja CDMX_ZONES.denue.
// Ratio_PB = high/basic. Gentrificación rápida = Δratio creciente.
export const CDMX_DENUE_SNAPSHOTS: Readonly<Record<string, readonly DenueSnapshotEntry[]>> = {
  'San Ángel': [
    {
      snapshot_date: '2025-10-15',
      total: 580,
      tier_counts: { high: 160, standard: 300, basic: 120 },
      by_macro_category: { gastronomia: 120, retail: 150 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 620,
      tier_counts: { high: 185, standard: 320, basic: 115 },
      by_macro_category: { gastronomia: 135, retail: 155 },
    },
  ],
  Clavería: [
    {
      snapshot_date: '2025-10-15',
      total: 410,
      tier_counts: { high: 55, standard: 215, basic: 140 },
      by_macro_category: { gastronomia: 90 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 420,
      tier_counts: { high: 60, standard: 220, basic: 140 },
      by_macro_category: { gastronomia: 95 },
    },
  ],
  'Del Valle': [
    {
      snapshot_date: '2025-10-15',
      total: 780,
      tier_counts: { high: 220, standard: 410, basic: 150 },
      by_macro_category: { gastronomia: 170 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 820,
      tier_counts: { high: 240, standard: 420, basic: 160 },
      by_macro_category: { gastronomia: 185 },
    },
  ],
  'Coyoacán Centro': [
    {
      snapshot_date: '2025-10-15',
      total: 500,
      tier_counts: { high: 130, standard: 270, basic: 100 },
      by_macro_category: { gastronomia: 135 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 520,
      tier_counts: { high: 140, standard: 280, basic: 100 },
      by_macro_category: { gastronomia: 145 },
    },
  ],
  'Cuajimalpa Centro': [
    {
      snapshot_date: '2025-10-15',
      total: 250,
      tier_counts: { high: 38, standard: 125, basic: 87 },
      by_macro_category: { gastronomia: 52 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 260,
      tier_counts: { high: 40, standard: 130, basic: 90 },
      by_macro_category: { gastronomia: 55 },
    },
  ],
  // Roma Norte — gentrificación rápida: Δratio PB notable.
  'Roma Norte': [
    {
      snapshot_date: '2025-10-15',
      total: 1050,
      tier_counts: { high: 380, standard: 460, basic: 210 },
      by_macro_category: { gastronomia: 290, retail: 245, cafeterias: 18 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 1240,
      tier_counts: { high: 480, standard: 540, basic: 220 },
      by_macro_category: { gastronomia: 340, retail: 285, cafeterias: 30 },
    },
  ],
  Lindavista: [
    {
      snapshot_date: '2025-10-15',
      total: 370,
      tier_counts: { high: 50, standard: 195, basic: 125 },
      by_macro_category: { gastronomia: 80 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 380,
      tier_counts: { high: 55, standard: 200, basic: 125 },
      by_macro_category: { gastronomia: 85 },
    },
  ],
  'Iztacalco Centro': [
    {
      snapshot_date: '2025-10-15',
      total: 285,
      tier_counts: { high: 18, standard: 140, basic: 127 },
      by_macro_category: { gastronomia: 70 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 290,
      tier_counts: { high: 20, standard: 140, basic: 130 },
      by_macro_category: { gastronomia: 72 },
    },
  ],
  'Iztapalapa Sur': [
    {
      snapshot_date: '2025-10-15',
      total: 215,
      tier_counts: { high: 9, standard: 80, basic: 126 },
      by_macro_category: { gastronomia: 52 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 220,
      tier_counts: { high: 10, standard: 80, basic: 130 },
      by_macro_category: { gastronomia: 55 },
    },
  ],
  'Contreras Centro': [
    {
      snapshot_date: '2025-10-15',
      total: 175,
      tier_counts: { high: 18, standard: 88, basic: 69 },
      by_macro_category: { gastronomia: 40 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 180,
      tier_counts: { high: 20, standard: 90, basic: 70 },
      by_macro_category: { gastronomia: 42 },
    },
  ],
  Polanco: [
    {
      snapshot_date: '2025-10-15',
      total: 1440,
      tier_counts: { high: 620, standard: 570, basic: 250 },
      by_macro_category: { gastronomia: 310, retail: 330 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 1480,
      tier_counts: { high: 640, standard: 580, basic: 260 },
      by_macro_category: { gastronomia: 320, retail: 340 },
    },
  ],
  'Milpa Alta Centro': [
    {
      snapshot_date: '2025-10-15',
      total: 80,
      tier_counts: { high: 1, standard: 28, basic: 51 },
      by_macro_category: { gastronomia: 20 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 85,
      tier_counts: { high: 2, standard: 30, basic: 53 },
      by_macro_category: { gastronomia: 22 },
    },
  ],
  'Tláhuac Centro': [
    {
      snapshot_date: '2025-10-15',
      total: 205,
      tier_counts: { high: 14, standard: 93, basic: 98 },
      by_macro_category: { gastronomia: 53 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 210,
      tier_counts: { high: 15, standard: 95, basic: 100 },
      by_macro_category: { gastronomia: 55 },
    },
  ],
  'Tlalpan Centro': [
    {
      snapshot_date: '2025-10-15',
      total: 300,
      tier_counts: { high: 65, standard: 155, basic: 80 },
      by_macro_category: { gastronomia: 75 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 310,
      tier_counts: { high: 70, standard: 160, basic: 80 },
      by_macro_category: { gastronomia: 80 },
    },
  ],
  Tepito: [
    {
      snapshot_date: '2025-10-15',
      total: 830,
      tier_counts: { high: 58, standard: 295, basic: 477 },
      by_macro_category: { gastronomia: 135 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 840,
      tier_counts: { high: 60, standard: 300, basic: 480 },
      by_macro_category: { gastronomia: 140 },
    },
  ],
  'Xochimilco Centro': [
    {
      snapshot_date: '2025-10-15',
      total: 235,
      tier_counts: { high: 33, standard: 108, basic: 94 },
      by_macro_category: { gastronomia: 68 },
    },
    {
      snapshot_date: '2026-04-15',
      total: 240,
      tier_counts: { high: 35, standard: 110, basic: 95 },
      by_macro_category: { gastronomia: 70 },
    },
  ],
};

// N04 Crime Trajectory — FGJ ventana 12m partida en 6m actual + 6m previo.
// Penaliza aumento violentos, premia drops patrimoniales.
export interface FgjTrajectoryData {
  readonly count_6m_actual: number;
  readonly count_6m_prev: number;
  readonly violentos_6m_actual: number;
  readonly violentos_6m_prev: number;
  readonly patrimoniales_6m_actual: number;
  readonly patrimoniales_6m_prev: number;
}

export const CDMX_FGJ_TRAJECTORY: Readonly<Record<string, FgjTrajectoryData>> = {
  'San Ángel': {
    count_6m_actual: 20,
    count_6m_prev: 22,
    violentos_6m_actual: 3,
    violentos_6m_prev: 3,
    patrimoniales_6m_actual: 13,
    patrimoniales_6m_prev: 15,
  },
  Clavería: {
    count_6m_actual: 28,
    count_6m_prev: 30,
    violentos_6m_actual: 5,
    violentos_6m_prev: 5,
    patrimoniales_6m_actual: 17,
    patrimoniales_6m_prev: 18,
  },
  'Del Valle': {
    count_6m_actual: 18,
    count_6m_prev: 20,
    violentos_6m_actual: 2,
    violentos_6m_prev: 3,
    patrimoniales_6m_actual: 11,
    patrimoniales_6m_prev: 13,
  },
  'Coyoacán Centro': {
    count_6m_actual: 25,
    count_6m_prev: 27,
    violentos_6m_actual: 4,
    violentos_6m_prev: 4,
    patrimoniales_6m_actual: 15,
    patrimoniales_6m_prev: 17,
  },
  'Cuajimalpa Centro': {
    count_6m_actual: 16,
    count_6m_prev: 18,
    violentos_6m_actual: 3,
    violentos_6m_prev: 3,
    patrimoniales_6m_actual: 10,
    patrimoniales_6m_prev: 10,
  },
  // Condesa/Roma Norte — drop robo transeúnte -15%+ patrimoniales notable.
  'Roma Norte': {
    count_6m_actual: 70,
    count_6m_prev: 75,
    violentos_6m_actual: 11,
    violentos_6m_prev: 13,
    patrimoniales_6m_actual: 44,
    patrimoniales_6m_prev: 51,
  },
  Lindavista: {
    count_6m_actual: 42,
    count_6m_prev: 46,
    violentos_6m_actual: 7,
    violentos_6m_prev: 7,
    patrimoniales_6m_actual: 28,
    patrimoniales_6m_prev: 30,
  },
  'Iztacalco Centro': {
    count_6m_actual: 35,
    count_6m_prev: 37,
    violentos_6m_actual: 7,
    violentos_6m_prev: 7,
    patrimoniales_6m_actual: 20,
    patrimoniales_6m_prev: 22,
  },
  // Iztapalapa — trajectory empeorando (violentos +18%).
  'Iztapalapa Sur': {
    count_6m_actual: 110,
    count_6m_prev: 100,
    violentos_6m_actual: 32,
    violentos_6m_prev: 26,
    patrimoniales_6m_actual: 58,
    patrimoniales_6m_prev: 54,
  },
  'Contreras Centro': {
    count_6m_actual: 11,
    count_6m_prev: 13,
    violentos_6m_actual: 1,
    violentos_6m_prev: 2,
    patrimoniales_6m_actual: 8,
    patrimoniales_6m_prev: 8,
  },
  Polanco: {
    count_6m_actual: 35,
    count_6m_prev: 37,
    violentos_6m_actual: 5,
    violentos_6m_prev: 5,
    patrimoniales_6m_actual: 25,
    patrimoniales_6m_prev: 27,
  },
  'Milpa Alta Centro': {
    count_6m_actual: 9,
    count_6m_prev: 9,
    violentos_6m_actual: 1,
    violentos_6m_prev: 1,
    patrimoniales_6m_actual: 6,
    patrimoniales_6m_prev: 6,
  },
  'Tláhuac Centro': {
    count_6m_actual: 26,
    count_6m_prev: 29,
    violentos_6m_actual: 5,
    violentos_6m_prev: 5,
    patrimoniales_6m_actual: 15,
    patrimoniales_6m_prev: 17,
  },
  'Tlalpan Centro': {
    count_6m_actual: 22,
    count_6m_prev: 26,
    violentos_6m_actual: 3,
    violentos_6m_prev: 4,
    patrimoniales_6m_actual: 14,
    patrimoniales_6m_prev: 16,
  },
  Tepito: {
    count_6m_actual: 195,
    count_6m_prev: 185,
    violentos_6m_actual: 50,
    violentos_6m_prev: 45,
    patrimoniales_6m_actual: 110,
    patrimoniales_6m_prev: 110,
  },
  'Xochimilco Centro': {
    count_6m_actual: 20,
    count_6m_prev: 22,
    violentos_6m_actual: 3,
    violentos_6m_prev: 3,
    patrimoniales_6m_actual: 13,
    patrimoniales_6m_prev: 13,
  },
};

// N06 School Premium — premio pagado por m² por proximidad top 20% escuelas.
// Baseline: CDMX_MARKET.precio_m2_secundaria_mxn (mercado secundario zona).
// Premium proxy = proyectos_cerca_top_school_m2 − baseline m². Para H1 mock —
// cuando FASE 07 market_prices_secondary live, se deriva estadísticamente.
export interface SchoolPremiumData {
  readonly baseline_m2_mxn: number;
  readonly premium_near_top_m2_mxn: number; // m² pagado por viviendas <500m de top 20% school
  readonly premium_pct: number; // precomputed (premium/baseline − 1) × 100
}

export const CDMX_SCHOOL_PREMIUM: Readonly<Record<string, SchoolPremiumData>> = {
  'San Ángel': { baseline_m2_mxn: 50000, premium_near_top_m2_mxn: 58000, premium_pct: 16 },
  Clavería: { baseline_m2_mxn: 28000, premium_near_top_m2_mxn: 29500, premium_pct: 5 },
  'Del Valle': { baseline_m2_mxn: 55000, premium_near_top_m2_mxn: 66000, premium_pct: 20 },
  'Coyoacán Centro': { baseline_m2_mxn: 48000, premium_near_top_m2_mxn: 52800, premium_pct: 10 },
  'Cuajimalpa Centro': { baseline_m2_mxn: 38000, premium_near_top_m2_mxn: 38380, premium_pct: 1 },
  'Roma Norte': { baseline_m2_mxn: 60000, premium_near_top_m2_mxn: 67200, premium_pct: 12 },
  Lindavista: { baseline_m2_mxn: 32000, premium_near_top_m2_mxn: 32320, premium_pct: 1 },
  'Iztacalco Centro': { baseline_m2_mxn: 25000, premium_near_top_m2_mxn: 25000, premium_pct: 0 },
  'Iztapalapa Sur': { baseline_m2_mxn: 20000, premium_near_top_m2_mxn: 20000, premium_pct: 0 },
  'Contreras Centro': { baseline_m2_mxn: 30000, premium_near_top_m2_mxn: 30000, premium_pct: 0 },
  Polanco: { baseline_m2_mxn: 85000, premium_near_top_m2_mxn: 105000, premium_pct: 24 },
  'Milpa Alta Centro': { baseline_m2_mxn: 16000, premium_near_top_m2_mxn: 16000, premium_pct: 0 },
  'Tláhuac Centro': { baseline_m2_mxn: 18000, premium_near_top_m2_mxn: 18000, premium_pct: 0 },
  'Tlalpan Centro': { baseline_m2_mxn: 34000, premium_near_top_m2_mxn: 36040, premium_pct: 6 },
  Tepito: { baseline_m2_mxn: 27000, premium_near_top_m2_mxn: 27000, premium_pct: 0 },
  'Xochimilco Centro': {
    baseline_m2_mxn: 22000,
    premium_near_top_m2_mxn: 22000,
    premium_pct: 0,
  },
};

// N11 DMX Momentum Index — deltas de F08/A12/N01/N03 + search_trends + precio 12m.
// Inputs precalculados mock H1. FASE 27 llega con Google Trends real.
export interface MomentumInputs {
  readonly f08_delta_12m: number; // delta LQI últimos 12m (puntos absolutos 0-100)
  readonly a12_delta_12m: number; // delta Price Fairness últimos 12m
  readonly n01_delta_12m: number; // delta Shannon diversity últimos 12m
  readonly n03_velocity: number; // gentrificación velocity (0-100 normalizado)
  readonly search_trends_delta_3m: number; // % Δ búsquedas 3m (stub Google Trends FASE 27)
  readonly price_m2_delta_12m_pct: number; // % Δ precio mediano m² 12m
  readonly proyectos_zona: number; // # proyectos — tier 3 gate (≥50)
  readonly meses_data_disponible: number; // tier 3 gate (≥6 meses)
}

// Narvarte caso target ≥80 (gentrificación rápida + precio +8% + cafeterías).
// Cuajimalpa ≈medio. Iztapalapa Sur en desaceleración/bajo.
// Polanco consolidado (alto pero estable, no explosivo → ≤75).
export const CDMX_MOMENTUM_INPUTS: Readonly<Record<string, MomentumInputs>> = {
  'San Ángel': {
    f08_delta_12m: 2.1,
    a12_delta_12m: 1.5,
    n01_delta_12m: 0.04,
    n03_velocity: 8,
    search_trends_delta_3m: 5,
    price_m2_delta_12m_pct: 6,
    proyectos_zona: 52,
    meses_data_disponible: 12,
  },
  Clavería: {
    f08_delta_12m: 0.5,
    a12_delta_12m: -0.2,
    n01_delta_12m: 0.01,
    n03_velocity: 3,
    search_trends_delta_3m: 1,
    price_m2_delta_12m_pct: 3,
    proyectos_zona: 18,
    meses_data_disponible: 9,
  },
  'Del Valle': {
    f08_delta_12m: 2.8,
    a12_delta_12m: 1.2,
    n01_delta_12m: 0.03,
    n03_velocity: 6,
    search_trends_delta_3m: 4,
    price_m2_delta_12m_pct: 5,
    proyectos_zona: 85,
    meses_data_disponible: 18,
  },
  'Coyoacán Centro': {
    f08_delta_12m: 1.5,
    a12_delta_12m: 0.5,
    n01_delta_12m: 0.02,
    n03_velocity: 5,
    search_trends_delta_3m: 2,
    price_m2_delta_12m_pct: 4,
    proyectos_zona: 55,
    meses_data_disponible: 14,
  },
  'Cuajimalpa Centro': {
    f08_delta_12m: 0.8,
    a12_delta_12m: 0.2,
    n01_delta_12m: 0.01,
    n03_velocity: 3,
    search_trends_delta_3m: 1,
    price_m2_delta_12m_pct: 3,
    proyectos_zona: 52,
    meses_data_disponible: 8,
  },
  // Narvarte proxy: Roma Norte como zona killer momentum ≥80.
  'Roma Norte': {
    f08_delta_12m: 4.5,
    a12_delta_12m: 3.0,
    n01_delta_12m: 0.08,
    n03_velocity: 18,
    search_trends_delta_3m: 12,
    price_m2_delta_12m_pct: 9,
    proyectos_zona: 120,
    meses_data_disponible: 24,
  },
  Lindavista: {
    f08_delta_12m: 0.3,
    a12_delta_12m: 0,
    n01_delta_12m: 0.01,
    n03_velocity: 2,
    search_trends_delta_3m: 0,
    price_m2_delta_12m_pct: 2,
    proyectos_zona: 35,
    meses_data_disponible: 12,
  },
  'Iztacalco Centro': {
    f08_delta_12m: -0.2,
    a12_delta_12m: -0.3,
    n01_delta_12m: 0,
    n03_velocity: 1,
    search_trends_delta_3m: -1,
    price_m2_delta_12m_pct: 1,
    proyectos_zona: 15,
    meses_data_disponible: 6,
  },
  // Iztapalapa Sur → tier 3 gated (proyectos < 50).
  'Iztapalapa Sur': {
    f08_delta_12m: -1.0,
    a12_delta_12m: -1.5,
    n01_delta_12m: -0.02,
    n03_velocity: 0,
    search_trends_delta_3m: -3,
    price_m2_delta_12m_pct: 0,
    proyectos_zona: 8,
    meses_data_disponible: 4,
  },
  'Contreras Centro': {
    f08_delta_12m: 0.2,
    a12_delta_12m: 0,
    n01_delta_12m: 0,
    n03_velocity: 2,
    search_trends_delta_3m: 0,
    price_m2_delta_12m_pct: 2,
    proyectos_zona: 12,
    meses_data_disponible: 10,
  },
  // Polanco consolidado ≈75-80 (mercado caliente pero estable).
  Polanco: {
    f08_delta_12m: 3.0,
    a12_delta_12m: 2.0,
    n01_delta_12m: 0.05,
    n03_velocity: 8,
    search_trends_delta_3m: 7,
    price_m2_delta_12m_pct: 6,
    proyectos_zona: 95,
    meses_data_disponible: 36,
  },
  'Milpa Alta Centro': {
    f08_delta_12m: 0,
    a12_delta_12m: 0,
    n01_delta_12m: 0,
    n03_velocity: 1,
    search_trends_delta_3m: 0,
    price_m2_delta_12m_pct: 1,
    proyectos_zona: 3,
    meses_data_disponible: 3,
  },
  'Tláhuac Centro': {
    f08_delta_12m: -0.3,
    a12_delta_12m: -0.2,
    n01_delta_12m: 0,
    n03_velocity: 1,
    search_trends_delta_3m: -1,
    price_m2_delta_12m_pct: 1,
    proyectos_zona: 14,
    meses_data_disponible: 7,
  },
  'Tlalpan Centro': {
    f08_delta_12m: 1.2,
    a12_delta_12m: 0.8,
    n01_delta_12m: 0.02,
    n03_velocity: 4,
    search_trends_delta_3m: 2,
    price_m2_delta_12m_pct: 3,
    proyectos_zona: 48,
    meses_data_disponible: 11,
  },
  Tepito: {
    f08_delta_12m: 0.1,
    a12_delta_12m: -0.5,
    n01_delta_12m: 0,
    n03_velocity: 1,
    search_trends_delta_3m: 0,
    price_m2_delta_12m_pct: 2,
    proyectos_zona: 22,
    meses_data_disponible: 8,
  },
  'Xochimilco Centro': {
    f08_delta_12m: 0.5,
    a12_delta_12m: 0.2,
    n01_delta_12m: 0.01,
    n03_velocity: 2,
    search_trends_delta_3m: 1,
    price_m2_delta_12m_pct: 2,
    proyectos_zona: 20,
    meses_data_disponible: 10,
  },
};

// D07 STR vs LTR — AirROI ADR + occupancy + revpar.
export interface AirroiData {
  readonly adr_usd: number;
  readonly occupancy_pct: number;
  readonly revpar_usd: number;
  readonly listings_count: number;
}

export const CDMX_AIRROI: Readonly<Record<string, AirroiData>> = {
  'San Ángel': { adr_usd: 120, occupancy_pct: 62, revpar_usd: 74, listings_count: 320 },
  Clavería: { adr_usd: 55, occupancy_pct: 48, revpar_usd: 26, listings_count: 85 },
  'Del Valle': { adr_usd: 95, occupancy_pct: 65, revpar_usd: 62, listings_count: 420 },
  'Coyoacán Centro': { adr_usd: 110, occupancy_pct: 68, revpar_usd: 75, listings_count: 380 },
  'Cuajimalpa Centro': { adr_usd: 140, occupancy_pct: 55, revpar_usd: 77, listings_count: 95 },
  'Roma Norte': { adr_usd: 185, occupancy_pct: 78, revpar_usd: 144, listings_count: 1250 },
  Lindavista: { adr_usd: 50, occupancy_pct: 40, revpar_usd: 20, listings_count: 110 },
  'Iztacalco Centro': { adr_usd: 45, occupancy_pct: 38, revpar_usd: 17, listings_count: 60 },
  'Iztapalapa Sur': { adr_usd: 35, occupancy_pct: 32, revpar_usd: 11, listings_count: 45 },
  'Contreras Centro': { adr_usd: 65, occupancy_pct: 42, revpar_usd: 27, listings_count: 35 },
  Polanco: { adr_usd: 220, occupancy_pct: 72, revpar_usd: 158, listings_count: 580 },
  'Milpa Alta Centro': { adr_usd: 40, occupancy_pct: 28, revpar_usd: 11, listings_count: 12 },
  'Tláhuac Centro': { adr_usd: 40, occupancy_pct: 35, revpar_usd: 14, listings_count: 22 },
  'Tlalpan Centro': { adr_usd: 72, occupancy_pct: 52, revpar_usd: 37, listings_count: 160 },
  Tepito: { adr_usd: 48, occupancy_pct: 52, revpar_usd: 25, listings_count: 85 },
  'Xochimilco Centro': { adr_usd: 85, occupancy_pct: 58, revpar_usd: 49, listings_count: 120 },
};
