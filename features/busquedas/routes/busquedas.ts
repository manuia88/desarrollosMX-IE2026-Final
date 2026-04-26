import { TRPCError } from '@trpc/server';
import { runMatcher, type UnidadCandidate } from '@/features/asesor-busquedas/lib/matcher-engine';
import {
  type BusquedaCriteria,
  busquedaCreateInput,
  busquedaGetInput,
  busquedaIdInput,
  busquedaListInput,
  busquedaUpdateInput,
} from '@/features/busquedas/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const FIELDS =
  'id, lead_id, asesor_id, brokerage_id, country_code, status, criteria, matched_count, last_run_at, notes, created_by, created_at, updated_at';

function isAsesor(profile: { rol?: string | null } | null | undefined): boolean {
  return profile?.rol === 'asesor';
}

function isAdmin(profile: { rol?: string | null } | null | undefined): boolean {
  return profile?.rol === 'superadmin' || profile?.rol === 'mb_admin';
}

async function fetchCandidates(
  supabase: ReturnType<typeof createAdminClient>,
  criteria: BusquedaCriteria,
): Promise<UnidadCandidate[]> {
  let proyectoQuery = supabase
    .from('proyectos')
    .select('id, zone_id, ciudad, amenities, operacion, tipo')
    .eq('is_active', true)
    .eq('operacion', criteria.operacion);
  if (criteria.tipo) proyectoQuery = proyectoQuery.eq('tipo', criteria.tipo);
  if (criteria.ciudades.length > 0) proyectoQuery = proyectoQuery.in('ciudad', criteria.ciudades);
  const { data: proyectos } = await proyectoQuery;
  const proyectoRows = (proyectos ?? []) as Array<{
    id: string;
    zone_id: string | null;
    ciudad: string | null;
    amenities: unknown;
  }>;
  if (proyectoRows.length === 0) return [];
  const proyectoIds = proyectoRows.map((p) => p.id);

  let unidadQuery = supabase
    .from('unidades')
    .select('id, proyecto_id, recamaras, price_mxn, status')
    .in('proyecto_id', proyectoIds)
    .eq('status', 'disponible');
  if (criteria.price_min !== undefined)
    unidadQuery = unidadQuery.gte('price_mxn', criteria.price_min);
  if (criteria.price_max !== undefined)
    unidadQuery = unidadQuery.lte('price_mxn', criteria.price_max);
  if (criteria.recamaras_min !== undefined)
    unidadQuery = unidadQuery.gte('recamaras', criteria.recamaras_min);
  if (criteria.recamaras_max !== undefined)
    unidadQuery = unidadQuery.lte('recamaras', criteria.recamaras_max);
  const { data: unidades } = await unidadQuery;
  const unidadRows = (unidades ?? []) as Array<{
    id: string;
    proyecto_id: string;
    recamaras: number | null;
    price_mxn: number | null;
  }>;
  const proyectoMap = new Map(proyectoRows.map((p) => [p.id, p]));
  return unidadRows.map((u) => {
    const proy = proyectoMap.get(u.proyecto_id);
    const amenities = Array.isArray(proy?.amenities)
      ? (proy?.amenities as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    return {
      unidadId: u.id,
      proyectoId: u.proyecto_id,
      proyectoZoneId: proy?.zone_id ?? null,
      proyectoAmenities: amenities,
      proyectoCiudad: proy?.ciudad ?? null,
      unidadRecamaras: u.recamaras,
      unidadPriceMxn: u.price_mxn,
    };
  });
}

async function fetchZoneScores(
  supabase: ReturnType<typeof createAdminClient>,
  zoneIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (zoneIds.length === 0) return map;
  const { data } = await supabase
    .from('zone_scores')
    .select('zone_id, score_value, score_type')
    .in('zone_id', zoneIds)
    .eq('score_type', 'IE_OVERALL')
    .order('computed_at', { ascending: false });
  for (const row of (data ?? []) as Array<{ zone_id: string; score_value: number | string }>) {
    if (!map.has(row.zone_id)) map.set(row.zone_id, Number(row.score_value));
  }
  return map;
}

export const busquedasRouter = router({
  list: authenticatedProcedure.input(busquedaListInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const userId = ctx.user.id;
    let query = supabase
      .from('busquedas')
      .select(FIELDS)
      .order('updated_at', { ascending: false })
      .limit(input.limit);
    if (input.status) query = query.eq('status', input.status);
    if (input.leadId) query = query.eq('lead_id', input.leadId);
    if (input.countryCode) query = query.eq('country_code', input.countryCode);
    if (isAsesor(ctx.profile)) {
      query = query.eq('asesor_id', userId);
    } else if (isAdmin(ctx.profile)) {
      if (input.asesorId) query = query.eq('asesor_id', input.asesorId);
    } else {
      return { items: [], nextCursor: null };
    }
    const { data, error } = await query;
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `busquedas list failed: ${error.message}`,
      });
    }
    return { items: data ?? [], nextCursor: null };
  }),

  get: authenticatedProcedure.input(busquedaGetInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('busquedas')
      .select(FIELDS)
      .eq('id', input.id)
      .maybeSingle();
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `busquedas get failed: ${error.message}`,
      });
    }
    if (!data) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    if (isAsesor(ctx.profile) && data.asesor_id !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return data;
  }),

  create: authenticatedProcedure.input(busquedaCreateInput).mutation(async ({ ctx, input }) => {
    if (!isAsesor(ctx.profile) && !isAdmin(ctx.profile)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const supabase = createAdminClient();
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('id, assigned_asesor_id')
      .eq('id', input.leadId)
      .maybeSingle();
    if (leadErr || !lead) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'lead not found' });
    }
    if (isAsesor(ctx.profile) && lead.assigned_asesor_id !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const { data, error } = await supabase
      .from('busquedas')
      .insert({
        lead_id: input.leadId,
        asesor_id: ctx.user.id,
        country_code: input.countryCode,
        criteria: input.criteria,
        notes: input.notes ?? null,
        created_by: ctx.user.id,
        status: 'activa',
      })
      .select(FIELDS)
      .single();
    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `busquedas insert failed: ${error?.message ?? 'unknown'}`,
      });
    }
    return data;
  }),

  update: authenticatedProcedure.input(busquedaUpdateInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('busquedas')
      .select('id, asesor_id, criteria')
      .eq('id', input.id)
      .maybeSingle();
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
    if (isAsesor(ctx.profile) && existing.asesor_id !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const patch: { criteria?: Record<string, unknown>; notes?: string } = {};
    if (input.criteria) {
      const existingCriteria =
        existing.criteria &&
        typeof existing.criteria === 'object' &&
        !Array.isArray(existing.criteria)
          ? (existing.criteria as Record<string, unknown>)
          : {};
      patch.criteria = { ...existingCriteria, ...input.criteria };
    }
    if (input.notes !== undefined) patch.notes = input.notes;
    if (Object.keys(patch).length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'no patch provided' });
    }
    const { data, error } = await supabase
      .from('busquedas')
      .update(patch as never)
      .eq('id', input.id)
      .select(FIELDS)
      .single();
    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `busquedas update failed: ${error?.message ?? 'unknown'}`,
      });
    }
    return data;
  }),

  pause: authenticatedProcedure.input(busquedaIdInput).mutation(async ({ ctx, input }) => {
    return setStatus(ctx, input.id, 'pausada');
  }),

  close: authenticatedProcedure.input(busquedaIdInput).mutation(async ({ ctx, input }) => {
    return setStatus(ctx, input.id, 'cerrada');
  }),

  reopen: authenticatedProcedure.input(busquedaIdInput).mutation(async ({ ctx, input }) => {
    return setStatus(ctx, input.id, 'activa');
  }),

  runMatcher: authenticatedProcedure.input(busquedaIdInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('busquedas')
      .select('id, asesor_id, criteria')
      .eq('id', input.id)
      .maybeSingle();
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
    if (isAsesor(ctx.profile) && existing.asesor_id !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const criteria = (existing.criteria ?? {}) as BusquedaCriteria;
    const candidates = await fetchCandidates(supabase, {
      operacion: criteria.operacion ?? 'venta',
      zone_ids: criteria.zone_ids ?? [],
      ciudades: criteria.ciudades ?? [],
      currency: criteria.currency ?? 'MXN',
      amenities: criteria.amenities ?? [],
      tipo: criteria.tipo,
      price_min: criteria.price_min,
      price_max: criteria.price_max,
      recamaras_min: criteria.recamaras_min,
      recamaras_max: criteria.recamaras_max,
    });
    const zoneIds = Array.from(
      new Set(candidates.map((c) => c.proyectoZoneId).filter((v): v is string => Boolean(v))),
    );
    const zoneScores = await fetchZoneScores(supabase, zoneIds);
    const matches = runMatcher({
      criteria: {
        operacion: criteria.operacion ?? 'venta',
        zone_ids: criteria.zone_ids ?? [],
        ciudades: criteria.ciudades ?? [],
        currency: criteria.currency ?? 'MXN',
        amenities: criteria.amenities ?? [],
        tipo: criteria.tipo,
        price_min: criteria.price_min,
        price_max: criteria.price_max,
        recamaras_min: criteria.recamaras_min,
        recamaras_max: criteria.recamaras_max,
      },
      candidates,
      zoneScores,
    }).slice(0, 50);
    const matchedCount = matches.length;
    const lastRunAt = new Date().toISOString();
    const { error } = await supabase
      .from('busquedas')
      .update({ matched_count: matchedCount, last_run_at: lastRunAt })
      .eq('id', input.id);
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `runMatcher update failed: ${error.message}`,
      });
    }
    return { matchedCount, lastRunAt, matches };
  }),
});

async function setStatus(
  ctx: { user: { id: string }; profile?: { rol?: string | null } | null },
  id: string,
  status: 'activa' | 'pausada' | 'cerrada',
) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from('busquedas')
    .select('id, asesor_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
  if (isAsesor(ctx.profile) && existing.asesor_id !== ctx.user.id) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  const { data, error } = await supabase
    .from('busquedas')
    .update({ status })
    .eq('id', id)
    .select(FIELDS)
    .single();
  if (error || !data) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `setStatus failed: ${error?.message ?? 'unknown'}`,
    });
  }
  return data;
}
