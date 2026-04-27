import { TRPCError } from '@trpc/server';
import { createQRInput, deleteQRInput, listQRsInput } from '@/features/marketing/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const FIELDS =
  'id, user_id, destino_type, destino_id, copy, color_hex, utm_source, utm_medium, utm_campaign, short_url, png_storage_path, svg_storage_path, scan_count, created_at, updated_at';

function generateShortToken(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export const qrCodesRouter = router({
  list: authenticatedProcedure.input(listQRsInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('qr_codes')
      .select(FIELDS)
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(input.limit);

    if (input.destinoType) {
      query = query.eq('destino_type', input.destinoType);
    }

    const { data, error } = await query;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? [];
  }),

  create: authenticatedProcedure.input(createQRInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const shortUrl = `q/${generateShortToken()}`;
    const { data, error } = await supabase
      .from('qr_codes')
      .insert({
        user_id: ctx.user.id,
        destino_type: input.destinoType,
        destino_id: input.destinoId,
        copy: input.copy ?? null,
        color_hex: input.colorHex ?? null,
        utm_source: 'qr',
        utm_medium: 'scan',
        utm_campaign: input.utmCampaign ?? null,
        short_url: shortUrl,
      })
      .select(FIELDS)
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Short URL conflict, retry.' });
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return data;
  }),

  delete: authenticatedProcedure.input(deleteQRInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('qr_codes')
      .delete()
      .eq('id', input.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return { success: true };
  }),
});
