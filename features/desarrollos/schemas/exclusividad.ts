import { z } from 'zod';
import { exclusividadScopeSchema, uuidSchema } from './shared';

export const exclusividadAcuerdoSchema = z.object({
  id: uuidSchema,
  proyecto_id: uuidSchema,
  brokerage_id: uuidSchema.nullable(),
  asesor_id: uuidSchema.nullable(),
  meses_exclusividad: z.number().int().nonnegative(),
  meses_contrato: z.number().int().nonnegative(),
  comision_pct: z.number().nonnegative(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  scope: exclusividadScopeSchema,
  signed_url: z.string().nullable(),
  active: z.boolean(),
  meta: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ExclusividadAcuerdo = z.infer<typeof exclusividadAcuerdoSchema>;

export const exclusividadListByProyectoInput = z.object({
  proyecto_id: uuidSchema,
});
export type ExclusividadListByProyectoInput = z.infer<typeof exclusividadListByProyectoInput>;
