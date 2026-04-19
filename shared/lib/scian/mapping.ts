// Mapeo SCIAN propietario DMX (IP — seed del Knowledge Graph B2B GC-18).
// 3 tiers (high/standard/basic) + 12 macro categorías con weights por tier.
// Códigos basados en SCIAN México 2018 (INEGI). Puede extenderse via PR
// con review founder/PM — los weights son la decisión de producto.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.F.1
//       docs/biblia-v5/06_IE_PART1_Vision_Arquitectura_Fuentes_SCIAN.md

export type ScianTier = 'high' | 'standard' | 'basic';

// Tiers indicativos. Match por prefijo: si scian_code arranca con cualquiera
// de estos prefijos, asignar el tier. Match más específico (mayor longitud)
// gana sobre genérico.
export const SCIAN_TIER_PREFIXES: Record<ScianTier, readonly string[]> = {
  high: [
    '7225', // Restaurantes y cafeterías especializadas
    '7224', // Bares y cantinas (gastronomía premium)
    '4533', // Tiendas de antigüedades, arte, libros raros
    '7113', // Promotores espectáculos (galerías, teatros)
    '7139', // Gimnasios, spas, wellness premium
    '4521', // Tiendas departamentales de lujo
    '5418', // Publicidad / marketing creativo
    '4541', // Comercio electrónico premium
    '7212', // Hostales boutique
  ],
  standard: [
    '7221', // Restaurantes con servicio completo (familiar)
    '4611', // Tiendas de abarrotes
    '4612', // Carnicerías
    '4622', // Tiendas conveniencia
    '4661', // Farmacias
    '6211', // Médicos consulta privada
    '6111', // Educación primaria/secundaria
    '5221', // Banca múltiple sucursales
    '4411', // Concesionarios autos nuevos
    '5223', // Casas de cambio
  ],
  basic: [
    '7222', // Servicios preparación alimentos básicos (fondas, taquerías)
    '8121', // Tintorerías, lavanderías
    '4521', // Misceláneas, tianguis
    '4621', // Frutas y verduras al mayoreo
    '4523', // Tiendas de segunda mano
    '8111', // Talleres mecánicos
    '8112', // Reparación electrónica
    '4411', // Refaccionarias
  ],
} as const;

export interface ScianMacroCategory {
  prefixes: readonly string[];
  weights: { high: number; standard: number; basic: number };
}

// 12 macro categorías per plan §7.F.1.1. Weights por tier reflejan la
// "calidad de comercio" para scoring de zona residencial.
export const SCIAN_MACRO_CATEGORIES: Record<string, ScianMacroCategory> = {
  gastronomia: {
    prefixes: ['7224', '7225', '7222'],
    weights: { high: 3, standard: 2, basic: 1 },
  },
  retail: {
    prefixes: ['461', '462', '463', '464', '465', '466'],
    weights: { high: 2, standard: 2, basic: 1 },
  },
  salud: {
    prefixes: ['621', '622'],
    weights: { high: 2.5, standard: 2, basic: 1 },
  },
  educacion: {
    prefixes: ['611'],
    weights: { high: 2, standard: 1.5, basic: 1 },
  },
  servicios_profesionales: {
    prefixes: ['541'],
    weights: { high: 2, standard: 1, basic: 0.5 },
  },
  cultura_entretenimiento: {
    prefixes: ['711', '712'],
    weights: { high: 3, standard: 2, basic: 1 },
  },
  financiero: {
    prefixes: ['522', '523', '524'],
    weights: { high: 2, standard: 1.5, basic: 1 },
  },
  fitness_wellness: {
    prefixes: ['7139', '8121'],
    weights: { high: 2.5, standard: 1.5, basic: 0.5 },
  },
  servicios_publicos: {
    prefixes: ['221'],
    weights: { high: 1, standard: 1, basic: 1 },
  },
  automotriz: {
    prefixes: ['441', '811'],
    weights: { high: 0.5, standard: 1, basic: 1 },
  },
  manufacturas: {
    prefixes: ['311', '312', '313', '314', '315', '316', '321', '331', '332', '333'],
    weights: { high: 0.5, standard: 0.5, basic: 0.5 },
  },
  logistica: {
    prefixes: ['484', '492', '493'],
    weights: { high: 0.5, standard: 0.5, basic: 0.5 },
  },
} as const;

export type ScianMacroCategoryKey = keyof typeof SCIAN_MACRO_CATEGORIES;

export const SCIAN_MACRO_CATEGORY_KEYS = Object.keys(
  SCIAN_MACRO_CATEGORIES,
) as readonly ScianMacroCategoryKey[];

function matchByPrefixes(code: string, prefixes: readonly string[]): string | null {
  let best: string | null = null;
  for (const p of prefixes) {
    if (code.startsWith(p) && (best === null || p.length > best.length)) {
      best = p;
    }
  }
  return best;
}

export function tierForScian(code: string | null | undefined): ScianTier | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!/^\d{4,7}$/.test(trimmed)) return null;
  let bestTier: ScianTier | null = null;
  let bestLen = 0;
  for (const tier of ['high', 'standard', 'basic'] as const) {
    const prefix = matchByPrefixes(trimmed, SCIAN_TIER_PREFIXES[tier]);
    if (prefix !== null && prefix.length > bestLen) {
      bestTier = tier;
      bestLen = prefix.length;
    }
  }
  return bestTier;
}

export function macroCategoryForScian(
  code: string | null | undefined,
): ScianMacroCategoryKey | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!/^\d{3,7}$/.test(trimmed)) return null;
  let bestKey: ScianMacroCategoryKey | null = null;
  let bestLen = 0;
  for (const key of SCIAN_MACRO_CATEGORY_KEYS) {
    const category = SCIAN_MACRO_CATEGORIES[key];
    if (!category) continue;
    const prefix = matchByPrefixes(trimmed, category.prefixes);
    if (prefix !== null && prefix.length > bestLen) {
      bestKey = key;
      bestLen = prefix.length;
    }
  }
  return bestKey;
}
