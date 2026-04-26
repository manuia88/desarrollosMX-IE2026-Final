// FASE 13.C-datasource — desarrollos tRPC router (M02 Inventario)
// Procedures authenticated por default (RLS server-side authoriza por rol).
// Server fetch admin client + RLS aplicada via passthrough JWT (asesor scope).

import { TRPCError } from '@trpc/server';
import {
  exclusividadListByProyectoInput,
  marketingAssetListInput,
  projectBrokerListByProyectoInput,
  proyectoGetInput,
  proyectoListInput,
  proyectoSearchByNameInput,
  unidadListInput,
} from '@/features/desarrollos/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const PROYECTO_FIELDS =
  'id, nombre, slug, desarrolladora_id, zone_id, country_code, ciudad, colonia, direccion, lat, lng, status, tipo, operacion, units_total, units_available, price_min_mxn, price_max_mxn, currency, bedrooms_range, amenities, description, cover_photo_url, brochure_url, privacy_level, is_active, meta, created_at, updated_at';

export const desarrollosRouter = router({
  list: authenticatedProcedure.input(proyectoListInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const userId = ctx.user.id;
    const userRol = ctx.profile?.rol ?? null;
    const userDesarrolladoraId = ctx.profile?.desarrolladora_id ?? null;

    let query = supabase.from('proyectos').select(PROYECTO_FIELDS).eq('is_active', true);

    if (input.scope === 'own') {
      if (userRol !== 'asesor') {
        return { projects: [], nextCursor: null, scope: input.scope };
      }
      const { data: assignments, error: pbError } = await supabase
        .from('project_brokers')
        .select('proyecto_id')
        .eq('broker_user_id', userId)
        .eq('active', true);
      if (pbError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `project_brokers lookup failed: ${pbError.message}`,
        });
      }
      const ids = (assignments ?? []).map((r) => r.proyecto_id);
      if (ids.length === 0) {
        return { projects: [], nextCursor: null, scope: input.scope };
      }
      query = query.in('id', ids);
    } else if (input.scope === 'exclusive') {
      if (userRol === 'admin_desarrolladora' && userDesarrolladoraId) {
        query = query.eq('desarrolladora_id', userDesarrolladoraId);
      } else if (userRol === 'asesor') {
        const { data: assignments } = await supabase
          .from('project_brokers')
          .select('proyecto_id, role')
          .eq('broker_user_id', userId)
          .eq('active', true)
          .in('role', ['lead_broker']);
        const ids = (assignments ?? []).map((r) => r.proyecto_id);
        if (ids.length === 0) {
          return { projects: [], nextCursor: null, scope: input.scope };
        }
        query = query.in('id', ids);
      } else {
        return { projects: [], nextCursor: null, scope: input.scope };
      }
    } else if (input.scope === 'dmx') {
      query = query.eq('privacy_level', 'public');
    } else if (input.scope === 'mls') {
      query = query.in('privacy_level', ['public', 'broker_only']);
    }

    if (input.status) query = query.eq('status', input.status);
    if (input.tipo) query = query.eq('tipo', input.tipo);
    if (input.operacion) query = query.eq('operacion', input.operacion);
    if (input.country_code) query = query.eq('country_code', input.country_code);
    if (input.ciudad) query = query.ilike('ciudad', `%${input.ciudad}%`);
    if (input.colonia) query = query.ilike('colonia', `%${input.colonia}%`);
    if (input.zone_id) query = query.eq('zone_id', input.zone_id);
    if (input.desarrolladora_id) query = query.eq('desarrolladora_id', input.desarrolladora_id);
    if (input.price_min) query = query.gte('price_min_mxn', input.price_min);
    if (input.price_max) query = query.lte('price_max_mxn', input.price_max);
    if (input.q) query = query.ilike('nombre', `%${input.q}%`);

    query = query.order('created_at', { ascending: false }).limit(input.limit);

    if (input.cursor) {
      query = query.lt('created_at', input.cursor);
    }

    const { data, error } = await query;
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `proyectos list failed: ${error.message}`,
      });
    }

    const projects = data ?? [];
    const lastRow = projects.at(-1);
    const nextCursor = projects.length === input.limit && lastRow ? lastRow.created_at : null;

    return { projects, nextCursor, scope: input.scope };
  }),

  get: authenticatedProcedure.input(proyectoGetInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const baseQuery = supabase.from('proyectos').select(PROYECTO_FIELDS).limit(1);
    const slug = input.slug ?? '';
    const filtered = input.id ? baseQuery.eq('id', input.id) : baseQuery.eq('slug', slug);

    const { data: proyecto, error } = await filtered.maybeSingle();
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `proyecto get failed: ${error.message}`,
      });
    }
    if (!proyecto) return null;

    const proyectoId = proyecto.id;

    const [unidadesRes, brokersRes, assetsRes, exclusividadRes] = await Promise.all([
      supabase
        .from('unidades')
        .select(
          'id, proyecto_id, numero, tipo, recamaras, banos, parking, area_m2, area_terreno_m2, price_mxn, maintenance_fee_mxn, status, floor, floor_plan_url, photos, features, meta, created_at, updated_at',
        )
        .eq('proyecto_id', proyectoId)
        .order('numero'),
      supabase
        .from('project_brokers')
        .select(
          'id, proyecto_id, broker_user_id, role, commission_pct, meses_exclusividad, meses_contrato, assigned_at, expires_at, active, meta, created_at, updated_at',
        )
        .eq('proyecto_id', proyectoId)
        .eq('active', true),
      supabase
        .from('marketing_assets')
        .select(
          'id, proyecto_id, asset_type, url, thumbnail_url, format, locale, status, display_order, expires_at, meta, created_at, updated_at',
        )
        .eq('proyecto_id', proyectoId)
        .order('display_order'),
      supabase
        .from('exclusividad_acuerdos')
        .select(
          'id, proyecto_id, brokerage_id, asesor_id, meses_exclusividad, meses_contrato, comision_pct, start_date, end_date, scope, signed_url, active, meta, created_at, updated_at',
        )
        .eq('proyecto_id', proyectoId)
        .eq('active', true),
    ]);

    if (unidadesRes.error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `unidades load failed: ${unidadesRes.error.message}`,
      });
    }
    if (brokersRes.error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `project_brokers load failed: ${brokersRes.error.message}`,
      });
    }
    if (assetsRes.error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `marketing_assets load failed: ${assetsRes.error.message}`,
      });
    }
    if (exclusividadRes.error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `exclusividad load failed: ${exclusividadRes.error.message}`,
      });
    }

    return {
      proyecto,
      unidades: unidadesRes.data ?? [],
      brokers: brokersRes.data ?? [],
      assets: assetsRes.data ?? [],
      exclusividad: exclusividadRes.data ?? [],
    };
  }),

  searchByName: authenticatedProcedure.input(proyectoSearchByNameInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('proyectos')
      .select('id, slug, nombre, ciudad, colonia, status, cover_photo_url')
      .ilike('nombre', `%${input.q}%`)
      .eq('is_active', true)
      .limit(input.limit);
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `proyectos search failed: ${error.message}`,
      });
    }
    return data ?? [];
  }),

  listUnidades: authenticatedProcedure.input(unidadListInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('unidades')
      .select(
        'id, proyecto_id, numero, tipo, recamaras, banos, parking, area_m2, area_terreno_m2, price_mxn, maintenance_fee_mxn, status, floor, floor_plan_url, photos, features, meta, created_at, updated_at',
      )
      .eq('proyecto_id', input.proyecto_id);

    if (input.status) query = query.eq('status', input.status);
    if (input.recamaras !== undefined) query = query.eq('recamaras', input.recamaras);
    if (input.price_min) query = query.gte('price_mxn', input.price_min);
    if (input.price_max) query = query.lte('price_mxn', input.price_max);

    const { data, error } = await query.order('numero');
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `unidades list failed: ${error.message}`,
      });
    }
    return data ?? [];
  }),

  listBrokers: authenticatedProcedure
    .input(projectBrokerListByProyectoInput)
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('project_brokers')
        .select(
          'id, proyecto_id, broker_user_id, role, commission_pct, meses_exclusividad, meses_contrato, assigned_at, expires_at, active, meta, created_at, updated_at',
        )
        .eq('proyecto_id', input.proyecto_id)
        .eq('active', true);
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `project_brokers list failed: ${error.message}`,
        });
      }
      return data ?? [];
    }),

  listAssets: authenticatedProcedure.input(marketingAssetListInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('marketing_assets')
      .select(
        'id, proyecto_id, asset_type, url, thumbnail_url, format, locale, status, display_order, expires_at, meta, created_at, updated_at',
      )
      .eq('proyecto_id', input.proyecto_id);
    if (input.asset_type) query = query.eq('asset_type', input.asset_type);
    const { data, error } = await query.order('display_order');
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `marketing_assets list failed: ${error.message}`,
      });
    }
    return data ?? [];
  }),

  listExclusividad: authenticatedProcedure
    .input(exclusividadListByProyectoInput)
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('exclusividad_acuerdos')
        .select(
          'id, proyecto_id, brokerage_id, asesor_id, meses_exclusividad, meses_contrato, comision_pct, start_date, end_date, scope, signed_url, active, meta, created_at, updated_at',
        )
        .eq('proyecto_id', input.proyecto_id)
        .eq('active', true);
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `exclusividad list failed: ${error.message}`,
        });
      }
      return data ?? [];
    }),
});
