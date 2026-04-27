import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  processSingleImport,
  submitBulkUrls,
} from '@/features/dmx-studio/lib/url-import/bulk-handler';
import {
  bulkParseUrlsInput,
  confirmUrlImportInput,
  parseUrlInput,
  urlImportPreviewInput,
  urlImportStatusInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

export const studioUrlImportRouter = router({
  parseUrl: studioProcedure.input(parseUrlInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_portal_imports')
      .insert({
        user_id: ctx.user.id,
        source_url: input.url,
        source_portal: 'manual_url',
        scrape_status: 'pending',
        is_stub: false,
      })
      .select('id')
      .single();
    if (error || !data) {
      sentry.captureException(error, { tags: { feature: 'studio-url-import' } });
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    }
    void processSingleImport(supabase, data.id).catch((err) => {
      sentry.captureException(err, { tags: { feature: 'studio-url-import-async' } });
    });
    return { importId: data.id };
  }),

  bulkParseUrls: studioProcedure.input(bulkParseUrlsInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    try {
      const { batchId, importIds } = await submitBulkUrls(supabase, ctx.user.id, input.urls);
      for (const id of importIds) {
        void processSingleImport(supabase, id).catch((err) => {
          sentry.captureException(err, { tags: { feature: 'studio-url-import-bulk-async' } });
        });
      }
      return { batchId, importIds };
    } catch (error) {
      sentry.captureException(error, { tags: { feature: 'studio-url-import-bulk' } });
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    }
  }),

  getStatus: studioProcedure.input(urlImportStatusInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_portal_imports')
      .select(
        'id, source_url, source_portal, scrape_status, error_message, photos_extracted, retry_count, created_at',
      )
      .eq('user_id', ctx.user.id)
      .eq('bulk_batch_id', input.batchId)
      .order('created_at', { ascending: true });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),

  getPreview: studioProcedure.input(urlImportPreviewInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_portal_imports')
      .select('*')
      .eq('id', input.importId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    return data;
  }),

  confirmAndCreateProject: studioProcedure
    .input(confirmUrlImportInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: importRow, error: importErr } = await supabase
        .from('studio_portal_imports')
        .select('*')
        .eq('id', input.importId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (importErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: importErr });
      if (!importRow) throw new TRPCError({ code: 'NOT_FOUND' });
      if (importRow.scrape_status !== 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Import status is ${importRow.scrape_status}, expected completed.`,
        });
      }

      const overrides = input.overrides ?? {};
      const propertyData = {
        price: overrides.price ?? importRow.price_extracted ?? null,
        currency: 'MXN',
        areaM2: overrides.areaM2 ?? importRow.area_extracted ?? null,
        bedrooms: overrides.bedrooms ?? importRow.bedrooms_extracted ?? null,
        bathrooms: overrides.bathrooms ?? null,
        zone: overrides.zone ?? importRow.zone_extracted ?? null,
      };

      const { data: project, error: projectErr } = await supabase
        .from('studio_video_projects')
        .insert({
          user_id: ctx.user.id,
          title: input.title ?? `Listing ${importRow.source_portal}`,
          status: 'draft',
          project_type: 'standard',
          source_metadata: propertyData as unknown as object,
        } as never)
        .select('id')
        .single();
      if (projectErr || !project) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: projectErr });
      }

      await supabase
        .from('studio_portal_imports')
        .update({ project_id: project.id })
        .eq('id', importRow.id);

      return { projectId: project.id };
    }),

  listForUser: studioProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_portal_imports')
        .select('id, source_url, source_portal, scrape_status, project_id, created_at')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(input.limit);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data ?? [];
    }),
});
