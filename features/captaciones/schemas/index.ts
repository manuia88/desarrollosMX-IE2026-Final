import { z } from 'zod';

export const captacionStatusEnum = z.enum([
  'prospecto',
  'presentacion',
  'firmado',
  'en_promocion',
  'vendido',
  'cerrado_no_listado',
]);
export type CaptacionStatus = z.infer<typeof captacionStatusEnum>;

export const captacionOperacionEnum = z.enum(['venta', 'renta']);
export type CaptacionOperacion = z.infer<typeof captacionOperacionEnum>;

export const captacionCurrencyEnum = z.enum(['MXN', 'USD', 'COP', 'ARS', 'BRL', 'CLP', 'PEN']);
export type CaptacionCurrency = z.infer<typeof captacionCurrencyEnum>;

export const captacionCloseMotivoEnum = z.enum([
  'vendida',
  'propietario_decidio_no_vender',
  'precio_no_competitivo',
  'otro',
]);
export type CaptacionCloseMotivo = z.infer<typeof captacionCloseMotivoEnum>;

export const featuresSchema = z
  .object({
    recamaras: z.number().int().min(0).max(20).optional(),
    banos: z.number().min(0).max(20).optional(),
    area_m2: z.number().nonnegative().optional(),
    amenidades: z.array(z.string().max(40)).max(40).optional(),
  })
  .partial()
  .default({});
export type CaptacionFeatures = z.infer<typeof featuresSchema>;

export const captacionListInput = z.object({
  status: captacionStatusEnum.optional(),
  countryCode: z.string().length(2).optional(),
  asesorId: z.string().uuid().optional(),
  q: z.string().max(80).optional(),
  limit: z.number().int().min(1).max(200).default(120),
});

export const captacionGetInput = z.object({
  id: z.string().uuid(),
});

export const captacionCreateInput = z.object({
  propietarioNombre: z.string().min(2).max(120),
  propietarioTelefono: z.string().max(40).optional(),
  propietarioEmail: z.string().email().max(120).optional(),
  direccion: z.string().min(5).max(200),
  tipoOperacion: captacionOperacionEnum,
  precioSolicitado: z.number().positive(),
  currency: captacionCurrencyEnum.default('MXN'),
  countryCode: z.string().length(2),
  zoneId: z.string().uuid().optional(),
  ciudad: z.string().max(80).optional(),
  colonia: z.string().max(80).optional(),
  features: featuresSchema.optional(),
  notes: z.string().max(4000).optional(),
  leadId: z.string().uuid().optional(),
});

export const captacionUpdateInput = z.object({
  id: z.string().uuid(),
  propietarioNombre: z.string().min(2).max(120).optional(),
  propietarioTelefono: z.string().max(40).nullable().optional(),
  propietarioEmail: z.string().email().max(120).nullable().optional(),
  direccion: z.string().min(5).max(200).optional(),
  tipoOperacion: captacionOperacionEnum.optional(),
  precioSolicitado: z.number().positive().optional(),
  currency: captacionCurrencyEnum.optional(),
  zoneId: z.string().uuid().nullable().optional(),
  ciudad: z.string().max(80).nullable().optional(),
  colonia: z.string().max(80).nullable().optional(),
  features: featuresSchema.optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export const captacionAdvanceStageInput = z.object({
  id: z.string().uuid(),
  toStatus: captacionStatusEnum,
});

export const captacionCloseInput = z.object({
  id: z.string().uuid(),
  motivo: captacionCloseMotivoEnum,
  notes: z.string().max(500).optional(),
  confirmText: z.literal('CERRAR'),
  closedAsListed: z.boolean().default(true),
});

export const captacionPauseInput = z.object({
  id: z.string().uuid(),
});

export const captacionRunAcmInput = z.object({
  id: z.string().uuid(),
});

/**
 * FSM whitelist transitions matrix.
 * Forward path: prospecto → presentacion → firmado → en_promocion.
 * Cierre: en_promocion / firmado / presentacion / prospecto → vendido | cerrado_no_listado.
 * Pause: cualquier no terminal → prospecto (NO from vendido / cerrado_no_listado).
 */
export const FSM_TRANSITIONS: Readonly<Record<CaptacionStatus, readonly CaptacionStatus[]>> = {
  prospecto: ['presentacion', 'cerrado_no_listado', 'vendido'],
  presentacion: ['firmado', 'prospecto', 'cerrado_no_listado', 'vendido'],
  firmado: ['en_promocion', 'cerrado_no_listado', 'vendido'],
  en_promocion: ['vendido', 'cerrado_no_listado'],
  vendido: [],
  cerrado_no_listado: [],
} as const;

export function isValidTransition(from: CaptacionStatus, to: CaptacionStatus): boolean {
  return FSM_TRANSITIONS[from].includes(to);
}

export type CaptacionListInput = z.infer<typeof captacionListInput>;
export type CaptacionCreateInput = z.infer<typeof captacionCreateInput>;
export type CaptacionUpdateInput = z.infer<typeof captacionUpdateInput>;
export type CaptacionAdvanceStageInput = z.infer<typeof captacionAdvanceStageInput>;
export type CaptacionCloseInput = z.infer<typeof captacionCloseInput>;
