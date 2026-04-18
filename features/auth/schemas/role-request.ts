import { z } from 'zod';

export const requestableRoleEnum = z.enum([
  'asesor',
  'admin_desarrolladora',
  'broker_manager',
  'mb_admin',
  'mb_coordinator',
  'vendedor_publico',
]);

export const roleRequestSubmitSchema = z.object({
  requested_role: requestableRoleEnum,
  reason: z.string().trim().max(500).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type RoleRequestSubmitInput = z.infer<typeof roleRequestSubmitSchema>;

export const roleRequestIdSchema = z.object({ request_id: z.string().uuid() });
export const roleRequestRejectSchema = roleRequestIdSchema.extend({
  reason: z.string().trim().max(500).optional(),
});
