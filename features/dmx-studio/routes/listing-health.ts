import { TRPCError } from '@trpc/server';
import { analyzeListingHealth } from '@/features/dmx-studio/lib/listing-health/analyzer';
import type { ExtractedListingData } from '@/features/dmx-studio/lib/url-import';
import {
  analyzeListingHealthInput,
  getListingHealthByImportInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Json } from '@/shared/types/database';
import { studioProcedure } from './_studio-procedure';

export const studioListingHealthRouter = router({
  analyze: studioProcedure.input(analyzeListingHealthInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: importRow, error } = await supabase
      .from('studio_portal_imports')
      .select('id, scraped_data, scrape_status, user_id')
      .eq('id', input.importId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!importRow) throw new TRPCError({ code: 'NOT_FOUND' });
    if (importRow.scrape_status !== 'completed') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Import status is ${importRow.scrape_status}, expected completed.`,
      });
    }

    const data = importRow.scraped_data as unknown as ExtractedListingData;
    const breakdown = analyzeListingHealth(data);

    const row = {
      url_import_id: importRow.id,
      score_overall: breakdown.scoreOverall,
      score_photos_count: breakdown.scorePhotosCount,
      score_description_length: breakdown.scoreDescriptionLength,
      score_missing_fields: breakdown.scoreMissingFields,
      score_metadata_quality: breakdown.scoreMetadataQuality,
      missing_fields: breakdown.missingFields as unknown as Json,
      improvement_suggestions: breakdown.improvementSuggestions as unknown as Json,
    };

    const { data: existing } = await supabase
      .from('studio_listing_health_scores')
      .select('id')
      .eq('url_import_id', importRow.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('studio_listing_health_scores').update(row).eq('id', existing.id);
    } else {
      await supabase.from('studio_listing_health_scores').insert(row);
    }

    return breakdown;
  }),

  getByUrlImport: studioProcedure
    .input(getListingHealthByImportInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: importRow } = await supabase
        .from('studio_portal_imports')
        .select('id')
        .eq('id', input.importId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!importRow) throw new TRPCError({ code: 'NOT_FOUND' });

      const { data, error } = await supabase
        .from('studio_listing_health_scores')
        .select('*')
        .eq('url_import_id', input.importId)
        .maybeSingle();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data;
    }),
});
