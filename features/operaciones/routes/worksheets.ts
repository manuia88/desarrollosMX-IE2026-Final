import { createHash } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { computeWorksheetPriority } from '@/features/operaciones/lib/worksheets-priority';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

const ADMIN_ROLES: ReadonlySet<string> = new Set(['superadmin', 'mb_admin']);
const DEV_ROLES: ReadonlySet<string> = new Set(['admin_desarrolladora', 'superadmin', 'mb_admin']);

const WORKSHEET_STATUS = ['pending', 'approved', 'rejected', 'expired', 'cancelled'] as const;
const worksheetStatusEnum = z.enum(WORKSHEET_STATUS);
type WorksheetStatus = z.infer<typeof worksheetStatusEnum>;

export const requestWorksheetInput = z.object({
  unitId: z.string().uuid(),
  clientFirstName: z.string().trim().min(1).max(80),
  clientPhone: z.string().trim().min(6).max(40).optional(),
  clientEmail: z.string().trim().email().max(160).optional(),
  notes: z.string().trim().max(800).optional(),
});

export const approveWorksheetInput = z.object({
  worksheetId: z.string().uuid(),
});

export const rejectWorksheetInput = z.object({
  worksheetId: z.string().uuid(),
  reason: z.string().trim().max(400).optional(),
});

export const cancelWorksheetInput = z.object({
  worksheetId: z.string().uuid(),
});

export const listMyWorksheetsInput = z.object({
  status: worksheetStatusEnum.optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

type WorksheetRow = {
  id: string;
  unit_id: string;
  asesor_id: string;
  desarrolladora_id: string;
  status: WorksheetStatus;
  expires_at: string;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  reject_reason: string | null;
  client_first_name: string;
  notes: string | null;
  operacion_id: string | null;
};

const WORKSHEET_FIELDS =
  'id, unit_id, asesor_id, desarrolladora_id, status, expires_at, requested_at, decided_at, decided_by, reject_reason, client_first_name, notes, operacion_id';

function hashContact(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function isAdmin(profile: { rol?: string | null } | null | undefined): boolean {
  return Boolean(profile?.rol && ADMIN_ROLES.has(profile.rol));
}

function isDeveloperRole(profile: { rol?: string | null } | null | undefined): boolean {
  return Boolean(profile?.rol && DEV_ROLES.has(profile.rol));
}

// STUB ADR-018 — wiring forward FASE 16 cuando notifications table ship.
// Por ahora solo Sentry breadcrumb para observabilidad y trazabilidad cross-portal.
function emitWorksheetEvent(
  event:
    | 'worksheet.requested'
    | 'worksheet.approved'
    | 'worksheet.rejected'
    | 'worksheet.cancelled',
  payload: { worksheetId: string; asesorId: string; desarrolladoraId: string },
): void {
  sentry.captureException(new Error(`worksheet_event:${event}`), {
    tags: {
      event,
      worksheet_id: payload.worksheetId,
      asesor_id: payload.asesorId,
      desarrolladora_id: payload.desarrolladoraId,
    },
  });
}

export const worksheetsRouter = router({
  requestWorksheet: authenticatedProcedure
    .input(requestWorksheetInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();

      const { data: unit, error: unitError } = await supabase
        .from('unidades')
        .select('id, status, proyecto_id')
        .eq('id', input.unitId)
        .maybeSingle();
      if (unitError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: unitError.message });
      }
      if (!unit) throw new TRPCError({ code: 'NOT_FOUND', message: 'unidad no encontrada' });
      if (unit.status !== 'disponible') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'unidad no disponible para reserva',
        });
      }

      const { data: project, error: projectError } = await supabase
        .from('proyectos')
        .select('id, desarrolladora_id')
        .eq('id', unit.proyecto_id)
        .maybeSingle();
      if (projectError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: projectError.message });
      }
      if (!project?.desarrolladora_id) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'proyecto sin desarrolladora_id',
        });
      }

      const insertPayload = {
        unit_id: input.unitId,
        asesor_id: ctx.user.id,
        desarrolladora_id: project.desarrolladora_id,
        client_first_name: input.clientFirstName,
        client_phone_hash: input.clientPhone ? hashContact(input.clientPhone) : null,
        client_email_hash: input.clientEmail ? hashContact(input.clientEmail) : null,
        notes: input.notes ?? null,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('unit_worksheets')
        .insert(insertPayload as never)
        .select(WORKSHEET_FIELDS)
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `unit_worksheets insert failed: ${error?.message ?? 'unknown'}`,
        });
      }

      const row = data as WorksheetRow;
      emitWorksheetEvent('worksheet.requested', {
        worksheetId: row.id,
        asesorId: row.asesor_id,
        desarrolladoraId: row.desarrolladora_id,
      });
      return row;
    }),

  approveWorksheet: authenticatedProcedure
    .input(approveWorksheetInput)
    .mutation(async ({ ctx, input }) => {
      if (!isDeveloperRole(ctx.profile)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'rol no autorizado' });
      }
      const supabase = createAdminClient();

      const { data: existing, error: existingError } = await supabase
        .from('unit_worksheets')
        .select(WORKSHEET_FIELDS)
        .eq('id', input.worksheetId)
        .maybeSingle();
      if (existingError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: existingError.message,
        });
      }
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const existingRow = existing as WorksheetRow;
      if (
        !isAdmin(ctx.profile) &&
        existingRow.desarrolladora_id !== ctx.profile?.desarrolladora_id
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      if (existingRow.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `worksheet status ${existingRow.status} no es pending`,
        });
      }

      const { data, error } = await supabase
        .from('unit_worksheets')
        .update({
          status: 'approved',
          decided_at: new Date().toISOString(),
          decided_by: ctx.user.id,
        } as never)
        .eq('id', input.worksheetId)
        .select(WORKSHEET_FIELDS)
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `unit_worksheets approve failed: ${error?.message ?? 'unknown'}`,
        });
      }

      const row = data as WorksheetRow;
      emitWorksheetEvent('worksheet.approved', {
        worksheetId: row.id,
        asesorId: row.asesor_id,
        desarrolladoraId: row.desarrolladora_id,
      });
      return row;
    }),

  rejectWorksheet: authenticatedProcedure
    .input(rejectWorksheetInput)
    .mutation(async ({ ctx, input }) => {
      if (!isDeveloperRole(ctx.profile)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'rol no autorizado' });
      }
      const supabase = createAdminClient();

      const { data: existing, error: existingError } = await supabase
        .from('unit_worksheets')
        .select(WORKSHEET_FIELDS)
        .eq('id', input.worksheetId)
        .maybeSingle();
      if (existingError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: existingError.message,
        });
      }
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const existingRow = existing as WorksheetRow;
      if (
        !isAdmin(ctx.profile) &&
        existingRow.desarrolladora_id !== ctx.profile?.desarrolladora_id
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      if (existingRow.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `worksheet status ${existingRow.status} no es pending`,
        });
      }

      const { data, error } = await supabase
        .from('unit_worksheets')
        .update({
          status: 'rejected',
          reject_reason: input.reason ?? null,
          decided_at: new Date().toISOString(),
          decided_by: ctx.user.id,
        } as never)
        .eq('id', input.worksheetId)
        .select(WORKSHEET_FIELDS)
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `unit_worksheets reject failed: ${error?.message ?? 'unknown'}`,
        });
      }

      const row = data as WorksheetRow;
      emitWorksheetEvent('worksheet.rejected', {
        worksheetId: row.id,
        asesorId: row.asesor_id,
        desarrolladoraId: row.desarrolladora_id,
      });
      return row;
    }),

  cancelWorksheet: authenticatedProcedure
    .input(cancelWorksheetInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: existing, error: existingError } = await supabase
        .from('unit_worksheets')
        .select(WORKSHEET_FIELDS)
        .eq('id', input.worksheetId)
        .maybeSingle();
      if (existingError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: existingError.message,
        });
      }
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const existingRow = existing as WorksheetRow;
      if (existingRow.asesor_id !== ctx.user.id && !isAdmin(ctx.profile)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      if (existingRow.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `worksheet status ${existingRow.status} no es pending`,
        });
      }

      const { data, error } = await supabase
        .from('unit_worksheets')
        .update({
          status: 'cancelled',
          decided_at: new Date().toISOString(),
          decided_by: ctx.user.id,
        } as never)
        .eq('id', input.worksheetId)
        .select(WORKSHEET_FIELDS)
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `unit_worksheets cancel failed: ${error?.message ?? 'unknown'}`,
        });
      }
      const row = data as WorksheetRow;
      emitWorksheetEvent('worksheet.cancelled', {
        worksheetId: row.id,
        asesorId: row.asesor_id,
        desarrolladoraId: row.desarrolladora_id,
      });
      return row;
    }),

  listMyWorksheets: authenticatedProcedure
    .input(listMyWorksheetsInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const isDev = isDeveloperRole(ctx.profile);
      const adminCaller = isAdmin(ctx.profile);

      let query = supabase
        .from('unit_worksheets')
        .select(WORKSHEET_FIELDS)
        .order('expires_at', { ascending: true })
        .limit(input.limit);

      if (input.status) {
        query = query.eq('status', input.status);
      }

      if (!adminCaller) {
        if (isDev && ctx.profile?.desarrolladora_id) {
          query = query.eq('desarrolladora_id', ctx.profile.desarrolladora_id);
        } else {
          query = query.eq('asesor_id', ctx.user.id);
        }
      }

      const { data, error } = await query;
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `unit_worksheets list failed: ${error.message}`,
        });
      }

      const rows = (data ?? []) as WorksheetRow[];
      const enriched = rows.map((row) => ({
        ...row,
        priority_score: computeWorksheetPriority(row.expires_at),
      }));
      enriched.sort((a, b) => b.priority_score - a.priority_score);
      return enriched;
    }),
});
