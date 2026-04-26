import { z } from 'zod';
import { projectBrokerRoleSchema, uuidSchema } from './shared';

export const projectBrokerSchema = z.object({
  id: uuidSchema,
  proyecto_id: uuidSchema,
  broker_user_id: uuidSchema,
  role: projectBrokerRoleSchema,
  commission_pct: z.number().nullable(),
  meses_exclusividad: z.number().int().nullable(),
  meses_contrato: z.number().int().nullable(),
  assigned_at: z.string(),
  expires_at: z.string().nullable(),
  active: z.boolean(),
  meta: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProjectBroker = z.infer<typeof projectBrokerSchema>;

export const projectBrokerListByProyectoInput = z.object({
  proyecto_id: uuidSchema,
});
export type ProjectBrokerListByProyectoInput = z.infer<typeof projectBrokerListByProyectoInput>;
