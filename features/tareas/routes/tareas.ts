import { TRPCError } from '@trpc/server';
import {
  completeTareaInput,
  createTareaInput,
  deleteTareaInput,
  listTareasInput,
  reassignTareaInput,
  type TareaScope,
  updateTareaInput,
} from '@/features/tareas/schemas';
import {
  emptyGrouped,
  type GroupedTareas,
  type GroupedTareasKey,
  rowToCardData,
  statusOrderRank,
  type TareaCardData,
} from '@/features/tareas/types';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const FIELDS =
  'id, asesor_id, type, entity_id, title, detalle_tipo, description, due_at, priority, status, redirect_to, completed_at, calendar_event_id, created_at, updated_at';

type Profile = { rol?: string | null } | null | undefined;

const TEAM_VIEW_ROLES: ReadonlySet<string> = new Set([
  'mb_admin',
  'mb_coordinator',
  'broker_manager',
  'admin_desarrolladora',
  'superadmin',
]);

function isAsesor(profile: Profile): boolean {
  return profile?.rol === 'asesor';
}

function canViewTeam(profile: Profile): boolean {
  if (!profile?.rol) return false;
  return TEAM_VIEW_ROLES.has(profile.rol);
}

function canReassign(profile: Profile): boolean {
  return canViewTeam(profile);
}

function scopeUpperBound(scope: TareaScope, now: Date): string | null {
  if (scope === 'all') return null;
  const upper = new Date(now);
  if (scope === 'today') {
    upper.setHours(23, 59, 59, 999);
  } else if (scope === 'week') {
    upper.setDate(upper.getDate() + 7);
  } else {
    upper.setDate(upper.getDate() + 30);
  }
  return upper.toISOString();
}

function groupByColumn(rows: TareaCardData[]): GroupedTareas {
  const grouped = emptyGrouped();
  for (const row of rows) {
    if (row.type === 'property' || row.type === 'capture') {
      grouped.propiedades.push(row);
    } else if (row.type === 'search' || row.type === 'client') {
      grouped.clientes.push(row);
    } else if (row.type === 'lead') {
      grouped.prospectos.push(row);
    } else {
      grouped.general.push(row);
    }
  }
  for (const key of Object.keys(grouped) as GroupedTareasKey[]) {
    grouped[key].sort((a, b) => {
      const rank = statusOrderRank(a.status) - statusOrderRank(b.status);
      if (rank !== 0) return rank;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  }
  return grouped;
}

async function fetchOwnedTarea(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
  profile: Profile,
  userId: string,
): Promise<{ id: string; asesor_id: string; status: string; redirect_to: string | null }> {
  const { data, error } = await supabase
    .from('tareas')
    .select('id, asesor_id, status, redirect_to')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
  const isOwner = data.asesor_id === userId;
  if (!isOwner && !canViewTeam(profile)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return data;
}

export const tareasRouter = router({
  listTareas: authenticatedProcedure.input(listTareasInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const now = new Date();
    let query = supabase.from('tareas').select(FIELDS).limit(input.limit);

    const teamView = input.teamView === true && canViewTeam(ctx.profile);

    if (input.scope !== 'all') {
      const upper = scopeUpperBound(input.scope, now);
      if (upper) {
        query = query.or(`due_at.lte.${upper},status.eq.expired`);
      }
      query = query.in('status', ['pending', 'expired']);
    }

    if (!teamView) {
      query = query.eq('asesor_id', ctx.user.id);
    }

    const { data, error } = await query;
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `tareas list failed: ${error.message}`,
      });
    }
    const rows = (data ?? []).map(rowToCardData);
    return groupByColumn(rows);
  }),

  createTarea: authenticatedProcedure.input(createTareaInput).mutation(async ({ ctx, input }) => {
    if (!isAsesor(ctx.profile) && !canViewTeam(ctx.profile)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const supabase = createAdminClient();
    const insertPayload = {
      asesor_id: ctx.user.id,
      type: input.type,
      entity_id: input.entityId ?? null,
      title: input.title,
      detalle_tipo: input.detalleTipo,
      description: input.description ?? null,
      due_at: input.dueAt,
      priority: input.priority,
      redirect_to: input.redirectTo ?? null,
      status: new Date(input.dueAt).getTime() < Date.now() ? 'expired' : 'pending',
    } as const;
    const { data, error } = await supabase
      .from('tareas')
      .insert(insertPayload)
      .select(FIELDS)
      .single();
    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `tareas insert failed: ${error?.message ?? 'unknown'}`,
      });
    }
    return rowToCardData(data);
  }),

  updateTarea: authenticatedProcedure.input(updateTareaInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    await fetchOwnedTarea(supabase, input.id, ctx.profile, ctx.user.id);
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.detalleTipo !== undefined) patch.detalle_tipo = input.detalleTipo;
    if (input.description !== undefined) patch.description = input.description;
    if (input.dueAt !== undefined) patch.due_at = input.dueAt;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.redirectTo !== undefined) patch.redirect_to = input.redirectTo;
    if (Object.keys(patch).length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'no patch provided' });
    }
    const { data, error } = await supabase
      .from('tareas')
      .update(patch as never)
      .eq('id', input.id)
      .select(FIELDS)
      .single();
    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `tareas update failed: ${error?.message ?? 'unknown'}`,
      });
    }
    return rowToCardData(data);
  }),

  completeTarea: authenticatedProcedure
    .input(completeTareaInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const existing = await fetchOwnedTarea(supabase, input.id, ctx.profile, ctx.user.id);
      if (existing.status === 'done') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'tarea already done' });
      }
      const { error } = await supabase
        .from('tareas')
        .update({ status: 'done', completed_at: new Date().toISOString() } as never)
        .eq('id', input.id);
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `tareas complete failed: ${error.message}`,
        });
      }
      return { ok: true, redirectTo: existing.redirect_to ?? undefined };
    }),

  reassignTarea: authenticatedProcedure
    .input(reassignTareaInput)
    .mutation(async ({ ctx, input }) => {
      if (!canReassign(ctx.profile)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'role cannot reassign tareas' });
      }
      const supabase = createAdminClient();
      await fetchOwnedTarea(supabase, input.id, ctx.profile, ctx.user.id);
      const { data, error } = await supabase
        .from('tareas')
        .update({ asesor_id: input.newAsesorId } as never)
        .eq('id', input.id)
        .select(FIELDS)
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `tareas reassign failed: ${error?.message ?? 'unknown'}`,
        });
      }
      return rowToCardData(data);
    }),

  deleteTarea: authenticatedProcedure.input(deleteTareaInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    await fetchOwnedTarea(supabase, input.id, ctx.profile, ctx.user.id);
    const { error } = await supabase.from('tareas').delete().eq('id', input.id);
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `tareas delete failed: ${error.message}`,
      });
    }
    return { ok: true };
  }),
});
