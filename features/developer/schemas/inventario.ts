import { z } from 'zod';

export const UNIDAD_STATUS = [
  'disponible',
  'apartada',
  'vendida',
  'reservada',
  'bloqueada',
] as const;
export const unidadStatusEnum = z.enum(UNIDAD_STATUS);
export type UnidadStatus = z.infer<typeof unidadStatusEnum>;

export const UNIDAD_TIPO = [
  'departamento',
  'casa',
  'townhouse',
  'loft',
  'penthouse',
  'estudio',
] as const;
export const unidadTipoEnum = z.enum(UNIDAD_TIPO);
export type UnidadTipo = z.infer<typeof unidadTipoEnum>;

export const VIEW_MODE = ['grid', 'table', 'timeline'] as const;
export const viewModeEnum = z.enum(VIEW_MODE);
export type ViewMode = z.infer<typeof viewModeEnum>;

export const inventarioListUnidadesInput = z.object({
  proyectoId: z.string().uuid().optional(),
  status: unidadStatusEnum.optional(),
  tipo: unidadTipoEnum.optional(),
  prototipoId: z.string().uuid().optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().positive().optional(),
  m2Min: z.number().nonnegative().optional(),
  m2Max: z.number().positive().optional(),
  recamaras: z.number().int().nonnegative().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export type InventarioListUnidadesInput = z.infer<typeof inventarioListUnidadesInput>;

export const inventarioUnidadRow = z.object({
  id: z.string().uuid(),
  proyecto_id: z.string().uuid(),
  proyecto_nombre: z.string().nullable(),
  numero: z.string(),
  tipo: unidadTipoEnum,
  status: unidadStatusEnum,
  recamaras: z.number().int().nullable(),
  banos: z.number().nullable(),
  parking: z.number().int().nullable(),
  area_m2: z.number().nullable(),
  price_mxn: z.number().nullable(),
  floor: z.number().int().nullable(),
  photos: z.array(z.string()),
  demand_score_30d: z.number().int().min(0).max(100),
  demand_color: z.enum(['red', 'amber', 'green']).nullable(),
  updated_at: z.string(),
  created_at: z.string(),
});
export type InventarioUnidadRow = z.infer<typeof inventarioUnidadRow>;

export const inventarioMetricsInput = z.object({
  proyectoId: z.string().uuid().optional(),
});
export type InventarioMetricsInput = z.infer<typeof inventarioMetricsInput>;

export const inventarioMetricsResult = z.object({
  total: z.number().int(),
  disponible: z.number().int(),
  apartada: z.number().int(),
  vendida: z.number().int(),
  otra: z.number().int(),
  absorption_30d_pct: z.number().nullable(),
  precio_promedio_m2_mxn: z.number().nullable(),
  days_on_market_p50: z.number().nullable(),
});
export type InventarioMetricsResult = z.infer<typeof inventarioMetricsResult>;

export const inventarioListProyectosInput = z.object({}).optional().default({});
export type InventarioListProyectosInput = z.infer<typeof inventarioListProyectosInput>;

export const inventarioUpdateUnidadInput = z.object({
  unidadId: z.string().uuid(),
  patch: z
    .object({
      numero: z.string().min(1).max(50).optional(),
      tipo: unidadTipoEnum.optional(),
      status: unidadStatusEnum.optional(),
      recamaras: z.number().int().nonnegative().optional(),
      banos: z.number().nonnegative().optional(),
      parking: z.number().int().nonnegative().optional(),
      area_m2: z.number().positive().optional(),
      price_mxn: z.number().positive().optional(),
      floor: z.number().int().optional(),
      maintenance_fee_mxn: z.number().nonnegative().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: 'patch_required' }),
  motivoPriceChange: z.string().max(500).optional(),
});
export type InventarioUpdateUnidadInput = z.infer<typeof inventarioUpdateUnidadInput>;

export const inventarioUnidadDetailInput = z.object({
  unidadId: z.string().uuid(),
});
export type InventarioUnidadDetailInput = z.infer<typeof inventarioUnidadDetailInput>;

export const inventarioPriceHistoryInput = z.object({
  unidadId: z.string().uuid(),
  limit: z.number().int().min(1).max(200).default(50),
});
export type InventarioPriceHistoryInput = z.infer<typeof inventarioPriceHistoryInput>;

export const inventarioChangeLogInput = z.object({
  unidadId: z.string().uuid(),
  limit: z.number().int().min(1).max(200).default(50),
});
export type InventarioChangeLogInput = z.infer<typeof inventarioChangeLogInput>;

export const inventarioReservasInput = z.object({
  unidadId: z.string().uuid(),
});
export type InventarioReservasInput = z.infer<typeof inventarioReservasInput>;

export const inventarioLeadsByUnidadInput = z.object({
  unidadId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type InventarioLeadsByUnidadInput = z.infer<typeof inventarioLeadsByUnidadInput>;

export const prototipoSchema = z.object({
  id: z.string().uuid(),
  proyecto_id: z.string().uuid(),
  nombre: z.string().min(1).max(120),
  description: z.string().nullable(),
  recamaras: z.number().int().nonnegative(),
  banos: z.number().nonnegative(),
  m2_base: z.number().positive(),
  precio_base_mxn: z.number().positive(),
  amenidades: z.record(z.string(), z.unknown()),
  fotos_urls: z.array(z.string()),
  planos_url: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Prototipo = z.infer<typeof prototipoSchema>;

export const prototipoListInput = z.object({
  proyectoId: z.string().uuid(),
  activeOnly: z.boolean().default(true),
});
export type PrototipoListInput = z.infer<typeof prototipoListInput>;

export const prototipoCreateInput = z.object({
  proyectoId: z.string().uuid(),
  nombre: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  recamaras: z.number().int().nonnegative(),
  banos: z.number().nonnegative(),
  m2Base: z.number().positive(),
  precioBaseMxn: z.number().positive(),
  amenidades: z.record(z.string(), z.unknown()).optional(),
  planosUrl: z.string().url().optional(),
});
export type PrototipoCreateInput = z.infer<typeof prototipoCreateInput>;

export const prototipoUpdateInput = z.object({
  prototipoId: z.string().uuid(),
  patch: z
    .object({
      nombre: z.string().min(1).max(120).optional(),
      description: z.string().max(2000).optional(),
      recamaras: z.number().int().nonnegative().optional(),
      banos: z.number().nonnegative().optional(),
      m2Base: z.number().positive().optional(),
      precioBaseMxn: z.number().positive().optional(),
      amenidades: z.record(z.string(), z.unknown()).optional(),
      planosUrl: z.string().url().optional(),
      active: z.boolean().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: 'patch_required' }),
});
export type PrototipoUpdateInput = z.infer<typeof prototipoUpdateInput>;

export const prototipoDeleteInput = z.object({
  prototipoId: z.string().uuid(),
});
export type PrototipoDeleteInput = z.infer<typeof prototipoDeleteInput>;

export const esquemaPagoSchema = z.object({
  id: z.string().uuid(),
  proyecto_id: z.string().uuid(),
  nombre: z.string().min(1).max(120),
  enganche_pct: z.number().min(0).max(100),
  mensualidades_count: z.number().int().nonnegative(),
  meses_gracia: z.number().int().nonnegative(),
  contra_entrega_pct: z.number().min(0).max(100),
  comision_pct: z.number().min(0).max(100),
  iva_calc_logic: z.string(),
  financing_partner: z.string().nullable(),
  notes: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EsquemaPago = z.infer<typeof esquemaPagoSchema>;

export const esquemaPagoListInput = z.object({
  proyectoId: z.string().uuid(),
  activeOnly: z.boolean().default(true),
});
export type EsquemaPagoListInput = z.infer<typeof esquemaPagoListInput>;

export const esquemaPagoCreateInput = z.object({
  proyectoId: z.string().uuid(),
  nombre: z.string().min(1).max(120),
  engancheePct: z.number().min(0).max(100),
  mensualidadesCount: z.number().int().nonnegative(),
  mesesGracia: z.number().int().nonnegative().default(0),
  contraEntregaPct: z.number().min(0).max(100),
  comisionPct: z.number().min(0).max(100),
  ivaCalcLogic: z.enum(['exento', 'incluido', 'agregado']).default('agregado'),
  financingPartner: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
});
export type EsquemaPagoCreateInput = z.infer<typeof esquemaPagoCreateInput>;

export const esquemaPagoUpdateInput = z.object({
  esquemaId: z.string().uuid(),
  patch: z
    .object({
      nombre: z.string().min(1).max(120).optional(),
      engancheePct: z.number().min(0).max(100).optional(),
      mensualidadesCount: z.number().int().nonnegative().optional(),
      mesesGracia: z.number().int().nonnegative().optional(),
      contraEntregaPct: z.number().min(0).max(100).optional(),
      comisionPct: z.number().min(0).max(100).optional(),
      ivaCalcLogic: z.enum(['exento', 'incluido', 'agregado']).optional(),
      financingPartner: z.string().max(120).optional(),
      notes: z.string().max(2000).optional(),
      active: z.boolean().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: 'patch_required' }),
});
export type EsquemaPagoUpdateInput = z.infer<typeof esquemaPagoUpdateInput>;

export const esquemaPagoDeleteInput = z.object({
  esquemaId: z.string().uuid(),
});
export type EsquemaPagoDeleteInput = z.infer<typeof esquemaPagoDeleteInput>;

export const avanceObraSchema = z.object({
  id: z.string().uuid(),
  proyecto_id: z.string().uuid(),
  fecha: z.string(),
  etapa: z.string(),
  porcentaje: z.number().min(0).max(100),
  fotos_urls: z.array(z.string()),
  drone_photo_url: z.string().nullable(),
  geo_location: z.record(z.string(), z.unknown()).nullable(),
  notes: z.string().nullable(),
  autor_id: z.string().uuid().nullable(),
  created_at: z.string(),
});
export type AvanceObra = z.infer<typeof avanceObraSchema>;

export const avanceObraListInput = z.object({
  proyectoId: z.string().uuid(),
  limit: z.number().int().min(1).max(200).default(60),
});
export type AvanceObraListInput = z.infer<typeof avanceObraListInput>;

export const avanceObraCreateInput = z.object({
  proyectoId: z.string().uuid(),
  fecha: z.string().date(),
  etapa: z.enum([
    'cimentacion',
    'estructura',
    'albanileria',
    'instalaciones',
    'acabados',
    'entrega',
  ]),
  porcentaje: z.number().min(0).max(100),
  fotosUrls: z.array(z.string()).default([]),
  dronePhotoUrl: z.string().url().optional(),
  geoLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  notes: z.string().max(2000).optional(),
});
export type AvanceObraCreateInput = z.infer<typeof avanceObraCreateInput>;

export const avanceObraDeleteInput = z.object({
  avanceId: z.string().uuid(),
});
export type AvanceObraDeleteInput = z.infer<typeof avanceObraDeleteInput>;

export const inventarioReorderPhotosInput = z.object({
  unidadId: z.string().uuid(),
  photos: z.array(z.string()).min(0).max(50),
});
export type InventarioReorderPhotosInput = z.infer<typeof inventarioReorderPhotosInput>;

export const inventarioRemovePhotoInput = z.object({
  unidadId: z.string().uuid(),
  photoUrl: z.string(),
});
export type InventarioRemovePhotoInput = z.infer<typeof inventarioRemovePhotoInput>;

export const inventarioAddPhotoInput = z.object({
  unidadId: z.string().uuid(),
  photoUrl: z.string().url(),
});
export type InventarioAddPhotoInput = z.infer<typeof inventarioAddPhotoInput>;
