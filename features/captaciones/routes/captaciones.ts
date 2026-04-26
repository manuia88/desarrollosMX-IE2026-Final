import { TRPCError } from '@trpc/server';
import {
  type CaptacionStatus,
  captacionAdvanceStageInput,
  captacionCloseInput,
  captacionCreateInput,
  captacionGetInput,
  captacionListInput,
  captacionPauseInput,
  captacionRunAcmInput,
  captacionUpdateInput,
  isValidTransition,
} from '@/features/captaciones/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { runACM } from '@/shared/lib/acm/acm-engine';
import type { AcmInput } from '@/shared/lib/acm/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const FIELDS =
  'id, asesor_id, brokerage_id, created_by, lead_id, propietario_nombre, propietario_telefono, propietario_email, direccion, tipo_operacion, precio_solicitado, currency, country_code, zone_id, ciudad, colonia, status, status_changed_at, features, acm_result, acm_computed_at, closed_at, closed_motivo, closed_notes, notes, created_at, updated_at';

type Profile = { rol?: string | null } | null | undefined;

function isAsesor(profile: Profile): boolean {
  return profile?.rol === 'asesor';
}

function isAdmin(profile: Profile): boolean {
  return profile?.rol === 'superadmin' || profile?.rol === 'mb_admin';
}

async function fetchOwnedRow(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
  profile: Profile,
  userId: string,
): Promise<{
  id: string;
  asesor_id: string | null;
  status: CaptacionStatus;
  zone_id: string | null;
}> {
  const { data, error } = await supabase
    .from('captaciones')
    .select('id, asesor_id, status, zone_id')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
  if (isAsesor(profile) && data.asesor_id !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return {
    id: data.id,
    asesor_id: data.asesor_id,
    status: data.status as CaptacionStatus,
    zone_id: data.zone_id,
  };
}

export const captacionesRouter = router({
  list: authenticatedProcedure.input(captacionListInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('captaciones')
      .select(FIELDS)
      .order('updated_at', { ascending: false })
      .limit(input.limit);
    if (input.status) query = query.eq('status', input.status);
    if (input.countryCode) query = query.eq('country_code', input.countryCode);
    if (isAsesor(ctx.profile)) {
      query = query.eq('asesor_id', ctx.user.id);
    } else if (isAdmin(ctx.profile)) {
      if (input.asesorId) query = query.eq('asesor_id', input.asesorId);
    } else {
      return { items: [], nextCursor: null };
    }
    const { data, error } = await query;
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `captaciones list failed: ${error.message}`,
      });
    }
    return { items: data ?? [], nextCursor: null };
  }),

  get: authenticatedProcedure.input(captacionGetInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('captaciones')
      .select(FIELDS)
      .eq('id', input.id)
      .maybeSingle();
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    if (isAsesor(ctx.profile) && data.asesor_id !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return data;
  }),

  create: authenticatedProcedure.input(captacionCreateInput).mutation(async ({ ctx, input }) => {
    if (!isAsesor(ctx.profile) && !isAdmin(ctx.profile)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const supabase = createAdminClient();
    const insertPayload = {
      asesor_id: ctx.user.id,
      created_by: ctx.user.id,
      propietario_nombre: input.propietarioNombre,
      propietario_telefono: input.propietarioTelefono ?? null,
      propietario_email: input.propietarioEmail ?? null,
      direccion: input.direccion,
      tipo_operacion: input.tipoOperacion,
      precio_solicitado: input.precioSolicitado,
      currency: input.currency,
      country_code: input.countryCode,
      zone_id: input.zoneId ?? null,
      ciudad: input.ciudad ?? null,
      colonia: input.colonia ?? null,
      features: input.features ?? {},
      notes: input.notes ?? null,
      lead_id: input.leadId ?? null,
      status: 'prospecto' as const,
    };
    const { data, error } = await supabase
      .from('captaciones')
      .insert(insertPayload)
      .select(FIELDS)
      .single();
    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `captaciones insert failed: ${error?.message ?? 'unknown'}`,
      });
    }
    return data;
  }),

  update: authenticatedProcedure.input(captacionUpdateInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    await fetchOwnedRow(supabase, input.id, ctx.profile, ctx.user.id);
    const patch: Record<string, unknown> = {};
    if (input.propietarioNombre !== undefined) patch.propietario_nombre = input.propietarioNombre;
    if (input.propietarioTelefono !== undefined)
      patch.propietario_telefono = input.propietarioTelefono;
    if (input.propietarioEmail !== undefined) patch.propietario_email = input.propietarioEmail;
    if (input.direccion !== undefined) patch.direccion = input.direccion;
    if (input.tipoOperacion !== undefined) patch.tipo_operacion = input.tipoOperacion;
    if (input.precioSolicitado !== undefined) patch.precio_solicitado = input.precioSolicitado;
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.zoneId !== undefined) patch.zone_id = input.zoneId;
    if (input.ciudad !== undefined) patch.ciudad = input.ciudad;
    if (input.colonia !== undefined) patch.colonia = input.colonia;
    if (input.features !== undefined) patch.features = input.features;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (Object.keys(patch).length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'no patch provided' });
    }
    const { data, error } = await supabase
      .from('captaciones')
      .update(patch as never)
      .eq('id', input.id)
      .select(FIELDS)
      .single();
    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `captaciones update failed: ${error?.message ?? 'unknown'}`,
      });
    }
    return data;
  }),

  advanceStage: authenticatedProcedure
    .input(captacionAdvanceStageInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const existing = await fetchOwnedRow(supabase, input.id, ctx.profile, ctx.user.id);
      if (!isValidTransition(existing.status, input.toStatus)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `invalid FSM transition: ${existing.status} -> ${input.toStatus}`,
        });
      }
      if (input.toStatus === 'vendido' || input.toStatus === 'cerrado_no_listado') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'use close mutation for terminal stages',
        });
      }
      const { data, error } = await supabase
        .from('captaciones')
        .update({ status: input.toStatus })
        .eq('id', input.id)
        .select(FIELDS)
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `advanceStage failed: ${error?.message ?? 'unknown'}`,
        });
      }
      return data;
    }),

  pause: authenticatedProcedure.input(captacionPauseInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const existing = await fetchOwnedRow(supabase, input.id, ctx.profile, ctx.user.id);
    if (existing.status === 'vendido' || existing.status === 'cerrado_no_listado') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'cannot pause closed captacion',
      });
    }
    if (existing.status === 'prospecto') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'already in prospecto stage',
      });
    }
    const { data, error } = await supabase
      .from('captaciones')
      .update({ status: 'prospecto' })
      .eq('id', input.id)
      .select(FIELDS)
      .single();
    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `pause failed: ${error?.message ?? 'unknown'}`,
      });
    }
    return data;
  }),

  close: authenticatedProcedure.input(captacionCloseInput).mutation(async ({ ctx, input }) => {
    if (input.confirmText !== 'CERRAR') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'confirmText must equal CERRAR' });
    }
    const supabase = createAdminClient();
    const existing = await fetchOwnedRow(supabase, input.id, ctx.profile, ctx.user.id);
    if (existing.status === 'vendido' || existing.status === 'cerrado_no_listado') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'captacion already closed' });
    }
    const targetStatus: CaptacionStatus =
      input.motivo === 'vendida' || input.closedAsListed ? 'vendido' : 'cerrado_no_listado';
    const { data, error } = await supabase
      .from('captaciones')
      .update({
        status: targetStatus,
        closed_at: new Date().toISOString(),
        closed_motivo: input.motivo,
        closed_notes: input.notes ?? null,
      })
      .eq('id', input.id)
      .select(FIELDS)
      .single();
    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `close failed: ${error?.message ?? 'unknown'}`,
      });
    }
    return data;
  }),

  runAcm: authenticatedProcedure.input(captacionRunAcmInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    await fetchOwnedRow(supabase, input.id, ctx.profile, ctx.user.id);
    const { data: row, error: rowErr } = await supabase
      .from('captaciones')
      .select(
        'id, precio_solicitado, zone_id, features, tipo_operacion, country_code, ciudad, colonia',
      )
      .eq('id', input.id)
      .maybeSingle();
    if (rowErr || !row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'captacion not found for ACM' });
    }
    const features = (row.features ?? {}) as {
      area_m2?: number;
      amenidades?: string[];
    };
    let zonePulseScore: number | undefined;
    let amenidadesMedianaZona: string[] = [];
    let precioMedianaZona: number | undefined;
    let areaMedianaZona: number | undefined;
    if (row.zone_id) {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data: pulses } = await supabase
        .from('zone_pulse_scores')
        .select('pulse_score')
        .eq('scope_type', 'zone')
        .eq('scope_id', row.zone_id)
        .gte('period_date', since)
        .order('period_date', { ascending: false })
        .limit(30);
      const rows = (pulses ?? []) as Array<{ pulse_score: number | string | null }>;
      if (rows.length > 0) {
        const nums = rows
          .map((r) => Number(r.pulse_score))
          .filter((n) => Number.isFinite(n) && n >= 0);
        if (nums.length > 0) {
          const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
          zonePulseScore = avg > 1 ? Math.min(1, avg / 100) : avg;
        }
      }
      const { data: zoneCaptaciones } = await supabase
        .from('captaciones')
        .select('precio_solicitado, features')
        .eq('zone_id', row.zone_id)
        .neq('id', input.id)
        .limit(50);
      const zoneRows = (zoneCaptaciones ?? []) as Array<{
        precio_solicitado: number | string | null;
        features: unknown;
      }>;
      if (zoneRows.length > 0) {
        const prices = zoneRows
          .map((r) => Number(r.precio_solicitado))
          .filter((n) => Number.isFinite(n) && n > 0)
          .sort((a, b) => a - b);
        if (prices.length > 0) {
          const mid = Math.floor(prices.length / 2);
          const sample = prices[mid];
          if (sample !== undefined) precioMedianaZona = sample;
        }
        const areas = zoneRows
          .map((r) => {
            if (r.features && typeof r.features === 'object') {
              const f = r.features as { area_m2?: unknown };
              return typeof f.area_m2 === 'number' ? f.area_m2 : undefined;
            }
            return undefined;
          })
          .filter((n): n is number => typeof n === 'number' && n > 0)
          .sort((a, b) => a - b);
        if (areas.length > 0) {
          const mid = Math.floor(areas.length / 2);
          const sample = areas[mid];
          if (sample !== undefined) areaMedianaZona = sample;
        }
        const amenitiesCount = new Map<string, number>();
        for (const r of zoneRows) {
          if (r.features && typeof r.features === 'object') {
            const f = r.features as { amenidades?: unknown };
            if (Array.isArray(f.amenidades)) {
              for (const a of f.amenidades) {
                if (typeof a === 'string') {
                  const key = a.toLowerCase();
                  amenitiesCount.set(key, (amenitiesCount.get(key) ?? 0) + 1);
                }
              }
            }
          }
        }
        const threshold = Math.max(1, Math.floor(zoneRows.length * 0.5));
        amenidadesMedianaZona = [...amenitiesCount.entries()]
          .filter(([, count]) => count >= threshold)
          .map(([name]) => name);
      }
    }

    const acmInput: AcmInput = {
      precioSolicitado: Number(row.precio_solicitado),
      tipoOperacion: row.tipo_operacion as AcmInput['tipoOperacion'],
      amenidadesPropiedad: Array.isArray(features.amenidades)
        ? features.amenidades.filter((x: unknown): x is string => typeof x === 'string')
        : [],
      amenidadesMedianaZona,
      ...(precioMedianaZona !== undefined ? { precioMedianaZona } : {}),
      zoneId: row.zone_id ?? null,
      ...(zonePulseScore !== undefined ? { zonePulseScore } : {}),
      ...(typeof features.area_m2 === 'number' ? { areaM2: features.area_m2 } : {}),
      ...(areaMedianaZona !== undefined ? { areaMedianaZona } : {}),
    };

    const result = runACM(acmInput, { now: new Date().toISOString() });

    const acmResultJson = JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
    const { error: updateErr } = await supabase
      .from('captaciones')
      .update({
        acm_result: acmResultJson as never,
        acm_computed_at: result.computedAt,
      })
      .eq('id', input.id);
    if (updateErr) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `runAcm update failed: ${updateErr.message}`,
      });
    }
    return result;
  }),
});
