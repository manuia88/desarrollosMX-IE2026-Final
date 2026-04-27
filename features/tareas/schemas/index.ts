import { z } from 'zod';

export const tareaTypeEnum = z.enum(['property', 'capture', 'search', 'client', 'lead', 'general']);
export type TareaType = z.infer<typeof tareaTypeEnum>;

export const tareaPriorityEnum = z.enum(['alta', 'media', 'baja']);
export type TareaPriority = z.infer<typeof tareaPriorityEnum>;

export const tareaStatusEnum = z.enum(['pending', 'expired', 'done']);
export type TareaStatus = z.infer<typeof tareaStatusEnum>;

export const tareaDetalleTipoEnum = z.enum([
  'contactar_propietario',
  'organizar_visita',
  'organizar_captacion',
  'pedir_devolucion_visita',
  'custom',
]);
export type TareaDetalleTipo = z.infer<typeof tareaDetalleTipoEnum>;

export const tareaScopeEnum = z.enum(['today', 'week', 'month', 'all']);
export type TareaScope = z.infer<typeof tareaScopeEnum>;

const createTareaBase = z.object({
  type: tareaTypeEnum,
  entityId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  detalleTipo: tareaDetalleTipoEnum,
  description: z.string().max(2000).optional(),
  dueAt: z.string().datetime(),
  priority: tareaPriorityEnum.default('media'),
  redirectTo: z.string().max(500).optional(),
});

export const createTareaInput = createTareaBase.refine(
  (data) =>
    data.type === 'general' || (typeof data.entityId === 'string' && data.entityId.length > 0),
  { message: 'entityId requerido excepto para tareas generales', path: ['entityId'] },
);
export type CreateTareaInput = z.infer<typeof createTareaInput>;

export const updateTareaInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200).optional(),
  detalleTipo: tareaDetalleTipoEnum.optional(),
  description: z.string().max(2000).nullish(),
  dueAt: z.string().datetime().optional(),
  priority: tareaPriorityEnum.optional(),
  redirectTo: z.string().max(500).nullish(),
});
export type UpdateTareaInput = z.infer<typeof updateTareaInput>;

export const listTareasInput = z.object({
  scope: tareaScopeEnum.default('today'),
  teamView: z.boolean().default(false),
  limit: z.number().int().min(1).max(200).default(120),
});
export type ListTareasInput = z.infer<typeof listTareasInput>;

export const completeTareaInput = z.object({
  id: z.string().uuid(),
});
export type CompleteTareaInput = z.infer<typeof completeTareaInput>;

export const reassignTareaInput = z.object({
  id: z.string().uuid(),
  newAsesorId: z.string().uuid(),
});
export type ReassignTareaInput = z.infer<typeof reassignTareaInput>;

export const deleteTareaInput = z.object({
  id: z.string().uuid(),
});
export type DeleteTareaInput = z.infer<typeof deleteTareaInput>;

export const COLUMN_MAP = {
  propiedades: ['property', 'capture'] as const,
  clientes: ['search', 'client'] as const,
  prospectos: ['lead'] as const,
} as const;
export type TareaColumn = keyof typeof COLUMN_MAP;

export function columnForType(type: TareaType): TareaColumn | 'general' {
  if (type === 'general') return 'general';
  if ((COLUMN_MAP.propiedades as readonly TareaType[]).includes(type)) return 'propiedades';
  if ((COLUMN_MAP.clientes as readonly TareaType[]).includes(type)) return 'clientes';
  if ((COLUMN_MAP.prospectos as readonly TareaType[]).includes(type)) return 'prospectos';
  return 'general';
}
