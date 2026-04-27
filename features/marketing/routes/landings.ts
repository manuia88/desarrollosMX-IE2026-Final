import { TRPCError } from '@trpc/server';
import {
  createLandingInput,
  deleteLandingInput,
  getAnalyticsInput,
  getLandingByIdInput,
  listLandingsInput,
  recordLandingEventInput,
  updateLandingInput,
} from '@/features/marketing/schemas';
import { publicProcedure, router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';

type LandingsUpdate = Database['public']['Tables']['landings']['Update'];

const FIELDS =
  'id, user_id, country_code, slug, template, project_ids, brand_colors, copy, seo_meta, is_published, published_at, created_at, updated_at';

export const landingsRouter = router({
  list: authenticatedProcedure.input(listLandingsInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('landings')
      .select(FIELDS)
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(input.limit);

    if (typeof input.isPublished === 'boolean') {
      query = query.eq('is_published', input.isPublished);
    }

    const { data, error } = await query;
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return data ?? [];
  }),

  getById: authenticatedProcedure.input(getLandingByIdInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('landings')
      .select(FIELDS)
      .eq('id', input.id)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    return data;
  }),

  getPublicBySlug: publicProcedure
    .input(
      getLandingByIdInput
        .extend({ id: getLandingByIdInput.shape.id })
        .pick({ id: true })
        .optional(),
    )
    .query(async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message:
          'getPublicBySlug — usar SSR en app/[locale]/l/[asesor]/[slug] que lee directo via slug.',
      });
    }),

  create: authenticatedProcedure.input(createLandingInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('landings')
      .insert({
        user_id: ctx.user.id,
        country_code: input.countryCode,
        slug: input.slug,
        template: input.template,
        project_ids: input.projectIds,
        brand_colors: input.brandColors,
        copy: input.copy,
        seo_meta: input.seoMeta ?? null,
        is_published: false,
      })
      .select(FIELDS)
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Slug ya existe en otro landing.' });
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return data;
  }),

  update: authenticatedProcedure.input(updateLandingInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const patch: LandingsUpdate = {};
    if (input.template !== undefined) patch.template = input.template;
    if (input.projectIds !== undefined) patch.project_ids = input.projectIds;
    if (input.brandColors !== undefined) patch.brand_colors = input.brandColors;
    if (input.copy !== undefined) patch.copy = input.copy;
    if (input.seoMeta !== undefined) patch.seo_meta = input.seoMeta;
    if (input.isPublished !== undefined) {
      patch.is_published = input.isPublished;
      patch.published_at = input.isPublished ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
      .from('landings')
      .update(patch)
      .eq('id', input.id)
      .eq('user_id', ctx.user.id)
      .select(FIELDS)
      .single();

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    return data;
  }),

  delete: authenticatedProcedure.input(deleteLandingInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('landings')
      .delete()
      .eq('id', input.id)
      .eq('user_id', ctx.user.id);
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return { success: true };
  }),

  getAnalytics: authenticatedProcedure.input(getAnalyticsInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: owns, error: ownsErr } = await supabase
      .from('landings')
      .select('id')
      .eq('id', input.landingId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (ownsErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: ownsErr.message });
    if (!owns) throw new TRPCError({ code: 'NOT_FOUND' });

    const since = new Date();
    since.setDate(since.getDate() - input.daysBack);

    const { data, error } = await supabase
      .from('landing_analytics')
      .select('event_type')
      .eq('landing_id', input.landingId)
      .gte('created_at', since.toISOString());
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }

    let pageViews = 0;
    let clicksCta = 0;
    let leadSubmits = 0;
    for (const row of data ?? []) {
      if (row.event_type === 'page_view') pageViews += 1;
      else if (row.event_type === 'click_cta') clicksCta += 1;
      else if (row.event_type === 'lead_submit') leadSubmits += 1;
    }
    const totals = { page_view: pageViews, click_cta: clicksCta, lead_submit: leadSubmits };
    const ctr = pageViews > 0 ? clicksCta / pageViews : 0;
    const conversion = pageViews > 0 ? leadSubmits / pageViews : 0;

    return {
      totals,
      ctr,
      conversion,
      daysBack: input.daysBack,
    };
  }),

  recordEvent: publicProcedure.input(recordLandingEventInput).mutation(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: owns, error: ownsErr } = await supabase
      .from('landings')
      .select('id, is_published')
      .eq('id', input.landingId)
      .maybeSingle();
    if (ownsErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: ownsErr.message });
    if (!owns || !owns.is_published) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Landing not published.' });
    }

    const { error } = await supabase.from('landing_analytics').insert({
      landing_id: input.landingId,
      event_type: input.eventType,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      utm_content: input.utmContent ?? null,
      utm_term: input.utmTerm ?? null,
      referer: input.referer ?? null,
      country_code: input.countryCode ?? null,
    });
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return { success: true };
  }),
});
