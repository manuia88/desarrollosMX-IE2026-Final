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
