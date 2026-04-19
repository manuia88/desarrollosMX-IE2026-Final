import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { persistCapture } from '../lib/capture';
import { marketCaptureSchema } from '../schemas/capture';

export const marketRouter = router({
  capture: authenticatedProcedure.input(marketCaptureSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.profile) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'profile_not_found' });
    }
    const admin = createAdminClient();
    const result = await persistCapture(
      {
        supabase: admin,
        profileId: ctx.user.id,
        countryCode: ctx.profile.country_code,
      },
      input,
    );
    if (!result.ok) {
      throw new TRPCError({
        code: result.code === 'invalid_payload' ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR',
        message: result.message,
      });
    }
    return {
      market_price_id: result.marketPriceRowId,
      source: result.source,
      listing_id: result.listingId,
    };
  }),
});
